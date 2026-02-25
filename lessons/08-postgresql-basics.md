# 08 - PostgreSQL Basics

PostgreSQL is the core persistence layer for many production systems. This lesson covers practical fundamentals: modeling data, writing safe queries, indexing correctly, running transactions, reading query plans, and evolving schema without downtime.

---

## 1. Data Modeling Fundamentals

Start with explicit constraints. Constraints are correctness tools, not optional polish.

```sql
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT NOT NULL UNIQUE,
  full_name     TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE orders (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES users(id),
  external_ref       TEXT NOT NULL UNIQUE,
  status             TEXT NOT NULL CHECK (status IN ('pending', 'paid', 'failed')),
  amount_cents       INTEGER NOT NULL CHECK (amount_cents > 0),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Guidelines:

- use `TIMESTAMPTZ` for timestamps
- encode invariants with `CHECK`, `NOT NULL`, `UNIQUE`
- add foreign keys for relational integrity
- model money as integer cents, not floating point

---

## 2. Safe Querying from TypeScript

Always parameterize queries; never interpolate user input.

```typescript
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

type OrderRow = {
  id: string;
  user_id: string;
  status: "pending" | "paid" | "failed";
  amount_cents: number;
};

export async function findOrderById(id: string): Promise<OrderRow | null> {
  const result = await pool.query<OrderRow>(
    `SELECT id, user_id, status, amount_cents FROM orders WHERE id = $1`,
    [id],
  );

  return result.rows[0] ?? null;
}
```

Use `RETURNING` on writes to avoid extra reads:

```sql
INSERT INTO orders (user_id, external_ref, status, amount_cents)
VALUES ($1, $2, 'pending', $3)
RETURNING id, status, created_at;
```

---

## 3. Indexing Strategy

Indexes speed reads but add write overhead. Add them where query patterns justify cost.

```sql
-- filter and sort path
CREATE INDEX idx_orders_user_created ON orders (user_id, created_at DESC);

-- lookup path
CREATE UNIQUE INDEX idx_orders_external_ref ON orders (external_ref);

-- selective partial index
CREATE INDEX idx_orders_pending ON orders (created_at)
WHERE status = 'pending';
```

Index what you query frequently:

- columns used in `WHERE`
- columns used in `ORDER BY`
- join keys and foreign keys
- high-value partial subsets

Avoid adding speculative indexes without observed need.

---

## 4. Transactions and Isolation

Use transactions for multi-step state changes that must succeed together.

```typescript
const client = await pool.connect();
try {
  await client.query("BEGIN");

  const debit = await client.query(
    `UPDATE accounts
     SET balance_cents = balance_cents - $1
     WHERE id = $2 AND balance_cents >= $1
     RETURNING id`,
    [amountCents, sourceAccountId],
  );

  if (debit.rowCount !== 1) {
    throw new Error("Insufficient balance");
  }

  await client.query(
    `UPDATE accounts SET balance_cents = balance_cents + $1 WHERE id = $2`,
    [amountCents, destinationAccountId],
  );

  await client.query("COMMIT");
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
}
```

Isolation choices are trade-offs:

- `READ COMMITTED`: default, good baseline
- `REPEATABLE READ`: stable reads inside transaction
- `SERIALIZABLE`: strongest correctness, higher contention/retry cost

Use the weakest isolation level that preserves correctness.

---

## 5. Query Plans and Performance Tuning

Do not guess why a query is slow. Inspect the execution plan.

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT id, status, created_at
FROM orders
WHERE user_id = $1
ORDER BY created_at DESC
LIMIT 50;
```

What to watch:

- `Seq Scan` on large tables when index scan is expected
- high `Rows Removed by Filter`
- sort nodes with large memory usage
- high shared/local buffer reads

Tune by rewriting query shape, adding/removing indexes, or reducing payload.

---

## 6. Schema Evolution Without Downtime

Use expand/contract migrations to avoid breaking running application versions.

### Expand (safe additions)

1. Add nullable column or table
2. Backfill data asynchronously in batches
3. Deploy app that writes both old and new fields

### Contract (safe cleanup)

4. Switch reads to new field only
5. Enforce `NOT NULL` / constraints
6. Drop old field in a later migration

Example:

```sql
-- expand
ALTER TABLE orders ADD COLUMN processed_at TIMESTAMPTZ;

-- later, after backfill and dual writes
ALTER TABLE orders ALTER COLUMN processed_at SET NOT NULL;
```

Never combine data backfill and schema lock-heavy operations into one risky migration.

---

## 7. Idempotency and Consistency Patterns

Network retries happen. Make write operations safe.

Database-backed pattern:

- client sends `Idempotency-Key`
- store key in a unique column/table
- on duplicate key, return existing result instead of writing again

```sql
CREATE TABLE payment_requests (
  idempotency_key TEXT PRIMARY KEY,
  order_id UUID NOT NULL,
  response_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Combine with transactions so side effects and idempotency record commit atomically.

---

## 8. Operational Practices

- use connection pooling; avoid creating a new DB connection per request
- set statement timeouts to prevent runaway queries
- capture slow query logs and review regularly
- monitor lock waits and deadlocks
- test migrations on production-like data before release

PostgreSQL reliability comes from discipline in migrations, indexing, and transactional boundaries.

---

**Previous:** [07-express-basics.md](./07-express-basics.md) - Express Basics  
**Next:** [09-backend-concepts.md](./09-backend-concepts.md) - Backend Concepts
