import { Prisma } from "@prisma/client";

export const VOLUME_BY_ACCOUNT_TYPE = Prisma.sql`
  SELECT a.type,
         COALESCE(SUM(t.amount), 0)::text AS volume,
         COUNT(t.id)                       AS txcount
  FROM accounts a
  LEFT JOIN transactions t
         ON t.source_account_id = a.id
        AND t.status = 'COMPLETED'
  GROUP BY a.type
  ORDER BY a.type
`;
