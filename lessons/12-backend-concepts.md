# 12 — Backend & Web Concepts

You've been calling APIs from Flutter for years. Now you're building the server side. This lesson covers the core backend concepts you'll encounter in a full-stack interview — explained from first principles with Flutter/mobile analogies.

---

## 1. The N+1 Problem

The most common performance mistake in backend code. Here's the scenario:

You have 10 workflows, each with tasks. You want to display them all.

```
N+1 approach (BAD):
  Query 1: SELECT * FROM workflows                          -- get 10 workflows
  Query 2: SELECT * FROM tasks WHERE workflow_id = 'aaa'    -- tasks for workflow 1
  Query 3: SELECT * FROM tasks WHERE workflow_id = 'bbb'    -- tasks for workflow 2
  Query 4: SELECT * FROM tasks WHERE workflow_id = 'ccc'    -- tasks for workflow 3
  ... 7 more queries
  = 11 queries total (1 + N where N = 10 workflows)
```

With 1000 workflows = **1001 database queries** for one page load. Each query has network overhead (even on localhost), so this gets slow fast.

The code that causes it looks innocent:

```typescript
// ❌ N+1 — looks clean, performs terribly
const workflows = await query<Workflow>(`SELECT * FROM workflows`);

for (const workflow of workflows) {
  workflow.tasks = await query<Task>(
    `SELECT * FROM tasks WHERE workflow_id = $1`,
    [workflow.id]
  );
}
```

### The Fix — JOIN or Batch

**Option 1: JOIN** — one query gets everything:

```sql
SELECT w.*, t.id AS task_id, t.title AS task_title, t.status AS task_status
FROM workflows w
LEFT JOIN tasks t ON t.workflow_id = w.id
ORDER BY w.id, t.position;
```

You get back flat rows and group them in code. One query, done.

**Option 2: Batch** — two queries total, regardless of N:

```sql
-- Query 1: get all workflows
SELECT * FROM workflows;

-- Query 2: get ALL tasks for ALL those workflows at once
SELECT * FROM tasks WHERE workflow_id = ANY($1);
-- $1 = array of all workflow IDs: ['aaa', 'bbb', 'ccc', ...]
```

Then group tasks by `workflow_id` in code. Two queries total, whether you have 10 or 10,000 workflows.

**Flutter analogy:** Imagine fetching a list of users from Firestore, then for each user making a separate call to get their avatar URL. You'd batch it or use a collection group query instead. Same idea.

---

## 2. CORS (Cross-Origin Resource Sharing)

This is a **browser-only** security restriction. You've **never** dealt with this in Flutter because mobile apps can call any API freely.

### What happens

1. Your frontend runs at `http://localhost:3000`
2. Your backend runs at `http://localhost:4000`
3. The browser sees these as **different origins** (different ports = different origin)
4. Before sending your actual request, the browser sends a **preflight** `OPTIONS` request asking: "Hey server, is `localhost:3000` allowed to call you?"
5. If the server doesn't respond with the right headers → **browser blocks the request**

You'll see this error in the browser console:
```
Access to fetch at 'http://localhost:4000/api/tasks' from origin 'http://localhost:3000'
has been blocked by CORS policy
```

### The fix

Tell your server to allow requests from your frontend's origin:

```typescript
import cors from "cors";

// Allow your frontend origin
app.use(cors({ origin: "http://localhost:3000" }));

// Or allow everything (fine for development, not production)
app.use(cors());
```

### When you DON'T need CORS

With **Next.js API routes**, your frontend and backend are served from the **same origin** (same host + port). No CORS needed. This is one reason Next.js is popular for full-stack apps.

**Flutter analogy:** There is none — mobile apps bypass CORS entirely. If your frontend can't reach your backend and you see a CORS error in the browser console, this is why.

---

## 3. HTTP Status Codes

Know these by heart. Using specific codes (not just 200 and 500 for everything) shows you understand REST.

### 2xx — Success

| Code | Name | When to use |
|------|------|-------------|
| 200 | OK | Generic success |
| 201 | Created | Something was created (POST response) |
| 204 | No Content | Success, nothing to return (DELETE response) |

### 3xx — Redirect

| Code | Name | When to use |
|------|------|-------------|
| 301 | Moved Permanently | URL changed forever |
| 304 | Not Modified | Cached version is still valid |

