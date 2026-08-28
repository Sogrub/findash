import { Injectable } from "@nestjs/common";
import { PrismaService } from "@app/common/database/prisma.service";
import { VOLUME_BY_ACCOUNT_TYPE } from "./constants/queries";

type ByTypeRow = { type: string; volume: string; txcount: bigint };

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboardMetrics() {
    const [volumeAgg, failedCount, activeAccounts, byTypeRaw] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: { status: "COMPLETED" },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      this.prisma.transaction.count({
        where: { status: { in: ["FAILED", "REJECTED"] } },
      }),
      this.prisma.account.count({ where: { status: "ACTIVE" } }),
      this.prisma.$queryRaw<ByTypeRow[]>(VOLUME_BY_ACCOUNT_TYPE),
    ]);

    const ACCOUNT_TYPES = ["BASIC", "CORPORATE", "PREMIUM"] as const;
    const byTypeMap = new Map(byTypeRaw.map((r) => [r.type, r]));

    const byAccountType = ACCOUNT_TYPES.map((type) => {
      const row = byTypeMap.get(type);
      return {
        type,
        volume: row ? Number(row.volume) : 0,
        count: row ? Number(row.txcount) : 0,
      };
    });

    return {
      kpis: {
        totalVolume: Number(volumeAgg._sum.amount ?? 0),
        completedCount: volumeAgg._count._all,
        failedCount,
        activeAccounts,
      },
      byAccountType,
    };
  }
}
