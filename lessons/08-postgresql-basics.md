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

> **Alternative driver:** The example above uses `pg` (node-postgres). See Section 3 for `postgres.js`, a modern alternative where the same query looks like this:
>
> ```typescript
> import postgres from "postgres";
> const sql = postgres(process.env.DATABASE_URL!);
>
> const [order] = await sql<OrderRow[]>`
>   SELECT id, user_id, status, amount_cents FROM orders WHERE id = ${id}
> `;
> ```
>
> Values inside `${}` are auto-parameterized — SQL injection is structurally impossible.

Use `RETURNING` on writes to avoid extra reads:

```sql
INSERT INTO orders (user_id, external_ref, status, amount_cents)
VALUES ($1, $2, 'pending', $3)
RETURNING id, status, created_at;
```

---

## 3. Choosing a PostgreSQL Driver: `pg` vs `postgres.js`

Both are production-ready drivers for connecting to PostgreSQL from Node.js/TypeScript. They differ in API design, performance characteristics, and ecosystem role.

### `pg` (node-postgres) — Industry Standard

```typescript
import { Pool } from "pg";
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Positional $1, $2 parameters — you manage the array yourself
const { rows } = await pool.query<OrderRow>(
  "SELECT * FROM orders WHERE status = $1 AND created_at > $2",
  ["pending", startDate]
);
```

- Been around since 2010, most battle-tested Node.js PG driver
- Every ORM uses it under the hood (Prisma, TypeORM, Knex all depend on `pg`)
- Separate `Pool` and `Client` concepts — explicit connection lifecycle control
- `@types/pg` for TypeScript types

### `postgres.js` — Modern Alternative

```typescript
import postgres from "postgres";
const sql = postgres(process.env.DATABASE_URL!);

// Tagged template literals — values go inline, auto-parameterized
const orders = await sql`
  SELECT * FROM orders WHERE status = ${"pending"} AND created_at > ${startDate}
`;
```

- Tagged template literals: the `sql` function before the backticks receives string parts and values separately — values can NEVER be interpreted as SQL (injection impossible by design)
- Built-in connection pooling (no separate Pool setup)
- Prepared statements by default (Postgres parses + plans the query once, reuses the plan on subsequent calls — skips repeated work)
- Pipelining: sends multiple queries without waiting for each response
- 3-6x faster in benchmarks than `pg`
- Zero dependencies, built-in TypeScript types
- Used by Drizzle ORM under the hood

### What are tagged template literals?

Normal template literal: `` `Hello ${name}` `` → just concatenates the string.

Tagged template literal: `` sql`SELECT * FROM users WHERE id = ${id}` `` → calls the `sql` function, which receives:
- String parts: `["SELECT * FROM users WHERE id = ", ""]`
- Values: `[id]`

The library always knows which parts are SQL and which are user values. It sends values as parameters automatically. This is why SQL injection is structurally impossible — not just "remember to use params" but "the API literally cannot concatenate user input into SQL."

### What are prepared statements?

When Postgres receives a query, it does 3 steps:
1. **Parse** — read SQL text, check syntax
2. **Plan** — figure out the fastest execution path (which index, join order, etc.)
3. **Execute** — actually get the data

Without prepared statements: all 3 steps run every time, even for identical query shapes.
With prepared statements: Postgres remembers the parse+plan result. Subsequent calls with different values skip steps 1-2 and go straight to execute.

`postgres.js` does this automatically. With `pg` you need to opt in.

### Comparison Table

| Aspect | `pg` | `postgres.js` |
|--------|------|---------------|
| Age | 2010, 15+ years | 2020, ~6 years |
| NPM downloads | ~10M/week | ~1M/week |
| Query syntax | `query("... $1", [val])` | `` sql`... ${val}` `` |
| Connection pooling | Manual `Pool` setup | Built-in, automatic |
| Prepared statements | Opt-in | Automatic |
| Performance | Good | 3-6x faster (benchmarks) |
| TypeScript | `@types/pg` separate | Built-in |
| Used by | Prisma, TypeORM, Knex | Drizzle |
| Risk of param order bugs | Higher (counting $1,$2,$3) | Zero (values inline) |

### Which to choose?

- **`pg`** if: team already uses it, need ORM compatibility, value ecosystem maturity
- **`postgres.js`** if: new project, want better DX and performance, using Drizzle

Both are production-ready. The driver is not the scaling bottleneck — query design, indexing, and connection management matter more.

### Flutter/Dart analogy

- `pg` is like the `http` package — been around forever, everyone knows it, works fine
- `postgres.js` is like `dio` — modern, better DX, more features built-in, but newer

---

## 4. Indexing Strategy

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

## 5. Transactions and Isolation

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

