import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { PrismaService } from "@app/common/database/prisma.service";
import { AntiFraudService } from "./services/anti-fraud.service";
import { TransactionBuilder } from "./builders/transaction.builder";
import { resolveCommissionStrategy } from "./strategies/commission.factory";
import { CreateTransferDto } from "./dto/create-transfer.dto";

const ACCOUNT_INCLUDE = {
  sourceAccount: { select: { accountNumber: true, user: { select: { fullName: true } } } },
  destAccount:   { select: { accountNumber: true, user: { select: { fullName: true } } } },
} as const;

@Injectable()
export class TransactionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly antiFraud: AntiFraudService,
  ) {}

  async createTransfer(userId: string, idempotencyKey: string, dto: CreateTransferDto) {
    // ── 1. Idempotency fast-path ───────────────────────────────────────────────
    const existing = await this.prisma.transaction.findUnique({
      where: { idempotencyKey },
      include: ACCOUNT_INCLUDE,
    });
    if (existing) return this.format(existing);

    // ── 2. Resolve accounts ───────────────────────────────────────────────────
    const [sourceAccount, destAccount] = await Promise.all([
      this.prisma.account.findUnique({
        where: { userId },
        select: { id: true, status: true, type: true },
      }),
      this.prisma.account.findUnique({
        where: { accountNumber: dto.toAccountNumber },
        select: { id: true, status: true },
      }),
    ]);

    if (!sourceAccount || sourceAccount.status !== "ACTIVE") {
      throw new BadRequestException("Cuenta de origen no disponible");
    }
    if (!destAccount || destAccount.status !== "ACTIVE") {
      throw new NotFoundException("Cuenta de destino no encontrada o inactiva");
    }
    if (sourceAccount.id === destAccount.id) {
      throw new BadRequestException("No puedes transferir a tu propia cuenta");
    }

    // ── 3. Commission strategy ────────────────────────────────────────────────
    const amount = new Prisma.Decimal(dto.amount);
    const commissionStrategy = resolveCommissionStrategy(sourceAccount.type);

    // ── 4. Anti-fraud check (must complete within 3s) ─────────────────────────
    await this.antiFraud.check(amount, sourceAccount.id);

    // ── 5. Atomic transfer with pessimistic lock ──────────────────────────────
    try {
      return await this.prisma.$transaction(async (tx) => {
        // Pessimistic lock: cast column to text to avoid Prisma parameter binding issues
        const [locked] = await tx.$queryRaw<{ balance: string }[]>`
          SELECT balance FROM accounts WHERE id::text = ${sourceAccount.id} FOR UPDATE
        `;

        // ── 6. Builder assembles the transaction record ───────────────────────
        const txData = new TransactionBuilder()
          .setIdempotencyKey(idempotencyKey)
          .setAccounts(sourceAccount.id, destAccount.id)
          .setAmount(amount)
          .applyCommission(commissionStrategy)
          .setAuthorizationCode(`AUTH-${randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase()}`)
          .build();

        const balance = new Prisma.Decimal(locked.balance);
        if (balance.lessThan(txData.totalDeducted)) {
          const hasCommission = txData.commission.greaterThan(0);
          const detail = hasCommission
            ? ` (monto $${txData.amount.toFixed(2)} + comisión $${txData.commission.toFixed(2)})`
            : "";
          throw new UnprocessableEntityException(
            `Saldo insuficiente. La transferencia requiere $${txData.totalDeducted.toFixed(2)}${detail}`,
          );
        }

        const record = await tx.transaction.create({
          data: txData,
          include: ACCOUNT_INCLUDE,
        });

        await tx.account.update({
          where: { id: sourceAccount.id },
          data: { balance: { decrement: txData.totalDeducted } },
        });

        await tx.account.update({
          where: { id: destAccount.id },
          data: { balance: { increment: txData.amount } },
        });

        return this.format(record);
      });
    } catch (err) {
      // Race condition: another request with the same idempotency key won
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        const raceWinner = await this.prisma.transaction.findUnique({
          where: { idempotencyKey },
          include: ACCOUNT_INCLUDE,
        });
        if (raceWinner) return this.format(raceWinner);
      }
      throw err;
    }
  }

  async getMyTransactions(userId: string, page: number, limit: number) {
    const account = await this.prisma.account.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!account) throw new NotFoundException("Cuenta no encontrada");

    const skip = (page - 1) * limit;

    const [records, total] = await this.prisma.$transaction([
      this.prisma.transaction.findMany({
        where: { OR: [{ sourceAccountId: account.id }, { destAccountId: account.id }] },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: ACCOUNT_INCLUDE,
      }),
      this.prisma.transaction.count({
        where: { OR: [{ sourceAccountId: account.id }, { destAccountId: account.id }] },
      }),
    ]);

    return {
      data: records.map((r) => ({
        ...this.format(r),
        direction: r.sourceAccountId === account.id ? "OUTGOING" : "INCOMING",
      })),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getAccountTransactions(accountId: string, page: number, limit: number) {
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
      select: { id: true },
    });
    if (!account) throw new NotFoundException("Cuenta no encontrada");

    const skip = (page - 1) * limit;

    const [records, total] = await this.prisma.$transaction([
      this.prisma.transaction.findMany({
        where: { OR: [{ sourceAccountId: accountId }, { destAccountId: accountId }] },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: ACCOUNT_INCLUDE,
      }),
      this.prisma.transaction.count({
        where: { OR: [{ sourceAccountId: accountId }, { destAccountId: accountId }] },
      }),
    ]);

    return {
      data: records.map((r) => ({
        ...this.format(r),
        direction: r.sourceAccountId === accountId ? "OUTGOING" : "INCOMING",
      })),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  private format(record: {
    id: string;
    amount: Prisma.Decimal;
    commission: Prisma.Decimal;
    totalDeducted: Prisma.Decimal;
    status: string;
    authorizationCode: string | null;
    idempotencyKey: string;
    createdAt: Date;
    sourceAccount: { accountNumber: string; user: { fullName: string } };
    destAccount:   { accountNumber: string; user: { fullName: string } };
  }) {
    return {
      id:            record.id,
      fromAccount:   record.sourceAccount.accountNumber,
      fromName:      record.sourceAccount.user.fullName,
      toAccount:     record.destAccount.accountNumber,
      toName:        record.destAccount.user.fullName,
      amount:        Number(record.amount),
      commission:    Number(record.commission),
      totalDeducted: Number(record.totalDeducted),
      status:        record.status,
      authorizationCode: record.authorizationCode,
      createdAt: record.createdAt,
    };
  }
}
