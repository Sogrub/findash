import { Test } from "@nestjs/testing";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";

const mockAdminService = {
  getDashboardMetrics: jest.fn(),
};

async function buildController() {
  const module = await Test.createTestingModule({
    controllers: [AdminController],
    providers: [{ provide: AdminService, useValue: mockAdminService }],
  }).compile();
  return module.get(AdminController);
}

describe("AdminController", () => {
  beforeEach(() => jest.clearAllMocks());

  describe("getDashboardMetrics()", () => {
    it("delegates to AdminService.getDashboardMetrics", async () => {
      const metrics = { kpis: {}, byAccountType: [] };
      mockAdminService.getDashboardMetrics.mockResolvedValue(metrics);

      const controller = await buildController();
      const result = await controller.getDashboardMetrics();

      expect(mockAdminService.getDashboardMetrics).toHaveBeenCalledTimes(1);
      expect(result).toBe(metrics);
    });

    it("propagates errors from AdminService", async () => {
      mockAdminService.getDashboardMetrics.mockRejectedValue(new Error("DB error"));

      const controller = await buildController();

      await expect(controller.getDashboardMetrics()).rejects.toThrow("DB error");
    });
  });
});
