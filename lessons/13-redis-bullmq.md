# 13 - Redis & BullMQ — Caching, Queues, and Real-Time Messaging

Redis is the infrastructure layer that powers caching, job queues, rate limiting, and pub/sub messaging in most production TypeScript backends. BullMQ builds on Redis to give you durable, retryable job processing.

This lesson covers Redis fundamentals, practical caching and rate limiting patterns, and production job queue design with BullMQ.

---

## 1) What is Redis?

Redis is an in-memory key-value data store that runs as a separate server process.

Key properties:

- **Sub-millisecond reads/writes** because everything lives in RAM
- **Data structures built in** — not just strings, but hashes, lists, sets, sorted sets
- **Expiration (TTL)** on any key — data can auto-delete after a time window
- **Pub/sub messaging** — broadcast messages between server instances
- **Single-threaded event loop** — no lock contention, operations are atomic

**Flutter analogy:** think of `shared_preferences` but shared across all your backend servers, with expiration, rich data structures, and running on a separate machine.

**Not a replacement for PostgreSQL.** Redis is complementary:

| Concern | PostgreSQL | Redis |
|---|---|---|
| Role | Source of truth | Fast access layer |
| Storage | Disk (durable) | RAM (volatile by default) |
| Query model | SQL, joins, indexes | Key-based lookup, data structures |
| Use case | Persistent business data | Caching, queues, sessions, counters |

---

## 2) When to Use Redis (and When Not)

### Use Redis for

- **Caching** — API responses, DB query results, LLM outputs
- **Session storage** — user sessions shared across server instances
- **Rate limiting** — count requests per IP within a time window
- **Job queues** — BullMQ uses Redis as its backing store
- **Pub/sub messaging** — broadcast events between services
- **Leaderboards / counters** — sorted sets with atomic increments
- **Distributed locks** — coordinate access across multiple processes

### Don't use Redis for

- **Primary data storage** — it's in-memory, data loss risk on restart without persistence
- **Complex queries** — no SQL, no joins, no ad-hoc filtering
- **Large datasets that don't fit in RAM** — Redis stores everything in memory

---

## 3) Setup

### Install Redis

```bash
# macOS
brew install redis
brew services start redis

# Docker (recommended for consistency)
docker run --name redis -p 6379:6379 -d redis:7

# Verify
redis-cli ping  # should return PONG
```

### Install the Node.js client

```bash
npm install ioredis
```

`ioredis` is the production-standard Redis client for Node.js — it supports clustering, sentinels, pipelining, and Lua scripting.

---

## 4) Core Operations

```typescript
import Redis from "ioredis";

const redis = new Redis(); // localhost:6379 by default
// or: new Redis(process.env.REDIS_URL)
```

### Strings (most basic — like a `Map<string, string>`)

```typescript
// Set a value
await redis.set("user:123", JSON.stringify({ name: "Alice", role: "admin" }));

// Set with expiration (TTL)
await redis.set("user:123", JSON.stringify(data), "EX", 3600); // expires in 1 hour

// Get a value
const user = JSON.parse((await redis.get("user:123")) ?? "null");
```

### Key management

```typescript
// Check existence
await redis.exists("user:123"); // 1 (exists) or 0 (doesn't)

// Delete
await redis.del("user:123");

// TTL (time to live)
await redis.ttl("user:123"); // seconds remaining, -1 = no expiry, -2 = key doesn't exist

// Set expiry on existing key
await redis.expire("user:123", 600); // 10 minutes from now
```

---

## 5) Data Structures

Redis isn't just key-value strings — it has built-in data structures that map to common backend needs.

### Hash (structured data without JSON serialization)

```typescript
await redis.hset("user:123", { name: "Alice", role: "admin", loginCount: "5" });
await redis.hget("user:123", "name");        // "Alice"
await redis.hgetall("user:123");             // { name: "Alice", role: "admin", loginCount: "5" }
await redis.hincrby("user:123", "loginCount", 1); // atomic increment → 6
```

### List (queue or stack)

```typescript
await redis.lpush("queue:emails", "email1", "email2"); // push left
await redis.rpop("queue:emails");                        // pop right (FIFO queue)
await redis.lrange("queue:emails", 0, -1);              // get all items
```

### Set (unique values)

```typescript
await redis.sadd("online:users", "user:123", "user:456");
await redis.sismember("online:users", "user:123"); // 1 (true)
await redis.smembers("online:users");                // ["user:123", "user:456"]
```

### Sorted Set (leaderboard)

