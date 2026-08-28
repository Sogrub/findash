import { Prisma } from "@prisma/client";
import { CommissionStrategy } from "../strategies/commission.strategy";

export interface TransactionData {
  idempotencyKey: string;
  sourceAccountId: string;
  destAccountId: string;
  amount: Prisma.Decimal;
  commission: Prisma.Decimal;
  totalDeducted: Prisma.Decimal;
  status: "COMPLETED";
  authorizationCode: string;
}

export class TransactionBuilder {
  private idempotencyKey?: string;
  private sourceAccountId?: string;
  private destAccountId?: string;
  private amount?: Prisma.Decimal;
  private commission?: Prisma.Decimal;
  private authorizationCode?: string;

  setIdempotencyKey(key: string): this {
    this.idempotencyKey = key;
    return this;
  }

  setAccounts(sourceId: string, destId: string): this {
    this.sourceAccountId = sourceId;
    this.destAccountId = destId;
    return this;
  }

  setAmount(amount: Prisma.Decimal): this {
    this.amount = amount;
    return this;
  }

  applyCommission(strategy: CommissionStrategy): this {
    if (!this.amount) throw new Error("TransactionBuilder: call setAmount before applyCommission");
    this.commission = strategy.calculate(this.amount);
    return this;
  }

  setAuthorizationCode(code: string): this {
    this.authorizationCode = code;
    return this;
  }

  build(): TransactionData {
    if (
      !this.idempotencyKey ||
      !this.sourceAccountId ||
      !this.destAccountId ||
      !this.amount ||
      this.commission === undefined ||
      !this.authorizationCode
    ) {
      throw new Error("TransactionBuilder: incomplete transaction — call all setters before build()");
    }

    return {
      idempotencyKey:  this.idempotencyKey,
      sourceAccountId: this.sourceAccountId,
      destAccountId:   this.destAccountId,
      amount:          this.amount,
      commission:      this.commission,
      totalDeducted:   this.amount.plus(this.commission),
      status:          "COMPLETED",
      authorizationCode: this.authorizationCode,
    };
  }
}