### 4xx — Client Error (the CALLER messed up)

| Code | Name | When to use |
|------|------|-------------|
| 400 | Bad Request | Invalid input/body |
| 401 | Unauthorized | Not logged in (auth missing) |
| 403 | Forbidden | Logged in but not allowed |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate or state conflict |
| 422 | Unprocessable Entity | Valid JSON but semantically wrong |
| 429 | Too Many Requests | Rate limited |

### 5xx — Server Error (YOUR code messed up)

| Code | Name | When to use |
|------|------|-------------|
| 500 | Internal Server Error | Unhandled exception |
| 502 | Bad Gateway | Upstream service failed |
| 503 | Service Unavailable | Server overloaded |
| 504 | Gateway Timeout | Upstream timed out |

**Interview tip:** Use `201` for creation, `404` for missing resources, `400` for bad input. Don't just return `200` for everything — it shows you know REST conventions.

---

## 4. REST API Design Conventions

```
GET    /api/tasks          — list all tasks
GET    /api/tasks/:id      — get one task
POST   /api/tasks          — create a task
PUT    /api/tasks/:id      — replace a task entirely
PATCH  /api/tasks/:id      — update part of a task
DELETE /api/tasks/:id      — delete a task

GET    /api/workflows/:id/tasks  — list tasks for a workflow (nested resource)
```

### Key principles

- **Nouns not verbs** — `/api/tasks` not `/api/getTasks`
- **Plural** — `/api/tasks` not `/api/task`
- **HTTP method = the verb** — GET reads, POST creates, PUT/PATCH updates, DELETE deletes
- **Consistent error format** — always return `{ error: "message" }` for errors
- **Use proper status codes** — 201 for creation, 404 for not found, etc.

```typescript
// Good REST endpoint
app.post("/api/tasks", async (req, res) => {
  const task = await createTask(req.body);
  res.status(201).json(task);  // 201 Created, not just 200
});

app.get("/api/tasks/:id", async (req, res) => {
  const task = await getTask(req.params.id);
  if (!task) return res.status(404).json({ error: "Task not found" });
  res.json(task);
});
```

**Flutter comparison:** You've called REST APIs from Flutter with `http` or `dio`. Now you're BUILDING the server side of those APIs. Same URL patterns, same HTTP methods — you're just on the other end.

---

## 5. Middleware

A middleware is a function that runs **before** your route handler. It can:
- **Modify** the request (add data, parse body)
- **Short-circuit** (return an error immediately, skip the handler)
- **Pass through** to the next handler

```
Request → [logging] → [auth check] → [validation] → [your handler] → Response
```

```typescript
// Each middleware calls next() to pass control forward
function logger(req: Request, res: Response, next: NextFunction) {
  console.log(`${req.method} ${req.path}`);
  next(); // pass to next middleware
}

function authCheck(req: Request, res: Response, next: NextFunction) {
  if (!req.headers.authorization) {
    return res.status(401).json({ error: "No auth token" }); // short-circuit!
  }
  next();
}

// Apply middleware
app.use(logger);                          // runs on ALL routes
app.use("/api/admin", authCheck);         // runs only on /api/admin/*
```

**Flutter analogy:** Like interceptors in `dio`. They run before/after every request. Same concept, server side.

---

## 6. Authentication & Authorization

Two different things:

- **Authentication** = WHO are you? (login, identity)
- **Authorization** = WHAT are you allowed to do? (permissions, roles)

### Common patterns

| Pattern | How it works | Use case |
|---------|-------------|----------|
| **JWT** (JSON Web Token) | Stateless signed token in `Authorization` header | Most web apps |
| **Session** | Server stores session data, sends cookie to client | Traditional web apps |
| **API Key** | Simple key in header | Server-to-server calls |

### JWT flow

```typescript
// 1. User logs in → server creates a signed token
// 2. Client sends token with every request in the header:
//    Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
// 3. Server verifies the token signature (no DB lookup needed!)

function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split(" ")[1]; // "Bearer <token>"
  if (!token) return res.status(401).json({ error: "Missing token" });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!);
    req.user = payload; // attach user info to request
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}
```

**Flutter comparison:** You've used `firebase_auth` or stored tokens in `shared_preferences` and sent them with `dio` interceptors. Same concept — you're now building the server that CREATES and VERIFIES those tokens.

