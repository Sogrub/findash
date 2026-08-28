import { PrismaService } from "./prisma.service";

describe("PrismaService", () => {
  let service: PrismaService;

  beforeEach(() => {
    service = new PrismaService();
  });

  it("calls $connect on onModuleInit", async () => {
    const connectSpy = jest.spyOn(service, "$connect").mockResolvedValue();

    await service.onModuleInit();

    expect(connectSpy).toHaveBeenCalledTimes(1);
  });

  it("calls $disconnect on onModuleDestroy", async () => {
    const disconnectSpy = jest.spyOn(service, "$disconnect").mockResolvedValue();

    await service.onModuleDestroy();

    expect(disconnectSpy).toHaveBeenCalledTimes(1);
  });
});
