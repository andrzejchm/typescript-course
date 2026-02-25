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

## 9. PostGIS — Geospatial Data

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