## 6. Query Plans and Performance Tuning

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

## 7. Schema Evolution Without Downtime

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

## 8. Idempotency and Consistency Patterns

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

## 9. Operational Practices

- use connection pooling; avoid creating a new DB connection per request
- set statement timeouts to prevent runaway queries
- capture slow query logs and review regularly
- monitor lock waits and deadlocks
- test migrations on production-like data before release

PostgreSQL reliability comes from discipline in migrations, indexing, and transactional boundaries.

---

## 10. Connection Pooling and PgBouncer

### Why Connection Pooling Matters

In SQLite (drift/floor), you open a file and talk to it directly. PostgreSQL is different — it's a separate server process. Each connection involves TCP handshake, authentication, and a dedicated OS process on the Postgres server (~10MB RAM each). Opening a connection takes ~20-50ms.

A **connection pool** keeps a set of pre-opened connections and hands them out to requests:

```
WITHOUT pool:
  Request 1 → open connection (50ms) → query → close
  Request 2 → open connection (50ms) → query → close

WITH pool (default in pg and postgres.js):
  App starts → opens 10 connections, keeps them alive
  Request 1 → borrow conn #3 → query (2ms) → return to pool
  Request 2 → borrow conn #3 → query (2ms) → return to pool (reused!)
```

Both `pg` (`new Pool()`) and `postgres.js` (`postgres()`) create pools by default.

### The Scaling Problem

One app instance with a pool of 20 connections works fine. But when you scale:

```
1 instance  × 20 connections = 20   ✅ (Postgres default max: 100)
3 instances × 20 connections = 60   ⚠️ getting close
6 instances × 20 connections = 120  ❌ exceeds Postgres limit
```

With serverless (Next.js API routes on Vercel, Lambda functions), it's worse — each invocation might try to open its own connection.

### PgBouncer — Connection Multiplexer

PgBouncer is a lightweight proxy that sits between your app and Postgres. It accepts many app connections but maintains only a few real Postgres connections:

```
WITHOUT PgBouncer:
  App 1 (20 conns) ──→
  App 2 (20 conns) ──→  PostgreSQL (60 connections, 60 OS processes)
  App 3 (20 conns) ──→

WITH PgBouncer:
  App 1 (20 conns) ──→              ┌──→ PostgreSQL (10 real connections)
  App 2 (20 conns) ──→  PgBouncer ──┤
  App 3 (20 conns) ──→              └──→ multiplexes 60 → 10
```

**Multiplexing** works because your connections aren't all active simultaneously. A query takes ~5ms, then the connection sits idle. PgBouncer exploits this — it shares the real connections across app connections, giving each one a turn when they actually need to query.

### PgBouncer Pooling Modes

| Mode | How it works | When to use |
|---|---|---|
| **Transaction** | Connection assigned for one transaction, then returned | Default, best for most apps |
| **Session** | Connection held for entire client session | When using prepared statements or session-level features |
| **Statement** | Connection returned after each statement | Most aggressive sharing, but no multi-statement transactions |

### Managed Alternatives

Many cloud Postgres providers include built-in connection pooling:
- **Supabase** — built-in PgBouncer, configurable in dashboard
- **Neon** — built-in connection pooler
- **AWS RDS Proxy** — managed proxy for RDS/Aurora
- **Azure** — connection pooling via PgBouncer add-on

If using a managed provider, check if pooling is already included before adding PgBouncer yourself.

### Configuration Tips

```ini
# pgbouncer.ini essentials
pool_mode = transaction
default_pool_size = 20          # real connections to Postgres per database
max_client_conn = 1000          # max app connections PgBouncer accepts
reserve_pool_size = 5           # extra connections for burst
server_idle_timeout = 600       # close idle real connections after 10 min
```

### When to Add PgBouncer

- Single app instance with <100 connections: built-in pool is fine, skip PgBouncer
- Multiple instances or serverless: add PgBouncer or use managed pooler
- Hitting Postgres connection limits: definitely add PgBouncer
- Seeing "too many connections" errors: add PgBouncer immediately

---

## 11. PostGIS — Geospatial Data

PostGIS is a PostgreSQL extension that adds geographic and geometry types plus spatial query functions. It turns Postgres into a full geospatial database.

If you've used `google_maps_flutter` or `geolocator` to work with lat/lng on the client, PostGIS is where that data lives and gets queried on the server.

### Enabling PostGIS

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
```

### Core Types

- `GEOMETRY` — flat-plane math (maps, floor plans)
- `GEOGRAPHY` — spherical-earth math (real-world lat/lng) — use this for most cases
- `POINT`, `LINESTRING`, `POLYGON` — shape subtypes

How to store a location:

```sql
CREATE TABLE locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  coordinates GEOGRAPHY(POINT, 4326) NOT NULL  -- 4326 = WGS84 (GPS standard)
);