```typescript
await redis.zadd("leaderboard", 100, "alice", 85, "bob", 120, "charlie");
await redis.zrevrange("leaderboard", 0, 9);          // top 10, highest first
await redis.zincrby("leaderboard", 5, "alice");      // add 5 points to alice
await redis.zrank("leaderboard", "alice");            // rank (0-indexed, lowest first)
```

### Data structure mapping

| Redis structure | TypeScript equivalent | Use case |
|---|---|---|
| String | `Map<string, string>` | Cache, sessions, simple values |
| Hash | `Record<string, string>` | User profiles, config, structured data |
| List | `Array<string>` | Message queues, activity feeds |
| Set | `Set<string>` | Online users, tags, unique tracking |
| Sorted Set | `Map<string, number>` sorted by value | Leaderboards, priority queues, time-series |

---

## 6) Caching Patterns

### Cache-aside (most common)

The application checks the cache first, falls back to the database on miss, and populates the cache for next time.

```typescript
async function getUser(id: string): Promise<User> {
  // 1. Check cache
  const cached = await redis.get(`user:${id}`);
  if (cached) return JSON.parse(cached);

  // 2. Cache miss — fetch from DB
  const user = await db.query("SELECT * FROM users WHERE id = $1", [id]);

  // 3. Store in cache with TTL
  await redis.set(`user:${id}`, JSON.stringify(user), "EX", 300); // 5 min

  return user;
}
```

### Cache invalidation (the hard part)

> "There are only two hard things in computer science: cache invalidation and naming things."

When data changes, delete the stale cache entry:

```typescript
async function updateUser(id: string, data: Partial<User>): Promise<User> {
  const user = await db.query(
    "UPDATE users SET name = $1 WHERE id = $2 RETURNING *",
    [data.name, id],
  );

  // Invalidate cache — next read will repopulate
  await redis.del(`user:${id}`);

  return user;
}
```

### Other patterns (brief overview)

- **Write-through:** write to cache and DB simultaneously — cache is always fresh, but every write pays the cache cost
- **Read-through:** cache itself fetches from DB on miss — requires a caching layer that supports it
- **Stale-while-revalidate:** serve stale data immediately, refresh in background — good for high-traffic endpoints where slight staleness is acceptable

---

## 7) Rate Limiting with Redis

Redis atomic increment + expiration makes rate limiting straightforward:

```typescript
async function isRateLimited(
  ip: string,
  limit: number,
  windowSec: number,
): Promise<boolean> {
  const key = `ratelimit:${ip}`;
  const current = await redis.incr(key);

  if (current === 1) {
    // First request in this window — set expiration
    await redis.expire(key, windowSec);
  }

  return current > limit;
}
```

### Express middleware

```typescript
app.use(async (req, res, next) => {
  if (await isRateLimited(req.ip, 100, 60)) {
    // 100 requests per minute
    return res.status(429).json({ error: "Too many requests" });
  }
  next();
});
```

---

## 8) Pub/Sub (Real-Time Messaging)

Redis pub/sub lets one server publish a message and all subscribed servers receive it instantly.

```typescript
// Publisher (one Redis connection)
const pub = new Redis();
await pub.publish(
  "notifications",
  JSON.stringify({ userId: "123", message: "New task assigned" }),
);

// Subscriber (must be a DIFFERENT connection — subscribe blocks the connection)
const sub = new Redis();
sub.subscribe("notifications");
sub.on("message", (channel, message) => {
  const data = JSON.parse(message);
  console.log(`Channel ${channel}:`, data);
});
```

**Important:** a Redis connection in subscribe mode can only listen — it cannot run other commands. Always use separate connections for pub and sub.

**Flutter analogy:** like Dart `Stream<T>` but across multiple server instances. One server publishes, all subscribed servers receive.

---

## 9) BullMQ — Production Job Queues

### What is BullMQ?

BullMQ is a Redis-based job queue library for Node.js. It separates job creation (producer) from job execution (worker).

Built-in capabilities:

- Retries with exponential backoff
- Delayed and scheduled jobs
- Job priorities
- Concurrency control
- Rate limiting
- Job progress tracking
- Dead letter queues
- Repeatable jobs (cron)

**Flutter analogy:** like `WorkManager` on Android or `BGTaskScheduler` on iOS, but for backend services — durable, retryable background processing.

### Setup

```bash
npm install bullmq
```

### Basic producer and worker

