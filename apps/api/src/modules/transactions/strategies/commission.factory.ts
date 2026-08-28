import { AccountType } from "@prisma/client";
import { CommissionStrategy } from "./commission.strategy";
import { BasicCommissionStrategy } from "./basic.strategy";
import { PremiumCommissionStrategy } from "./premium.strategy";
import { CorporateCommissionStrategy } from "./corporate.strategy";

export function resolveCommissionStrategy(accountType: AccountType): CommissionStrategy {
  switch (accountType) {
    case AccountType.PREMIUM:   return new PremiumCommissionStrategy();
    case AccountType.CORPORATE: return new CorporateCommissionStrategy();
    default:                    return new BasicCommissionStrategy();
  }
}
