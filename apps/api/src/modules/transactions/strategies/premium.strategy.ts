import { Prisma } from "@prisma/client";
import { CommissionStrategy } from "./commission.strategy";

export class PremiumCommissionStrategy implements CommissionStrategy {
  readonly name = "PREMIUM";
  calculate(_amount: Prisma.Decimal): Prisma.Decimal {
    return new Prisma.Decimal(0);
  }
}
