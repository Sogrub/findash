import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "@app/common/database/prisma.service";

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
}
