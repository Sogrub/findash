import { Test } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { AccountsService } from "./accounts.service";
import { AccountSortField, SortOrder } from "./dto/list-accounts.dto";
import { PrismaService } from "@app/common/database/prisma.service";

const mockAccount = {
  accountNumber: "FD17000012345",
  balance: 1500.5,
  type: "BASIC",
  status: "ACTIVE",
};

const mockPrisma = {
  account: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  $transaction: jest.fn(),
};

async function buildService() {
  const module = await Test.createTestingModule({
    providers: [
      AccountsService,
      { provide: PrismaService, useValue: mockPrisma },
    ],
  }).compile();

  return module.get(AccountsService);
}

describe("AccountsService", () => {
  beforeEach(() => jest.clearAllMocks());

  // ── getMyAccount() ──────────────────────────────────────────────────────────

  describe("getMyAccount()", () => {
    it("returns masked number, balance, type and status", async () => {
      mockPrisma.account.findUnique.mockResolvedValue(mockAccount);

      const service = await buildService();
      const result = await service.getMyAccount("user-1");

      expect(result).toEqual({
        accountNumber: "FD17000012345",
        balance: 1500.5,
        type: "BASIC",
        status: "ACTIVE",
      });
    });

    it("throws NotFoundException when account does not exist", async () => {
      mockPrisma.account.findUnique.mockResolvedValue(null);

      const service = await buildService();

      await expect(service.getMyAccount("ghost")).rejects.toThrow(NotFoundException);
    });
  });

  // ── listAccounts() ──────────────────────────────────────────────────────────

  describe("listAccounts()", () => {
    const rows = [
      { accountNumber: "FD17000012345", balance: 1000, status: "ACTIVE", user: { fullName: "Diego Burgos" } },
      { accountNumber: "FD17000067890", balance: 250.75, status: "ACTIVE", user: { fullName: "María López" } },
    ];

    beforeEach(() => {
      mockPrisma.$transaction.mockResolvedValue([rows, 2]);
    });

    it("returns paginated list with full account numbers", async () => {
      const service = await buildService();
      const result = await service.listAccounts({ page: 1, limit: 20, sortBy: AccountSortField.CREATED_AT, sortOrder: SortOrder.DESC });

      expect(result.data).toHaveLength(2);
      expect(result.data[0].accountNumber).toBe("FD17000012345");
      expect(result.data[0].fullName).toBe("Diego Burgos");
      expect(result.data[0].balance).toBe(1000);
    });

    it("returns correct meta for first page", async () => {
      const service = await buildService();
      const result = await service.listAccounts({ page: 1, limit: 20, sortBy: AccountSortField.CREATED_AT, sortOrder: SortOrder.DESC });

      expect(result.meta).toEqual({ total: 2, page: 1, limit: 20, totalPages: 1 });
    });

    it("calculates totalPages correctly", async () => {
      mockPrisma.$transaction.mockResolvedValue([rows, 45]);

      const service = await buildService();
      const result = await service.listAccounts({ page: 2, limit: 20, sortBy: AccountSortField.CREATED_AT, sortOrder: SortOrder.DESC });

      expect(result.meta.totalPages).toBe(3);
      expect(result.meta.page).toBe(2);
    });

    it("orders by balance asc when sortBy=balance sortOrder=asc", async () => {
      const service = await buildService();
      await service.listAccounts({ page: 1, limit: 10, sortBy: AccountSortField.BALANCE, sortOrder: SortOrder.ASC });

      expect(mockPrisma.account.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { balance: "asc" } }),
      );
    });

    it("orders by fullName via user relation", async () => {
      const service = await buildService();
      await service.listAccounts({ page: 1, limit: 10, sortBy: AccountSortField.FULL_NAME, sortOrder: SortOrder.ASC });

      expect(mockPrisma.account.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { user: { fullName: "asc" } } }),
      );
    });

    it("orders by status desc", async () => {
      const service = await buildService();
      await service.listAccounts({ page: 1, limit: 10, sortBy: AccountSortField.STATUS, sortOrder: SortOrder.DESC });

      expect(mockPrisma.account.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { status: "desc" } }),
      );
    });

    it("returns full account number without masking", async () => {
      mockPrisma.$transaction.mockResolvedValue([
        [{ accountNumber: "AB1234567890", balance: 0, status: "ACTIVE", user: { fullName: "Test" } }],
        1,
      ]);

      const service = await buildService();
      const result = await service.listAccounts({ page: 1, limit: 20, sortBy: AccountSortField.CREATED_AT, sortOrder: SortOrder.DESC });

      expect(result.data[0].accountNumber).toBe("AB1234567890");
    });

    it("applies search filter on user document", async () => {
      const service = await buildService();
      await service.listAccounts({
        page: 1,
        limit: 10,
        sortBy: AccountSortField.CREATED_AT,
        sortOrder: SortOrder.DESC,
        search: "12345",
      });

      expect(mockPrisma.account.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            user: { document: { contains: "12345", mode: "insensitive" } },
          }),
        }),
      );
    });

    it("applies status filter", async () => {
      const service = await buildService();
      await service.listAccounts({
        page: 1,
        limit: 10,
        sortBy: AccountSortField.CREATED_AT,
        sortOrder: SortOrder.DESC,
        status: "INACTIVE" as any,
      });

      expect(mockPrisma.account.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: "INACTIVE" }),
        }),
      );
    });

    it("applies both search and status filters together", async () => {
      const service = await buildService();
      await service.listAccounts({
        page: 1,
        limit: 10,
        sortBy: AccountSortField.CREATED_AT,
        sortOrder: SortOrder.DESC,
        search: "99999",
        status: "ACTIVE" as any,
      });

      expect(mockPrisma.account.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            user: { document: { contains: "99999", mode: "insensitive" } },
            status: "ACTIVE",
          }),
        }),
      );
    });
  });
});
