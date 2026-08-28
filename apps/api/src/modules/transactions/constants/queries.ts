import { Prisma } from "@prisma/client";

export const lockBalanceQuery = (id: string) => Prisma.sql`
  SELECT balance FROM accounts WHERE id::text = ${id} FOR UPDATE
`;
