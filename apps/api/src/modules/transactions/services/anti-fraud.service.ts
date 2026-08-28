import { Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import { Prisma } from "@prisma/client";

@Injectable()
export class AntiFraudService {
  private readonly logger = new Logger(AntiFraudService.name);
  private static readonly TIMEOUT_MS = 3_000;

  async check(amount: Prisma.Decimal, sourceAccountId: string): Promise<void> {
    this.logger.log(`Anti-fraud check — account: ${sourceAccountId}, amount: ${amount.toFixed(2)}`);

    const check = this.simulateExternalCheck();
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), AntiFraudService.TIMEOUT_MS),
    );

    try {
      await Promise.race([check, timeout]);
      this.logger.log("Anti-fraud check passed");
    } catch (err) {
      if ((err as Error).message === "timeout") {
        this.logger.warn(`Anti-fraud timeout — account: ${sourceAccountId}`);
        throw new ServiceUnavailableException(
          "El servicio de verificación anti-fraude no respondió a tiempo. Intenta de nuevo.",
        );
      }
      throw err;
    }
  }

  // Simulates an external call that completes in 500–1500ms
  private simulateExternalCheck(): Promise<void> {
    const delay = 500 + Math.random() * 1_000;
    return new Promise((resolve) => setTimeout(resolve, delay));
  }
}
