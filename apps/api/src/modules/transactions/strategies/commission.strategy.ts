import { Prisma } from "@prisma/client";

export interface CommissionStrategy {
  readonly name: string;
  calculate(amount: Prisma.Decimal): Prisma.Decimal;
}
