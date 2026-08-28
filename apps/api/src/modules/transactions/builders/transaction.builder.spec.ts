import { Prisma } from "@prisma/client";
import { TransactionBuilder } from "./transaction.builder";
import { CommissionStrategy } from "../strategies/commission.strategy";

const mockStrategy: CommissionStrategy = {
  name: "test",
  calculate: (amount: Prisma.Decimal) => amount.times(new Prisma.Decimal("0.01")),
};

describe("TransactionBuilder", () => {
  it("builds a complete TransactionData when all setters are called", () => {
    const amount = new Prisma.Decimal("100");
    const data = new TransactionBuilder()
      .setIdempotencyKey("key-123")
      .setAccounts("src-acc", "dst-acc")
      .setAmount(amount)
      .applyCommission(mockStrategy)
      .setAuthorizationCode("AUTH-001")
      .build();

    expect(data.idempotencyKey).toBe("key-123");
    expect(data.sourceAccountId).toBe("src-acc");
    expect(data.destAccountId).toBe("dst-acc");
    expect(data.amount.toFixed(2)).toBe("100.00");
    expect(data.commission.toFixed(2)).toBe("1.00");
    expect(data.totalDeducted.toFixed(2)).toBe("101.00");
    expect(data.status).toBe("COMPLETED");
    expect(data.authorizationCode).toBe("AUTH-001");
  });

  it("throws when build() is called without all required setters", () => {
    expect(() => new TransactionBuilder().build()).toThrow(
      "TransactionBuilder: incomplete transaction",
    );
  });

  it("throws when build() is missing idempotency key", () => {
    const builder = new TransactionBuilder()
      .setAccounts("src", "dst")
      .setAmount(new Prisma.Decimal("50"))
      .applyCommission(mockStrategy)
      .setAuthorizationCode("AUTH");

    expect(() => builder.build()).toThrow("TransactionBuilder: incomplete transaction");
  });

  it("throws when build() is missing authorization code", () => {
    const builder = new TransactionBuilder()
      .setIdempotencyKey("key")
      .setAccounts("src", "dst")
      .setAmount(new Prisma.Decimal("50"))
      .applyCommission(mockStrategy);

    expect(() => builder.build()).toThrow("TransactionBuilder: incomplete transaction");
  });

  it("throws when applyCommission is called before setAmount", () => {
    expect(() =>
      new TransactionBuilder().applyCommission(mockStrategy),
    ).toThrow("TransactionBuilder: call setAmount before applyCommission");
  });

  it("totalDeducted equals amount plus commission", () => {
    const amount = new Prisma.Decimal("200");
    const data = new TransactionBuilder()
      .setIdempotencyKey("k")
      .setAccounts("s", "d")
      .setAmount(amount)
      .applyCommission(mockStrategy)
      .setAuthorizationCode("A")
      .build();

    expect(data.totalDeducted.equals(data.amount.plus(data.commission))).toBe(true);
  });
});