```typescript
import { Queue, Worker, Job } from "bullmq";

const connection = { host: "localhost", port: 6379 };

// Producer: add jobs to the queue
const emailQueue = new Queue("emails", { connection });

await emailQueue.add("send-welcome", {
  to: "alice@example.com",
  subject: "Welcome!",
  body: "Thanks for signing up",
});

// Worker: process jobs from the queue
const worker = new Worker(
  "emails",
  async (job: Job) => {
    console.log(`Sending email to ${job.data.to}`);
    await sendEmail(job.data);
    console.log(`Email sent: ${job.id}`);
  },
  {
    connection,
    concurrency: 5, // process 5 jobs simultaneously
  },
);

worker.on("completed", (job) => console.log(`Job ${job.id} completed`));
worker.on("failed", (job, err) => console.error(`Job ${job?.id} failed:`, err));
```

---

## 10) BullMQ Advanced Patterns

### Retries with backoff

```typescript
await emailQueue.add("send-welcome", data, {
  attempts: 3,
  backoff: {
    type: "exponential",
    delay: 1000, // 1s, 2s, 4s
  },
});
```

### Delayed jobs

```typescript
// Send reminder in 24 hours
await reminderQueue.add("send-reminder", data, {
  delay: 24 * 60 * 60 * 1000,
});
```

### Job priorities

```typescript
await queue.add("critical-task", data, { priority: 1 }); // processed first
await queue.add("normal-task", data, { priority: 10 }); // processed later
```

### Rate limiting on the worker

```typescript
const worker = new Worker("api-calls", processor, {
  connection,
  limiter: {
    max: 10, // max 10 jobs
    duration: 1000, // per second
  },
});
```

### Job progress tracking

```typescript
const worker = new Worker(
  "import",
  async (job) => {
    const items = job.data.items;
    for (let i = 0; i < items.length; i++) {
      await processItem(items[i]);
      await job.updateProgress(Math.round((i / items.length) * 100));
    }
  },
  { connection },
);

// Check progress from another service
const job = await Job.fromId(queue, jobId);
console.log(job.progress); // 45
```

### Repeatable jobs (cron)

```typescript
await queue.add(
  "daily-report",
  {},
  {
    repeat: {
      pattern: "0 9 * * *", // every day at 9 AM
    },
  },
);
```

---

## 11) BullMQ for Workflow Orchestration

BullMQ can chain dependent jobs using `FlowProducer` — this connects directly to the patterns from lesson 12.

```typescript
import { FlowProducer } from "bullmq";

const flow = new FlowProducer({ connection });

await flow.add({
  name: "store-results",
  queueName: "storage",
  data: {},
  children: [
    {
      name: "analyze-with-llm",
      queueName: "llm",
      data: {},
      children: [
        {
          name: "fetch-data",
          queueName: "fetcher",
          data: { url: "https://api.example.com/data" },
        },
      ],
    },
  ],
});
// Execution order: fetch-data → analyze-with-llm → store-results
```

Children must complete before their parent starts. Each job in the flow gets its own retry policy, worker, and concurrency settings.

---

## 12) BullMQ Dashboard

Bull Board gives you a visual UI for monitoring queues, jobs, and failures.

```bash
npm install @bull-board/express @bull-board/api
```

```typescript
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath("/admin/queues");

createBullBoard({
  queues: [new BullMQAdapter(emailQueue), new BullMQAdapter(importQueue)],
  serverAdapter,
});

app.use("/admin/queues", serverAdapter.getRouter());
// Visit http://localhost:3000/admin/queues
```

This gives you real-time visibility into job counts, failure reasons, retry history, and processing rates.

---

## 13) Production Considerations

### Redis persistence

- **RDB snapshots** — periodic point-in-time snapshots to disk (default). Fast recovery, but you lose data since last snapshot.
- **AOF (append-only file)** — logs every write operation. More durable, slower recovery.
- **RDB + AOF** — use both for best durability with reasonable recovery time.

### High availability

- **Redis Sentinel** — automatic failover with master/replica monitoring
- **Redis Cluster** — horizontal scaling across multiple nodes with automatic sharding

### Memory management

- Set `maxmemory` in Redis config to prevent OOM
- Choose an eviction policy: `allkeys-lru` (evict least recently used) is a safe default for caches
- Monitor memory usage with `redis-cli info memory`

### BullMQ production checklist

- Always handle `failed` events — unhandled failures are silent
- Use dead letter queues for jobs that exhaust all retries
- Use separate Redis connections for Queue and Worker (BullMQ recommendation)
- Implement graceful shutdown — close workers before process exits:

```typescript
process.on("SIGTERM", async () => {
  await worker.close(); // finish current jobs, stop accepting new ones
  await redis.quit();
  process.exit(0);
});
```

---

