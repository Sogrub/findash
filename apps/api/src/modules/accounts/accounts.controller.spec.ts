import { Test, TestingModule } from "@nestjs/testing";
import { AccountsController } from "./accounts.controller";
import { AccountsService } from "./accounts.service";
import { JwtPayload } from "@app/modules/auth/strategies/jwt.strategy";
import { AccountSortField, SortOrder } from "./dto/list-accounts.dto";

const mockAccountsService = {
  getMyAccount: jest.fn(),
  listAccounts: jest.fn(),
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
    controllers: [AccountsController],
    providers: [{ provide: AccountsService, useValue: mockAccountsService }],
  }).compile();
  return module.get(AccountsController);
}

describe("AccountsController", () => {
  beforeEach(() => jest.clearAllMocks());

  // ── getMyAccount() ──────────────────────────────────────────────────────────

  describe("getMyAccount()", () => {
    it("delegates to AccountsService with the current user sub", async () => {
      const mockAccount = { accountNumber: "FD001", balance: 500, type: "BASIC", status: "ACTIVE" };
      mockAccountsService.getMyAccount.mockResolvedValue(mockAccount);
      const controller = await buildController();

      const result = await controller.getMyAccount(mockUser);

      expect(mockAccountsService.getMyAccount).toHaveBeenCalledWith("user-uuid");
      expect(result).toEqual(mockAccount);
    });
  });

  // ── listAccounts() ──────────────────────────────────────────────────────────

  describe("listAccounts()", () => {
    const dto = {
      page: 1,
      limit: 20,
      sortBy: AccountSortField.CREATED_AT,
      sortOrder: SortOrder.DESC,
    };
    const mockResponse = { data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } };

    it("delegates the full DTO to AccountsService", async () => {
      mockAccountsService.listAccounts.mockResolvedValue(mockResponse);
      const controller = await buildController();

      const result = await controller.listAccounts(dto);

      expect(mockAccountsService.listAccounts).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockResponse);
    });

    it("passes search and status filters when provided", async () => {
      mockAccountsService.listAccounts.mockResolvedValue(mockResponse);
      const controller = await buildController();
      const dtoWithFilters = { ...dto, search: "12345", status: "ACTIVE" };

      await controller.listAccounts(dtoWithFilters);

      expect(mockAccountsService.listAccounts).toHaveBeenCalledWith(
        expect.objectContaining({ search: "12345", status: "ACTIVE" }),
      );
    });
  });
});
