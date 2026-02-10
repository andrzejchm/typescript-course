# 11 — PostgreSQL Basics

PostgreSQL is a relational database — your data lives in **tables** with rows and columns, like a spreadsheet but with strict types, relationships between tables, and a powerful query language (SQL). If Firestore is a document store (nested JSON blobs), Postgres is a structured table store. If you've used `drift` or `floor` in Flutter, you already touched SQLite — Postgres works the same way, just more powerful and designed for production servers.

---

## 1. Setting Up Locally

```bash
# macOS (Homebrew)
brew install postgresql@17
brew services start postgresql@17

# Create a database
createdb myapp

# Connect
psql myapp

# Or use a connection URL
psql postgresql://localhost:5432/myapp
```

**Alternatives:**

- **Postgres.app** (macOS) — just download and click Start. Zero config. [postgresapp.com](https://postgresapp.com)
- **Docker** — if you prefer containers:

```bash
docker run --name pg -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:17
```

---

## 2. SQL Basics — The 4 Operations (CRUD)

### CREATE TABLE (like defining a Dart class)

```sql
-- Dart equivalent:
-- class Task {
--   final String id;
--   final String title;
--   final String? description;
--   final String status;
--   final DateTime createdAt;
-- }

CREATE TABLE IF NOT EXISTS tasks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  description TEXT,
  status      TEXT NOT NULL DEFAULT 'pending',
  result      TEXT,
  created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMP NOT NULL DEFAULT NOW()
);
```

### Quick Type Mapping

| Dart Type | PostgreSQL Type | Notes |
|-----------|----------------|-------|
| `String` | `TEXT` | Variable-length string |
| `int` | `INTEGER` or `BIGINT` | 32-bit or 64-bit |
| `double` | `DOUBLE PRECISION` or `NUMERIC` | Float or exact decimal |
| `bool` | `BOOLEAN` | `true`/`false` |
| `DateTime` | `TIMESTAMP` | Date + time |
| `String` (UUID) | `UUID` | Use `gen_random_uuid()` for auto-generate |
| `List<String>` | `TEXT[]` | Postgres supports arrays! |
| `Map<String, dynamic>` | `JSONB` | Stored as binary JSON, queryable |

---

### INSERT (create a row)

```sql
-- Basic insert
INSERT INTO tasks (title, description)
VALUES ('Process data', 'Fetch and analyze');

-- Insert and get the created row back (VERY useful!)
INSERT INTO tasks (title, description, status)
VALUES ('Process data', 'Fetch and analyze', 'pending')
RETURNING *;

-- Insert multiple rows
INSERT INTO tasks (title) VALUES ('Task 1'), ('Task 2'), ('Task 3');
```

`RETURNING *` is a PostgreSQL superpower — you get the created row back including the generated `id` and `created_at`. No need for a second query!

---

### SELECT (read rows)

```sql
-- Get all
SELECT * FROM tasks;

-- Get specific columns
SELECT id, title, status FROM tasks;

-- Filter (WHERE)
SELECT * FROM tasks WHERE status = 'pending';

-- Multiple conditions
SELECT * FROM tasks WHERE status = 'pending' AND created_at > '2026-01-01';

-- Sort
SELECT * FROM tasks ORDER BY created_at DESC;

-- Limit (pagination)
SELECT * FROM tasks ORDER BY created_at DESC LIMIT 10 OFFSET 20;

-- Count
SELECT COUNT(*) FROM tasks WHERE status = 'completed';

-- Get one by ID
SELECT * FROM tasks WHERE id = '550e8400-e29b-41d4-a716-446655440000';
```

---

### UPDATE (modify rows)

```sql
-- Update one
UPDATE tasks SET status = 'completed', result = 'Done!' WHERE id = '...';

-- Update and return the updated row
UPDATE tasks SET status = 'completed'
WHERE id = '...'
RETURNING *;

-- Update multiple
UPDATE tasks SET status = 'cancelled'
WHERE status = 'pending' AND created_at < '2026-01-01';
```

> **Warning:** Always use `WHERE`! Without it, you update ALL rows.

---

### DELETE (remove rows)

```sql
-- Delete one
DELETE FROM tasks WHERE id = '...';

-- Delete and confirm what was deleted
DELETE FROM tasks WHERE id = '...' RETURNING *;

-- Delete multiple
DELETE FROM tasks WHERE status = 'cancelled';
```

> **Warning:** Same rule — always use `WHERE` with DELETE.

---

## 3. Using `pg` in Node.js/TypeScript

### Connection Pool (singleton pattern)

```typescript
// lib/db.ts
import { Pool, QueryResultRow } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // or individual fields:
  // host: 'localhost', port: 5432, database: 'myapp',
  // user: 'postgres', password: 'postgres'
});

// Typed query helper
export async function query<T extends QueryResultRow>(
  text: string,
  params?: any[]
): Promise<T[]> {
  const result = await pool.query<T>(text, params);
  return result.rows;
}

// For single row results
export async function queryOne<T extends QueryResultRow>(
  text: string,
  params?: any[]
): Promise<T | null> {
  const result = await pool.query<T>(text, params);
  return result.rows[0] ?? null;
}

export default pool;
```

---

### CRUD Operations in TypeScript

```typescript
// Types
interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  result: string | null;
  created_at: Date;
  updated_at: Date;
}

// CREATE
const newTask = await queryOne<Task>(
  `INSERT INTO tasks (title, description) VALUES ($1, $2) RETURNING *`,
  [title, description]
);

// READ (all, with filter)
const pending = await query<Task>(
  `SELECT * FROM tasks WHERE status = $1 ORDER BY created_at DESC`,
  ["pending"]
);

// READ (one by ID)
const task = await queryOne<Task>(
  `SELECT * FROM tasks WHERE id = $1`,
  [taskId]
);

// UPDATE
const updated = await queryOne<Task>(
  `UPDATE tasks SET status = $1, result = $2, updated_at = NOW()
   WHERE id = $3 RETURNING *`,
  ["completed", "Success!", taskId]
);

// DELETE
const deleted = await queryOne<Task>(
  `DELETE FROM tasks WHERE id = $1 RETURNING *`,
  [taskId]
);
```

**Key things to notice:**

- `$1`, `$2`, `$3` — positional parameters (prevents SQL injection!)
- Always use parameters, NEVER string interpolation: `` `WHERE id = '${id}'` `` — **NEVER DO THIS**
- `RETURNING *` — always use it to get the result back
- `result.rows` — `pg` returns `{ rows: T[], rowCount: number }`

---

## 4. Relationships

### One-to-many

```sql
CREATE TABLE workflows (
  id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name  TEXT NOT NULL
);

CREATE TABLE tasks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  position    INTEGER NOT NULL DEFAULT 0
);
```

`REFERENCES` = foreign key. `ON DELETE CASCADE` = delete tasks when their workflow is deleted.

### Querying with JOIN

```sql
-- Get a workflow with all its tasks
SELECT w.*, t.id as task_id, t.title as task_title, t.status
FROM workflows w
LEFT JOIN tasks t ON t.workflow_id = w.id
WHERE w.id = $1
ORDER BY t.position;
```

Don't panic about JOINs — think of it as "fetch from two tables and connect matching rows."

---

## 5. JSONB — PostgreSQL's Secret Weapon

```sql
-- Store arbitrary JSON (like Firestore documents!)
CREATE TABLE events (
  id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type     TEXT NOT NULL,
  payload  JSONB NOT NULL DEFAULT '{}'
);

-- Insert JSON
INSERT INTO events (type, payload)
VALUES ('user_action', '{"action": "click", "target": "button", "metadata": {"page": "home"}}');

-- Query inside JSON
SELECT * FROM events WHERE payload->>'action' = 'click';
SELECT * FROM events WHERE payload->'metadata'->>'page' = 'home';
```

`->>` extracts as text, `->` extracts as JSON. This is useful for storing flexible/dynamic data alongside structured tables — like having Firestore inside Postgres.

---

## 6. Useful PostgreSQL Commands (psql)

```
\dt         — list all tables
\d tasks    — describe table structure
\l          — list databases
\c mydb     — connect to database
\q          — quit
\x          — toggle expanded display (easier to read wide rows)
```

---

## 7. Common Patterns for the Interview

### Initialize database (idempotent script)

```sql
-- db/init.sql
CREATE TABLE IF NOT EXISTS tasks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  description TEXT,
  status      TEXT NOT NULL DEFAULT 'pending',
  result      TEXT,
  created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Add columns later without breaking existing tables
-- ALTER TABLE tasks ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 0;
```

Run with: `psql $DATABASE_URL -f db/init.sql`

### Transaction (all-or-nothing operations)

```typescript
const client = await pool.connect();
try {
  await client.query("BEGIN");

  const workflow = await client.query(
    `INSERT INTO workflows (name) VALUES ($1) RETURNING *`,
    [name]
  );

  await client.query(
    `INSERT INTO tasks (workflow_id, title, position) VALUES ($1, $2, 0)`,
    [workflow.rows[0].id, "First task"]
  );

  await client.query("COMMIT");
} catch (e) {
  await client.query("ROLLBACK");
  throw e;
} finally {
  client.release();
}
```

Think of transactions like Firestore batched writes — either everything succeeds, or nothing does.

---

## 8. Dart/Flutter ↔ PostgreSQL Comparison

| Flutter/Dart | PostgreSQL/pg |
|---|---|
| `drift` / `floor` (SQLite ORM) | `pg` (raw driver) |
| `@DataClassName('Task')` | `CREATE TABLE tasks (...)` |
| `select(tasks).get()` | `SELECT * FROM tasks` |
| `into(tasks).insert(...)` | `INSERT INTO tasks (...) VALUES (...)` |
| Firestore document | Table row |
| Firestore collection | Table |
| Firestore subcollection | Related table with foreign key |
| `Map<String, dynamic>` field | `JSONB` column |
| `drift` migrations | `db/init.sql` script |

---

## 9. Interview Tips

- **Use `RETURNING *` everywhere** — avoids a second SELECT after INSERT/UPDATE
- **Use `$1, $2` params** — never concatenate SQL strings
- **`CREATE TABLE IF NOT EXISTS`** — idempotent, safe to run repeatedly
- **Keep queries in separate functions** (e.g., `lib/queries/tasks.ts`) — clean and testable
- **Use `JSONB` for flexible data** — it's like having Firestore inside Postgres
- **`UUID` primary keys** are better than auto-increment for distributed systems
- **Keep the schema simple** — you can always add columns later with `ALTER TABLE`
