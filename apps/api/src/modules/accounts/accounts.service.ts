import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "@app/common/database/prisma.service";
import { AccountSortField, ListAccountsDto } from "./dto/list-accounts.dto";

@Injectable()
export class AccountsService {
  constructor(private readonly prisma: PrismaService) {}

  async getMyAccount(userId: string) {
    const account = await this.prisma.account.findUnique({
      where: { userId },
      select: { accountNumber: true, balance: true, type: true, status: true },
    });

    if (!account) throw new NotFoundException("Cuenta no encontrada");

    return {
      accountNumber: account.accountNumber,
      balance: Number(account.balance),
      type: account.type,
      status: account.status,
    };
  }

  async listAccounts(dto: ListAccountsDto) {
    const { page, limit, sortBy, sortOrder } = dto;
    const skip = (page - 1) * limit;

    const orderBy =
      sortBy === AccountSortField.FULL_NAME
        ? { user: { fullName: sortOrder } }
        : { [sortBy]: sortOrder };

    const [accounts, total] = await this.prisma.$transaction([
      this.prisma.account.findMany({
        skip,
        take: limit,
        orderBy,
        select: {
          id: true,
          accountNumber: true,
          balance: true,
          status: true,
          type: true,
          user: { select: { fullName: true } },
        },
      }),
      this.prisma.account.count(),
    ]);

    return {
      data: accounts.map((a) => ({
        id: a.id,
        accountNumber: a.accountNumber,
        fullName: a.user.fullName,
        balance: Number(a.balance),
        type: a.type,
        status: a.status,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

}
