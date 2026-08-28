import { Prisma } from "@prisma/client";
import { CommissionStrategy } from "./commission.strategy";

export class BasicCommissionStrategy implements CommissionStrategy {
  readonly name = "BASIC";

  private static readonly RATE = new Prisma.Decimal("0.02"); // 2%

  calculate(amount: Prisma.Decimal): Prisma.Decimal {
    return amount.mul(BasicCommissionStrategy.RATE).toDecimalPlaces(2);
  }
}
