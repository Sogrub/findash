import { ServiceUnavailableException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { AntiFraudService } from "./anti-fraud.service";

describe("AntiFraudService", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("resolves when the simulated check completes within timeout", async () => {
    const service = new AntiFraudService();
    jest.spyOn(service as any, "simulateExternalCheck").mockResolvedValue(undefined);

    await expect(
      service.check(new Prisma.Decimal("100"), "acc-1"),
    ).resolves.toBeUndefined();
  });

  it("throws ServiceUnavailableException when check times out", async () => {
    const service = new AntiFraudService();
    jest.spyOn(service as any, "simulateExternalCheck").mockReturnValue(
      new Promise(() => {}),
    );

    const checkPromise = service.check(new Prisma.Decimal("250"), "acc-2");
    jest.advanceTimersByTime(3_001);

    await expect(checkPromise).rejects.toThrow(ServiceUnavailableException);
  });

  it("throws ServiceUnavailableException with the correct message on timeout", async () => {
    const service = new AntiFraudService();
    jest.spyOn(service as any, "simulateExternalCheck").mockReturnValue(
      new Promise(() => {}),
    );

    const checkPromise = service.check(new Prisma.Decimal("100"), "acc-3");
    jest.advanceTimersByTime(3_001);

    await expect(checkPromise).rejects.toThrow(
      "El servicio de verificación anti-fraude no respondió a tiempo",
    );
  });

  it("does not throw for amounts passed to the check", async () => {
    const service = new AntiFraudService();
    jest.spyOn(service as any, "simulateExternalCheck").mockResolvedValue(undefined);

    await expect(
      service.check(new Prisma.Decimal("0.01"), "acc-4"),
    ).resolves.toBeUndefined();
  });

  it("re-throws non-timeout errors from the external check", async () => {
    const service = new AntiFraudService();
    const networkError = new Error("network failure");
    jest.spyOn(service as any, "simulateExternalCheck").mockRejectedValue(networkError);

    await expect(service.check(new Prisma.Decimal("50"), "acc-5")).rejects.toThrow("network failure");
    await expect(service.check(new Prisma.Decimal("50"), "acc-5")).rejects.not.toThrow(ServiceUnavailableException);
  });

  it("simulateExternalCheck resolves after internal delay", async () => {
    const service = new AntiFraudService();
    const promise = (service as any).simulateExternalCheck();
    jest.advanceTimersByTime(1_501);
    await expect(promise).resolves.toBeUndefined();
  });
});