**For the interview:** You probably won't need to implement auth from scratch, but know the concept. If they give you an external API to call, you might need to pass an API key in headers.

---

## 7. Environment Variables

Secrets and config that change between environments (dev, staging, production).

```bash
# .env file (NEVER commit this!)
DATABASE_URL=postgresql://localhost:5432/myapp
OPENAI_API_KEY=sk-abc123
API_SECRET=super-secret
```

```typescript
// Access in code
const apiKey = process.env.OPENAI_API_KEY;

// With validation (good practice)
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
```

### Rules

- **NEVER** hardcode secrets in code
- **NEVER** commit `.env` to git (add to `.gitignore`)
- Always have a `.env.example` with placeholder values
- In production, set via hosting platform (Vercel, AWS, etc.)

**Flutter comparison:** Like `--dart-define` or `flutter_dotenv`. Same concept.

---

## 8. SQL Injection

The #1 database security vulnerability. If you concatenate user input into SQL strings, attackers can execute arbitrary SQL:

```typescript
// ❌ VULNERABLE — user input goes directly into SQL
const query = `SELECT * FROM users WHERE name = '${userInput}'`;
// If userInput = "'; DROP TABLE users; --"
// Final SQL: SELECT * FROM users WHERE name = ''; DROP TABLE users; --'
// 💀 Your users table is gone!

// ✅ SAFE — parameterized query (pg library)
const users = await query<User>(
  `SELECT * FROM users WHERE name = $1`,
  [userInput]
);
// The value is NEVER interpreted as SQL, only as data
```

With `postgres.js` tagged template literals, injection is impossible by design:

```typescript
// ✅ Also safe — tagged template (postgres.js)
const users = await sql`SELECT * FROM users WHERE name = ${userInput}`;
```

**Rule:** Just never use string concatenation for SQL. Always use parameterized queries or tagged templates.

---

## 9. Idempotency

An operation is **idempotent** if doing it multiple times has the same effect as doing it once.

```
GET    /api/tasks/123  — idempotent ✅ (reading doesn't change anything)
PUT    /api/tasks/123  — idempotent ✅ (replacing with same data = same result)
DELETE /api/tasks/123  — idempotent ✅ (deleting twice = still deleted)

POST   /api/tasks      — NOT idempotent ❌ (creating twice = two tasks!)
```

### Why it matters

Networks are unreliable. If a request times out and the client retries, idempotent operations are safe to retry. Non-idempotent ones (POST) can cause duplicates.

### Fix for POST — idempotency key

```typescript
app.post("/api/tasks", async (req, res) => {
  const idempotencyKey = req.headers["idempotency-key"];
  if (idempotencyKey) {
    // Check if we already processed this key
    const existing = await findByIdempotencyKey(idempotencyKey);
    if (existing) return res.status(200).json(existing); // return cached response
  }
  // Otherwise, process normally and store the result with the key
  const task = await createTask(req.body);
  if (idempotencyKey) await storeIdempotencyResult(idempotencyKey, task);
  res.status(201).json(task);
});
```

**Flutter analogy:** Same problem exists in mobile. If you tap "Submit Order" and the network is slow, the user might tap again. You'd use a loading state to prevent double-taps — but the server should also protect against duplicates.

---

## 10. Database Indexes

Without an index, the database scans **every row** to find what you want (like scrolling through an entire phone book page by page).

With an index, it jumps directly to the right row (like the alphabetical tabs on a phone book).

```sql
-- Without index: database reads ALL 1,000,000 rows, checks each one → slow
SELECT * FROM tasks WHERE status = 'pending';

-- Create an index
CREATE INDEX idx_tasks_status ON tasks (status);

-- Now the same query uses the index → near-instant
```

### When to add indexes

- Any column you **filter** by (`WHERE status = ...`)
- Any column you **sort** by (`ORDER BY created_at`)
- Any **foreign key** (`workflow_id`)
- Primary keys are **always indexed automatically**

### When NOT to add indexes

