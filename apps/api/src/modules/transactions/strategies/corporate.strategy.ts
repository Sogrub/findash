import { Prisma } from "@prisma/client";
import { CommissionStrategy } from "./commission.strategy";

export class CorporateCommissionStrategy implements CommissionStrategy {
  readonly name = "CORPORATE";
  private static readonly FLAT_FEE = new Prisma.Decimal("5");

  calculate(_amount: Prisma.Decimal): Prisma.Decimal {
    return CorporateCommissionStrategy.FLAT_FEE;
  }
}
