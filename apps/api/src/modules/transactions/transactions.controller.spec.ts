import { Test, TestingModule } from "@nestjs/testing";
import { TransactionsController } from "./transactions.controller";
import { TransactionsService } from "./transactions.service";
import { JwtPayload } from "@app/modules/auth/strategies/jwt.strategy";
import { IdempotencyKeyMissingException } from "./exceptions/idempotency-key-missing.exception";

const mockTransactionsService = {
  createTransfer: jest.fn(),
  getMyTransactions: jest.fn(),
  getAccountTransactions: jest.fn(),
};

const mockUser: JwtPayload = {
  sub: "user-uuid",
  email: "user@test.com",
  role: "CLIENT",
  fullName: "Test User",
  jv: 0,
};

async function buildController() {
  const module: TestingModule = await Test.createTestingModule({
    controllers: [TransactionsController],
    providers: [{ provide: TransactionsService, useValue: mockTransactionsService }],
  }).compile();
  return module.get(TransactionsController);
}

describe("TransactionsController", () => {
  beforeEach(() => jest.clearAllMocks());

  // ── transfer() ──────────────────────────────────────────────────────────────

  describe("transfer()", () => {
    const dto = { toAccountNumber: "DST001", amount: 100 };
    const mockResult = { id: "tx-1", status: "COMPLETED", authorizationCode: "AUTH-ABC" };

    it("delegates to TransactionsService with trimmed idempotency key", async () => {
      mockTransactionsService.createTransfer.mockResolvedValue(mockResult);
      const controller = await buildController();

      const result = await controller.transfer(mockUser, " key-123 ", dto);

      expect(mockTransactionsService.createTransfer).toHaveBeenCalledWith(
        "user-uuid",
        "key-123",
        dto,
      );
      expect(result).toEqual(mockResult);
    });

    it("throws IdempotencyKeyMissingException when header is absent", async () => {
      const controller = await buildController();

      await expect(
        controller.transfer(mockUser, undefined as unknown as string, dto),
      ).rejects.toThrow(IdempotencyKeyMissingException);
      expect(mockTransactionsService.createTransfer).not.toHaveBeenCalled();
    });

    it("throws IdempotencyKeyMissingException when header is whitespace only", async () => {
      const controller = await buildController();

      await expect(
        controller.transfer(mockUser, "   ", dto),
      ).rejects.toThrow(IdempotencyKeyMissingException);
    });
  });

  // ── getMyTransactions() ─────────────────────────────────────────────────────

  describe("getMyTransactions()", () => {
    it("delegates to service with user sub and default pagination", () => {
      mockTransactionsService.getMyTransactions.mockResolvedValue({ data: [], meta: {} });
      buildController().then((ctrl) => {
        ctrl.getMyTransactions(mockUser);
        expect(mockTransactionsService.getMyTransactions).toHaveBeenCalledWith("user-uuid", 1, 10);
      });
    });

    it("passes page and limit from query params", async () => {
      mockTransactionsService.getMyTransactions.mockResolvedValue({ data: [], meta: {} });
      const controller = await buildController();

      controller.getMyTransactions(mockUser, 3, 5);

      expect(mockTransactionsService.getMyTransactions).toHaveBeenCalledWith("user-uuid", 3, 5);
    });
  });

  // ── getAccountTransactions() ────────────────────────────────────────────────

  describe("getAccountTransactions()", () => {
    it("delegates to service with accountId and pagination", async () => {
      mockTransactionsService.getAccountTransactions.mockResolvedValue({ data: [], meta: {} });
      const controller = await buildController();

      controller.getAccountTransactions("acc-uuid", 2, 15);

      expect(mockTransactionsService.getAccountTransactions).toHaveBeenCalledWith(
        "acc-uuid",
        2,
        15,
      );
    });

    it("uses default page and limit when not provided", async () => {
      mockTransactionsService.getAccountTransactions.mockResolvedValue({ data: [], meta: {} });
      const controller = await buildController();

      controller.getAccountTransactions("acc-uuid");

      expect(mockTransactionsService.getAccountTransactions).toHaveBeenCalledWith(
        "acc-uuid",
        1,
        10,
      );
    });
  });
});