- Columns you rarely query by
- Tables with very few rows (index overhead isn't worth it)
- Columns with very low cardinality (e.g., a boolean with 50/50 split)

**Flutter analogy:** Like adding `.orderBy()` index rules in Firestore. Without them, queries fail or are slow.

---

## 11. Transactions

Multiple database operations that must **ALL succeed or ALL fail**. No partial state.

```
Transfer $100 from Alice to Bob:
  1. Subtract $100 from Alice's balance
  2. Add $100 to Bob's balance

If step 2 fails but step 1 succeeded → Alice lost $100, Bob got nothing!
Transaction ensures: either BOTH happen or NEITHER happens.
```

```typescript
// Using pg library
const client = await pool.connect();
try {
  await client.query("BEGIN");
  await client.query(
    `UPDATE accounts SET balance = balance - 100 WHERE id = $1`,
    [aliceId]
  );
  await client.query(
    `UPDATE accounts SET balance = balance + 100 WHERE id = $1`,
    [bobId]
  );
  await client.query("COMMIT");
} catch (e) {
  await client.query("ROLLBACK"); // undo everything
  throw e;
} finally {
  client.release();
}
```

```typescript
// Using postgres.js (cleaner)
await sql.begin(async (tx) => {
  await tx`UPDATE accounts SET balance = balance - 100 WHERE id = ${aliceId}`;
  await tx`UPDATE accounts SET balance = balance + 100 WHERE id = ${bobId}`;
  // If either fails, both are rolled back automatically
});
```

**Flutter analogy:** Like Firestore batched writes — either everything succeeds, or nothing does.

---

## 12. The Event Loop (Node.js Concurrency Model)

Node.js is **single-threaded**. But it handles thousands of concurrent requests. How?

The same way Dart does — with an **event loop**.

```
Node.js event loop:
  1. Receive request A → start database query → DON'T WAIT → move on
  2. Receive request B → start API call → DON'T WAIT → move on
  3. Request A's DB query finishes → run callback → send response A
  4. Request B's API call finishes → run callback → send response B
```

All I/O (database, network, file system) is **non-blocking**. While waiting for a response, Node processes other requests.

### The golden rule: NEVER block the event loop

```typescript
// ❌ BAD — blocks the entire server for ALL users
app.get("/api/heavy", (req, res) => {
  const result = heavySynchronousComputation(); // takes 5 seconds
  // During those 5 seconds, NO other request can be processed!
  res.json(result);
});

// ✅ GOOD — use async operations that don't block
app.get("/api/heavy", async (req, res) => {
  const result = await runInWorkerThread(heavyComputation);
  res.json(result);
});
```

**Flutter comparison:**
- Dart has an event loop too! `Future.then()` / `async`-`await` in Dart = same concept
- Dart isolates = Node worker threads (rarely needed in either)
- If you understand `Future` in Dart, you understand `Promise` in Node

---

## 13. Rate Limiting

Prevent users/bots from hammering your API:

```typescript
// Concept: X requests per Y seconds per IP
// "100 requests per minute per IP address"

import rateLimit from "express-rate-limit";

const limiter = rateLimit({
  windowMs: 60 * 1000,  // 1 minute
  max: 100,             // 100 requests per window
  message: { error: "Too many requests, try again later" },
});

app.use("/api/", limiter);
```

### Why it matters for the interview

If you're calling an external API (like OpenAI), **those have rate limits too**. Handle the `429 Too Many Requests` response gracefully:

```typescript
async function callWithRetry(fn: () => Promise<any>, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      if (error.status === 429 && i < maxRetries - 1) {
        const waitMs = Math.pow(2, i) * 1000; // exponential backoff: 1s, 2s, 4s
        await new Promise((resolve) => setTimeout(resolve, waitMs));
        continue;
      }
      throw error;
    }
  }
}
```

---

## 14. Caching

Store computed results to avoid recomputing or re-fetching.

```typescript
// In-memory cache (simplest, good for interview)
const cache = new Map<string, { data: any; expiry: number }>();

async function getCached<T>(
  key: string,
  ttlMs: number,
  compute: () => Promise<T>
): Promise<T> {
  const cached = cache.get(key);
  if (cached && cached.expiry > Date.now()) {
    return cached.data as T;
  }
  const data = await compute();
  cache.set(key, { data, expiry: Date.now() + ttlMs });
  return data;
}

// Usage
const tasks = await getCached("all-tasks", 30_000, () =>
  query<Task>(`SELECT * FROM tasks`)
);
```

### Levels of caching (simplest → most complex)

| Level | What | Survives restart? | Shared across instances? |
|-------|------|-------------------|--------------------------|
| In-memory (`Map`) | Simplest | No | No |
| Redis | Shared cache server | Yes | Yes |
| HTTP headers (`Cache-Control`) | Browser caches responses | N/A | N/A |
| CDN | Edge caches close to users | Yes | Yes |

**Flutter comparison:** You've probably cached API responses in memory or with `shared_preferences`/`hive`. Same concept, server side.

---

## 15. Streaming Responses (Server-Sent Events)

For LLM responses, you don't want to wait for the full response. Stream it word by word — like ChatGPT does.

```typescript
app.get("/api/generate", async (req, res) => {
  // Set headers for streaming
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const stream = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: req.query.prompt as string }],
    stream: true,
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content || "";
    if (content) {
      res.write(`data: ${JSON.stringify({ content })}\n\n`);
    }
  }

  res.write("data: [DONE]\n\n");
  res.end();
});
```

### Frontend consuming the stream

```typescript
const response = await fetch("/api/generate?prompt=Hello");
const reader = response.body!.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  const text = decoder.decode(value);
  // Parse SSE format and update UI
}
```

**Flutter comparison:** Like listening to a Dart `Stream<String>` — data arrives piece by piece. Think `StreamBuilder` updating the UI as chunks arrive.

**🎯 THIS IS VERY RELEVANT for the interview** — they want LLM integration. Streaming the LLM response to the UI word-by-word would be impressive.

---

## 16. Race Conditions

Two requests modifying the same data at the same time:

```
Request A: Read counter (value: 5)
Request B: Read counter (value: 5)
Request A: Write counter = 5 + 1 = 6
Request B: Write counter = 5 + 1 = 6  ← Should be 7!
```

### Solutions

**Atomic operations** — let the database handle it:

```sql
-- ✅ The DB ensures this is atomic, no race condition
UPDATE counters SET value = value + 1 WHERE id = $1;
```

**Optimistic locking** — detect conflicts:

```sql
-- Include a version check — if someone else updated first, this affects 0 rows
UPDATE tasks SET status = 'completed', version = version + 1
WHERE id = $1 AND version = $2;
-- If rowCount = 0, someone else modified it → retry or return conflict (409)
```

**Transactions with proper isolation:**

```typescript
await sql.begin("SERIALIZABLE", async (tx) => {
  const [counter] = await tx`SELECT value FROM counters WHERE id = ${id}`;
  await tx`UPDATE counters SET value = ${counter.value + 1} WHERE id = ${id}`;
});
```

**Flutter analogy:** Like two users editing the same Firestore document simultaneously. Firestore handles this with optimistic concurrency (transactions that retry on conflict). Same concept in SQL.

---

## 17. Workflow Orchestration

**This is DIRECTLY RELEVANT to the interview.** They specifically mention "designing architecture around workflows (series of tasks) orchestration."

A workflow = a sequence of steps that must execute in order, where each step might:
- Call an external API
- Process/transform data
- Call an LLM
- Store results
- Fail and need retry

### Data model

```typescript
interface WorkflowStep {
  id: string;
  type: "fetch" | "transform" | "llm" | "store";
  status: "pending" | "running" | "completed" | "failed";
  input: any;
  output: any;
}

interface Workflow {
  id: string;
  steps: WorkflowStep[];
  currentStep: number;
  status: "running" | "completed" | "failed";
}
```

### Execution engine

```typescript
async function executeWorkflow(workflow: Workflow) {
  for (let i = workflow.currentStep; i < workflow.steps.length; i++) {
    const step = workflow.steps[i];
    try {
      step.status = "running";
      await saveWorkflow(workflow); // persist state (so we can resume on crash)

      step.output = await executeStep(step);
      step.status = "completed";
      workflow.currentStep = i + 1;
      await saveWorkflow(workflow); // persist after each step
    } catch (error) {
      step.status = "failed";
      workflow.status = "failed";
      await saveWorkflow(workflow);
      throw error;
    }
  }
  workflow.status = "completed";
  await saveWorkflow(workflow);
}

async function executeStep(step: WorkflowStep): Promise<any> {
  switch (step.type) {
    case "fetch":
      return await fetch(step.input.url).then((r) => r.json());
    case "transform":
      return transformData(step.input);
    case "llm":
      return await callOpenAI(step.input.prompt);
    case "store":
      return await saveToDatabase(step.input);
  }
}
```

### Key patterns to mention in the interview

- **Persist state after each step** — so you can resume on failure instead of starting over
- **Each step is independent and testable** — single responsibility
- **Status tracking** — the UI can poll or subscribe to show progress
- **Error handling per step** — one failed step doesn't lose the work from previous steps
- **Retry logic** — failed steps can be retried without re-running the whole workflow
- **Step output → next step input** — data flows through the pipeline

---

## 18. Error Handling Patterns (API-level)

### Consistent error response format

```typescript
// Always return errors in the same shape
interface ApiError {
  error: string;
  code: string;
  details?: any;
}

// Custom error classes
class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

class NotFoundError extends Error {
  constructor(resource: string, id: string) {
    super(`${resource} with id '${id}' not found`);
    this.name = "NotFoundError";
  }
}
```

### Centralized error handler (Express middleware)

```typescript
// This goes AFTER all your routes
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof ValidationError) {
    return res.status(400).json({ error: err.message, code: "VALIDATION_ERROR" });
  }
  if (err instanceof NotFoundError) {
    return res.status(404).json({ error: err.message, code: "NOT_FOUND" });
  }
  // Unexpected errors — log and return generic message
  console.error(err);
  res.status(500).json({ error: "Internal server error", code: "INTERNAL_ERROR" });
});
```

This way every error response has the same shape, and you handle errors in one place instead of in every route.

---

## 19. Quick Reference Card

| Concept | What it is | When to mention it | Flutter equivalent |
|---------|-----------|-------------------|-------------------|
| **N+1 Problem** | Querying in a loop instead of batching | Fetching related data | Firestore subcollection per-doc fetches |
| **CORS** | Browser blocks cross-origin requests | Frontend can't reach backend | Doesn't exist in mobile apps |
| **HTTP Status Codes** | Semantic response codes (201, 404, etc.) | Every API response | Same codes, you've seen them from `http`/`dio` |
| **REST Conventions** | Nouns, plurals, proper HTTP methods | API design | Same APIs you've been calling from Flutter |
| **Middleware** | Functions that run before route handlers | Auth, logging, validation | `dio` interceptors |
| **Authentication** | Verifying WHO the user is (JWT, session) | Login/auth flows | `firebase_auth`, token in `SharedPreferences` |
| **Authorization** | Verifying WHAT the user can do | Permission checks | Firebase Security Rules |
| **Environment Variables** | Secrets/config outside code (.env) | API keys, DB URLs | `--dart-define`, `flutter_dotenv` |
| **SQL Injection** | Attacker runs arbitrary SQL via user input | Any database query | Same risk with raw SQLite in `drift` |
| **Idempotency** | Same request twice = same result | POST endpoints, retries | Double-tap "Submit" problem |
| **Database Indexes** | Speed up queries on specific columns | Slow queries | Firestore composite indexes |
| **Transactions** | All-or-nothing database operations | Multi-step writes | Firestore batched writes |
| **Event Loop** | Single-threaded async concurrency | Node.js performance | Dart's event loop (identical concept) |
| **Rate Limiting** | Cap requests per time window | API abuse prevention | No direct equivalent |
| **Caching** | Store results to avoid recomputing | Performance optimization | In-memory cache, `hive`, `shared_preferences` |
| **Streaming (SSE)** | Send data chunk by chunk | LLM responses | `Stream<String>` + `StreamBuilder` |
| **Race Conditions** | Concurrent writes corrupt data | Shared mutable state | Firestore transaction retries |
| **Workflow Orchestration** | Sequential steps with state persistence | The interview topic! | No direct equivalent |
| **Error Handling** | Consistent error format + centralized handler | Every API | Custom exceptions + `try`/`catch` |

---

## Interview Tips

1. **If you see a loop with a query inside** → mention N+1 and suggest a JOIN or batch
2. **If the frontend can't reach the backend** → check CORS
3. **Always use parameterized queries** → never concatenate SQL strings
4. **Use specific HTTP status codes** → 201 for creation, 404 for not found
5. **Persist workflow state after each step** → shows you think about failure recovery
6. **Stream LLM responses** → don't make the user wait for the full response
7. **Validate environment variables at startup** → fail fast if config is missing
