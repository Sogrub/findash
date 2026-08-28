import { Test } from "@nestjs/testing";
import {
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { TransactionsService } from "./transactions.service";
import { AntiFraudService } from "./services/anti-fraud.service";
import { PrismaService } from "@app/common/database/prisma.service";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const SOURCE_ACCOUNT = {
  id: "src-id",
  accountNumber: "SRC001",
  status: "ACTIVE",
  type: "BASIC",
  userId: "user-1",
};

const DEST_ACCOUNT = {
  id: "dst-id",
  accountNumber: "DST001",
  status: "ACTIVE",
  userId: "user-2",
};

const COMPLETED_TX = {
  id: "tx-1",
  idempotencyKey: "key-abc",
  sourceAccountId: "src-id",
  destAccountId: "dst-id",
  amount: new Prisma.Decimal(100),
  commission: new Prisma.Decimal(0),
  totalDeducted: new Prisma.Decimal(100),
  status: "COMPLETED",
  authorizationCode: "AUTH-ABC123",
  createdAt: new Date("2025-01-01"),
  sourceAccount: { accountNumber: "SRC001", user: { fullName: "Carlos Martínez" } },
  destAccount:   { accountNumber: "DST001", user: { fullName: "Sofía Gómez" } },
};

// ── Mock Prisma ───────────────────────────────────────────────────────────────

const txClient = {
  $queryRaw: jest.fn().mockResolvedValue([{ balance: "1000.00" }]),
  transaction: { create: jest.fn().mockResolvedValue(COMPLETED_TX) },
  account: { update: jest.fn().mockResolvedValue(null) },
};

const mockPrisma = {
  transaction: { findUnique: jest.fn(), findMany: jest.fn(), count: jest.fn() },
  account: { findUnique: jest.fn() },
  $transaction: jest.fn(),
};

const mockAntiFraud = { check: jest.fn().mockResolvedValue(undefined) };

async function buildService() {
  const module = await Test.createTestingModule({
    providers: [
      TransactionsService,
      { provide: PrismaService, useValue: mockPrisma },
      { provide: AntiFraudService, useValue: mockAntiFraud },
    ],
  }).compile();
  return module.get(TransactionsService);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("TransactionsService", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    // Default happy-path behavior shared across most tests
    mockAntiFraud.check.mockResolvedValue(undefined);
    txClient.account.update.mockResolvedValue(null);
  });

  // ── createTransfer() ────────────────────────────────────────────────────────

  describe("createTransfer()", () => {
    const dto = { toAccountNumber: "DST001", amount: 100 };

    function setupHappyPath(balanceStr = "1000.00") {
      mockPrisma.transaction.findUnique.mockResolvedValue(null);
      mockPrisma.account.findUnique
        .mockResolvedValueOnce(SOURCE_ACCOUNT)
        .mockResolvedValueOnce(DEST_ACCOUNT);
      txClient.$queryRaw.mockResolvedValue([{ balance: balanceStr }]);
      txClient.transaction.create.mockResolvedValue(COMPLETED_TX);
      txClient.account.update.mockResolvedValue(null);
      mockPrisma.$transaction.mockImplementation(
        async (fn: (tx: typeof txClient) => unknown) => fn(txClient),
      );
    }

    it("returns formatted transaction on success", async () => {
      setupHappyPath();
      const service = await buildService();
      const result = await service.createTransfer("user-1", "key-1", dto);

      expect(result.status).toBe("COMPLETED");
      expect(result.authorizationCode).toBe("AUTH-ABC123");
      expect(result.amount).toBe(100);
      expect(result.fromName).toBe("Carlos Martínez");
      expect(result.toName).toBe("Sofía Gómez");
    });

    it("runs anti-fraud check before the transaction", async () => {
      setupHappyPath();
      const service = await buildService();
      await service.createTransfer("user-1", "key-1", dto);

      expect(mockAntiFraud.check).toHaveBeenCalledTimes(1);
      // Anti-fraud must be called before $transaction
      const antiFraudOrder = mockAntiFraud.check.mock.invocationCallOrder[0];
      const txOrder = mockPrisma.$transaction.mock.invocationCallOrder[0];
      expect(antiFraudOrder).toBeLessThan(txOrder);
    });

    it("returns existing transaction for duplicate idempotency key (fast path)", async () => {
      mockPrisma.transaction.findUnique.mockResolvedValue(COMPLETED_TX);
      const service = await buildService();
      const result = await service.createTransfer("user-1", "key-abc", dto);

      expect(result.id).toBe("tx-1");
      expect(mockAntiFraud.check).not.toHaveBeenCalled();
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it("throws ServiceUnavailableException when anti-fraud times out", async () => {
      mockPrisma.transaction.findUnique.mockResolvedValue(null);
      mockPrisma.account.findUnique
        .mockResolvedValueOnce(SOURCE_ACCOUNT)
        .mockResolvedValueOnce(DEST_ACCOUNT);
      mockAntiFraud.check.mockRejectedValue(
        new ServiceUnavailableException("Anti-fraud timeout"),
      );

      const service = await buildService();
      await expect(service.createTransfer("user-1", "key-1", dto)).rejects.toThrow(
        ServiceUnavailableException,
      );
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it("throws BadRequestException when source account is not ACTIVE", async () => {
      mockPrisma.transaction.findUnique.mockResolvedValue(null);
      mockPrisma.account.findUnique
        .mockResolvedValueOnce({ ...SOURCE_ACCOUNT, status: "INACTIVE" })
        .mockResolvedValueOnce(DEST_ACCOUNT);

      const service = await buildService();
      await expect(service.createTransfer("user-1", "key-1", dto)).rejects.toThrow(BadRequestException);
    });

    it("throws NotFoundException when destination account does not exist", async () => {
      mockPrisma.transaction.findUnique.mockResolvedValue(null);
      mockPrisma.account.findUnique
        .mockResolvedValueOnce(SOURCE_ACCOUNT)
        .mockResolvedValueOnce(null);

      const service = await buildService();
      await expect(service.createTransfer("user-1", "key-1", dto)).rejects.toThrow(NotFoundException);
    });

    it("throws BadRequestException when source and destination are the same", async () => {
      mockPrisma.transaction.findUnique.mockResolvedValue(null);
      mockPrisma.account.findUnique
        .mockResolvedValueOnce(SOURCE_ACCOUNT)
        .mockResolvedValueOnce(SOURCE_ACCOUNT);

      const service = await buildService();
      await expect(
        service.createTransfer("user-1", "key-1", { toAccountNumber: "SRC001", amount: 100 }),
      ).rejects.toThrow(BadRequestException);
    });

    it("throws UnprocessableEntityException when balance is insufficient", async () => {
      setupHappyPath("50.00");

      const service = await buildService();
      await expect(service.createTransfer("user-1", "key-1", { ...dto, amount: 100 })).rejects.toThrow(
        UnprocessableEntityException,
      );
    });

    it("handles P2002 race condition and returns the winner transaction", async () => {
      mockPrisma.transaction.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(COMPLETED_TX);
      mockPrisma.account.findUnique
        .mockResolvedValueOnce(SOURCE_ACCOUNT)
        .mockResolvedValueOnce(DEST_ACCOUNT);

      const p2002 = new Prisma.PrismaClientKnownRequestError("Unique constraint", {
        code: "P2002",
        clientVersion: "5.0",
      });
      mockPrisma.$transaction.mockRejectedValue(p2002);

      const service = await buildService();
      const result = await service.createTransfer("user-1", "key-race", dto);

      expect(result.id).toBe("tx-1");
    });

    it("re-throws non-P2002 errors", async () => {
      setupHappyPath();
      mockPrisma.$transaction.mockRejectedValue(new Error("DB connection lost"));

      const service = await buildService();
      await expect(service.createTransfer("user-1", "key-1", dto)).rejects.toThrow("DB connection lost");
    });

    // ── Commission strategies ──────────────────────────────────────────────────

    it("applies 2% commission for BASIC account", async () => {
      setupHappyPath();
      txClient.transaction.create.mockResolvedValue({
        ...COMPLETED_TX,
        commission: new Prisma.Decimal("2.00"),
        totalDeducted: new Prisma.Decimal("102.00"),
      });

      const service = await buildService();
      await service.createTransfer("user-1", "key-1", dto);

      const createCall = txClient.transaction.create.mock.calls[0][0] as { data: { commission: Prisma.Decimal; totalDeducted: Prisma.Decimal } };
      expect(createCall.data.commission.toFixed(2)).toBe("2.00");
      expect(createCall.data.totalDeducted.toFixed(2)).toBe("102.00");
    });

    it("applies 0% commission for PREMIUM account", async () => {
      mockPrisma.transaction.findUnique.mockResolvedValue(null);
      mockPrisma.account.findUnique
        .mockResolvedValueOnce({ ...SOURCE_ACCOUNT, type: "PREMIUM" })
        .mockResolvedValueOnce(DEST_ACCOUNT);
      txClient.$queryRaw.mockResolvedValue([{ balance: "1000.00" }]);
      txClient.transaction.create.mockResolvedValue({
        ...COMPLETED_TX,
        commission: new Prisma.Decimal("0"),
        totalDeducted: new Prisma.Decimal("100"),
      });
      mockPrisma.$transaction.mockImplementation(
        async (fn: (tx: typeof txClient) => unknown) => fn(txClient),
      );

      const service = await buildService();
      await service.createTransfer("user-1", "key-1", dto);

      const createCall = txClient.transaction.create.mock.calls[0][0] as { data: { commission: Prisma.Decimal } };
      expect(createCall.data.commission.toFixed(2)).toBe("0.00");
    });

    it("applies $5 flat fee commission for CORPORATE account", async () => {
      mockPrisma.transaction.findUnique.mockResolvedValue(null);
      mockPrisma.account.findUnique
        .mockResolvedValueOnce({ ...SOURCE_ACCOUNT, type: "CORPORATE" })
        .mockResolvedValueOnce(DEST_ACCOUNT);
      txClient.$queryRaw.mockResolvedValue([{ balance: "1000.00" }]);
      txClient.transaction.create.mockResolvedValue({
        ...COMPLETED_TX,
        commission: new Prisma.Decimal("5"),
        totalDeducted: new Prisma.Decimal("105"),
      });
      mockPrisma.$transaction.mockImplementation(
        async (fn: (tx: typeof txClient) => unknown) => fn(txClient),
      );

      const service = await buildService();
      await service.createTransfer("user-1", "key-1", dto);

      const createCall = txClient.transaction.create.mock.calls[0][0] as { data: { commission: Prisma.Decimal } };
      expect(createCall.data.commission.toFixed(2)).toBe("5.00");
    });
  });

  // ── getMyTransactions() ─────────────────────────────────────────────────────

  describe("getMyTransactions()", () => {
    it("throws NotFoundException when user has no account", async () => {
      mockPrisma.account.findUnique.mockResolvedValue(null);

      const service = await buildService();
      await expect(service.getMyTransactions("ghost", 1, 10)).rejects.toThrow(NotFoundException);
    });

    it("returns paginated history with direction and counterpart names", async () => {
      mockPrisma.account.findUnique.mockResolvedValue({ id: "src-id" });
      mockPrisma.$transaction.mockResolvedValue([[COMPLETED_TX], 1]);

      const service = await buildService();
      const result = await service.getMyTransactions("user-1", 1, 10);

      expect(result.data[0].direction).toBe("OUTGOING");
      expect(result.data[0].fromName).toBe("Carlos Martínez");
      expect(result.data[0].toName).toBe("Sofía Gómez");
      expect(result.meta.total).toBe(1);
    });

    it("marks incoming transactions correctly", async () => {
      mockPrisma.account.findUnique.mockResolvedValue({ id: "dst-id" });
      mockPrisma.$transaction.mockResolvedValue([[COMPLETED_TX], 1]);

      const service = await buildService();
      const result = await service.getMyTransactions("user-2", 1, 10);

      expect(result.data[0].direction).toBe("INCOMING");
    });
  });

  // ── getAccountTransactions() ────────────────────────────────────────────────

  describe("getAccountTransactions()", () => {
    it("throws NotFoundException when account does not exist", async () => {
      mockPrisma.account.findUnique.mockResolvedValue(null);

      const service = await buildService();
      await expect(service.getAccountTransactions("ghost-acc", 1, 10)).rejects.toThrow(
        "Cuenta no encontrada",
      );
    });

    it("returns paginated transactions for the given account", async () => {
      mockPrisma.account.findUnique.mockResolvedValue({ id: "src-id" });
      mockPrisma.$transaction.mockResolvedValue([[COMPLETED_TX], 1]);

      const service = await buildService();
      const result = await service.getAccountTransactions("src-id", 1, 10);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].direction).toBe("OUTGOING");
      expect(result.meta.total).toBe(1);
    });

    it("marks INCOMING direction when account is the destination", async () => {
      mockPrisma.account.findUnique.mockResolvedValue({ id: "dst-id" });
      mockPrisma.$transaction.mockResolvedValue([[COMPLETED_TX], 1]);

      const service = await buildService();
      const result = await service.getAccountTransactions("dst-id", 1, 10);

      expect(result.data[0].direction).toBe("INCOMING");
    });

    it("returns correct pagination meta", async () => {
      mockPrisma.account.findUnique.mockResolvedValue({ id: "src-id" });
      mockPrisma.$transaction.mockResolvedValue([[COMPLETED_TX], 25]);

      const service = await buildService();
      const result = await service.getAccountTransactions("src-id", 2, 10);

      expect(result.meta.page).toBe(2);
      expect(result.meta.limit).toBe(10);
      expect(result.meta.total).toBe(25);
      expect(result.meta.totalPages).toBe(3);
    });
  });
});
