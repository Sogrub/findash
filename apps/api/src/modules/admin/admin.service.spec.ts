import { Test } from "@nestjs/testing";
import { AdminService } from "./admin.service";
import { PrismaService } from "@app/common/database/prisma.service";
import { Prisma } from "@prisma/client";

const mockPrisma = {
  transaction: {
    aggregate: jest.fn(),
    count: jest.fn(),
  },
  account: {
    count: jest.fn(),
  },
  $queryRaw: jest.fn(),
};

async function buildService() {
  const module = await Test.createTestingModule({
    providers: [
      AdminService,
      { provide: PrismaService, useValue: mockPrisma },
    ],
  }).compile();
  return module.get(AdminService);
}

describe("AdminService", () => {
  beforeEach(() => jest.clearAllMocks());

  describe("getDashboardMetrics()", () => {
    function setupDefaults() {
      mockPrisma.transaction.aggregate.mockResolvedValue({
        _sum: { amount: new Prisma.Decimal("12500.50") },
        _count: { _all: 42 },
      });
      mockPrisma.transaction.count.mockResolvedValue(5);
      mockPrisma.account.count.mockResolvedValue(30);
      mockPrisma.$queryRaw.mockResolvedValue([
        { type: "BASIC", volume: "8000.00", txcount: BigInt(20) },
        { type: "PREMIUM", volume: "3500.50", txcount: BigInt(15) },
      ]);
    }

    it("returns totalVolume as a number from Decimal sum", async () => {
      setupDefaults();
      const service = await buildService();
      const result = await service.getDashboardMetrics();

      expect(result.kpis.totalVolume).toBe(12500.5);
    });

    it("returns completedCount from aggregate _count._all", async () => {
      setupDefaults();
      const service = await buildService();
      const result = await service.getDashboardMetrics();

      expect(result.kpis.completedCount).toBe(42);
    });

    it("returns failedCount from transaction.count", async () => {
      setupDefaults();
      const service = await buildService();
      const result = await service.getDashboardMetrics();

      expect(result.kpis.failedCount).toBe(5);
    });

    it("returns activeAccounts from account.count", async () => {
      setupDefaults();
      const service = await buildService();
      const result = await service.getDashboardMetrics();

      expect(result.kpis.activeAccounts).toBe(30);
    });

    it("returns byAccountType for all three types", async () => {
      setupDefaults();
      const service = await buildService();
      const result = await service.getDashboardMetrics();

      expect(result.byAccountType).toHaveLength(3);
      const types = result.byAccountType.map((r) => r.type);
      expect(types).toEqual(["BASIC", "CORPORATE", "PREMIUM"]);
    });

    it("maps raw query rows to numeric volume and count", async () => {
      setupDefaults();
      const service = await buildService();
      const result = await service.getDashboardMetrics();

      const basic = result.byAccountType.find((r) => r.type === "BASIC");
      expect(basic?.volume).toBe(8000);
      expect(basic?.count).toBe(20);

      const premium = result.byAccountType.find((r) => r.type === "PREMIUM");
      expect(premium?.volume).toBe(3500.5);
      expect(premium?.count).toBe(15);
    });

    it("defaults volume and count to 0 for types not in raw rows", async () => {
      setupDefaults();
      const service = await buildService();
      const result = await service.getDashboardMetrics();

      const corporate = result.byAccountType.find((r) => r.type === "CORPORATE");
      expect(corporate?.volume).toBe(0);
      expect(corporate?.count).toBe(0);
    });

    it("handles null totalVolume (no completed transactions)", async () => {
      mockPrisma.transaction.aggregate.mockResolvedValue({
        _sum: { amount: null },
        _count: { _all: 0 },
      });
      mockPrisma.transaction.count.mockResolvedValue(0);
      mockPrisma.account.count.mockResolvedValue(0);
      mockPrisma.$queryRaw.mockResolvedValue([]);

      const service = await buildService();
      const result = await service.getDashboardMetrics();

      expect(result.kpis.totalVolume).toBe(0);
    });

    it("runs all four queries in parallel via Promise.all", async () => {
      setupDefaults();
      const service = await buildService();
      await service.getDashboardMetrics();

      expect(mockPrisma.transaction.aggregate).toHaveBeenCalledTimes(1);
      expect(mockPrisma.transaction.count).toHaveBeenCalledTimes(1);
      expect(mockPrisma.account.count).toHaveBeenCalledTimes(1);
      expect(mockPrisma.$queryRaw).toHaveBeenCalledTimes(1);
    });
  });
});