-- Insert a point (longitude first, then latitude!)
INSERT INTO locations (name, coordinates)
VALUES ('Office', ST_MakePoint(-73.9857, 40.7484)::geography);
```

> ⚠️ PostGIS uses **longitude, latitude** order — not lat, lng like Google Maps. This WILL trip you up.

### Essential Queries

Find locations within a radius:

```sql
-- Find all locations within 5km of a point
SELECT name,
       ST_Distance(coordinates, ST_MakePoint(-73.9857, 40.7484)::geography) AS distance_meters
FROM locations
WHERE ST_DWithin(coordinates, ST_MakePoint(-73.9857, 40.7484)::geography, 5000)
ORDER BY distance_meters;
```

Find nearest N locations:

```sql
-- Find 10 nearest locations (uses spatial index efficiently)
SELECT name,
       ST_Distance(coordinates, ST_MakePoint(-73.9857, 40.7484)::geography) AS distance_meters
FROM locations
ORDER BY coordinates <-> ST_MakePoint(-73.9857, 40.7484)::geography
LIMIT 10;
```

Check if a point is inside a polygon (geofencing):

```sql
-- Is this point inside the delivery zone?
SELECT ST_Contains(
  zone_polygon::geometry,
  ST_MakePoint(-73.9857, 40.7484)::geometry
) AS is_inside
FROM delivery_zones
WHERE id = $1;
```

Distance between two points:

```sql
SELECT ST_Distance(
  ST_MakePoint(-73.9857, 40.7484)::geography,  -- New York
  ST_MakePoint(-0.1278, 51.5074)::geography      -- London
) / 1000 AS distance_km;
-- Returns ~5570 km
```

### Spatial Indexes

Without a spatial index, every spatial query scans all rows. Always add one.

```sql
CREATE INDEX idx_locations_coordinates ON locations USING GIST (coordinates);
```

GIST index is to spatial queries what B-tree index is to regular `WHERE` clauses.

### Using PostGIS from TypeScript

Works with `pg`, `postgres.js`, or any driver that supports parameterized queries:

```typescript
// Insert a location
await sql`
  INSERT INTO locations (name, coordinates)
  VALUES (${name}, ST_MakePoint(${lng}, ${lat})::geography)
`;

// Find nearby
interface NearbyLocation {
  id: string;
  name: string;
  distance_meters: number;
}

const nearby = await sql<NearbyLocation[]>`
  SELECT id, name,
    ST_Distance(coordinates, ST_MakePoint(${lng}, ${lat})::geography) AS distance_meters
  FROM locations
  WHERE ST_DWithin(coordinates, ST_MakePoint(${lng}, ${lat})::geography, ${radiusMeters})
  ORDER BY distance_meters
`;
```

### Common Functions Cheat Sheet

| Function | What it does |
|---|---|
| `ST_MakePoint(lng, lat)` | Create a point |
| `ST_Distance(a, b)` | Distance in meters (geography) |
| `ST_DWithin(a, b, meters)` | Is distance within threshold? (uses index!) |
| `ST_Contains(polygon, point)` | Is point inside polygon? |
| `ST_Area(polygon)` | Area in square meters |
| `ST_AsGeoJSON(geom)` | Convert to GeoJSON (for frontend maps) |
| `ST_GeomFromGeoJSON(json)` | Parse GeoJSON into geometry |
| `<->` operator | KNN distance operator (for ORDER BY nearest) |

### Flutter/Dart ↔ PostGIS Mapping

| Flutter / Client | PostGIS / Server |
|---|---|
| `LatLng(lat, lng)` | `ST_MakePoint(lng, lat)` ⚠️ reversed! |
| `Geolocator.distanceBetween()` | `ST_Distance()` |
| `google_maps_flutter` polygon | `ST_Contains()` geofence check |
| GeoJSON from API | `ST_AsGeoJSON()` / `ST_GeomFromGeoJSON()` |

### When to Use PostGIS

- Location-based features: find nearby, delivery zones, store locators
- Geofencing: is user inside area X?
- Route and area calculations
- Any app that shows things on a map and needs server-side spatial queries

### When NOT to Use PostGIS

- Simple lat/lng storage without spatial queries — just use two `DOUBLE PRECISION` columns
- Client-only distance calculations — use Haversine formula in JS/Dart
- Full GIS workflows — consider specialized tools

---

**Previous:** [07-express-basics.md](./07-express-basics.md) - Express Basics  
**Next:** [09-backend-concepts.md](./09-backend-concepts.md) - Backend Concepts