## 14) Redis + BullMQ Cheat Sheet

### Redis quick reference

| Operation | Command | Notes |
|---|---|---|
| Set value | `redis.set(key, value)` | Strings only — JSON.stringify objects |
| Set with TTL | `redis.set(key, value, "EX", seconds)` | Always set TTL on cache keys |
| Get value | `redis.get(key)` | Returns `null` if missing |
| Delete | `redis.del(key)` | Invalidate cache |
| Increment | `redis.incr(key)` | Atomic — safe for counters |
| Hash set | `redis.hset(key, field, value)` | Structured data without JSON |
| Hash get all | `redis.hgetall(key)` | Returns object |
| Sorted set add | `redis.zadd(key, score, member)` | Leaderboards |
| Publish | `redis.publish(channel, message)` | Pub/sub |
| Subscribe | `redis.subscribe(channel)` | Blocks connection |

### BullMQ quick reference

| Operation | Code | Notes |
|---|---|---|
| Create queue | `new Queue(name, { connection })` | One queue per job type |
| Add job | `queue.add(name, data, opts)` | Returns Job instance |
| Create worker | `new Worker(name, processor, opts)` | Matches queue by name |
| Retry config | `{ attempts: 3, backoff: { type: "exponential", delay: 1000 } }` | Job options |
| Delay job | `{ delay: ms }` | Job options |
| Priority | `{ priority: number }` | Lower = higher priority |
| Cron job | `{ repeat: { pattern: "cron expression" } }` | Repeatable |
| Flow | `new FlowProducer({ connection })` | Dependent job chains |

---

## 15) Flutter/Dart Mapping

| Flutter/Dart concept | Redis/BullMQ equivalent |
|---|---|
| `shared_preferences` | Redis strings (`get`/`set`) |
| `hive` boxes | Redis hashes |
| `Stream<T>` | Redis pub/sub |
| `WorkManager` / `BGTaskScheduler` | BullMQ Worker |
| `Isolate` for heavy computation | BullMQ job in separate worker process |
| `cached_network_image` | Redis cache-aside pattern |
| `Cubit`/`BLoC` event processing | BullMQ job processing with state transitions |
| `retry` package | BullMQ retry with exponential backoff |

These analogies help with onboarding, but remember: backend queues must handle process restarts, at-least-once delivery, and distributed coordination that client-side patterns don't face.

---

## 16) Pitfalls

1. **Redis is in-memory** — if it restarts without persistence configured, all data is gone. Enable RDB or AOF for anything you can't afford to lose.

2. **Cache stampede** — when a popular cache key expires, hundreds of requests hit the DB simultaneously. Mitigate with stale-while-revalidate or a distributed lock (only one request refreshes the cache).

3. **BullMQ requires Redis** — no Redis server, no queues. Your job processing is coupled to Redis availability.

4. **Don't store large blobs in Redis** — it's RAM. A 50MB file in Redis is 50MB of memory gone. Store blobs in S3/disk, store the reference in Redis.

5. **Always set TTL on cache keys** — without expiration, cache keys accumulate forever and eventually consume all available memory.

6. **BullMQ job data must be JSON-serializable** — no functions, no class instances, no circular references. Serialize to plain objects before adding to the queue.

7. **Pub/sub messages are fire-and-forget** — if no subscriber is listening when a message is published, it's lost. For durable messaging, use BullMQ queues instead.

---

## 17) Practice Tasks

1. **Cache-aside pattern.** Set up Redis locally. Write a function that caches PostgreSQL query results in Redis with a 5-minute TTL. Verify that the second call returns from cache (check with `redis-cli MONITOR`).

2. **Rate limiter middleware.** Build an Express middleware that limits each IP to 100 requests per minute using Redis `INCR` and `EXPIRE`. Return 429 when the limit is exceeded. Write tests that verify the limit resets after the window.

3. **Email queue with retries.** Create a BullMQ queue for sending emails. Add a worker with `concurrency: 3` and retry config (3 attempts, exponential backoff). Simulate failures and verify retry behavior.

4. **Job progress API.** Create a BullMQ job that processes a list of items with progress tracking. Expose a `GET /jobs/:id/progress` endpoint that returns the current progress percentage.

5. **Workflow chain.** Use `FlowProducer` to chain three jobs: fetch data → transform data → store results. Verify that each job only starts after its dependency completes.

---

**Previous:** [12-workflow-orchestration.md](./12-workflow-orchestration.md) - Workflow Orchestration  
**Next:** [14-microservices-devops.md](./14-microservices-devops.md) - Microservices and DevOps
