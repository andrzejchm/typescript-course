# 15 - Microservices and DevOps for TypeScript Production Systems

If you are coming from Flutter, think of this lesson as the backend equivalent of moving from one app with a few screens to a platform with multiple apps, background workers, feature teams, and strict release safety.

For interviews and real systems, the key is not "microservices everywhere." The key is making clear tradeoffs and choosing the simplest architecture that survives production traffic.

---

## 1. When to choose monolith vs microservices

Most teams should start with a **modular monolith**:

- one deployable service
- clear internal modules (`auth`, `billing`, `notifications`)
- one shared repo and fast local development
- fewer distributed-system failures early on

Why this is usually better first:

- lower operational cost (fewer pipelines, dashboards, incidents)
- easier refactoring while product requirements are still changing
- simpler debugging (one process, one call stack)
- smaller team can move faster

What microservices give you later:

- independent scaling per domain
- stronger team ownership boundaries
- isolated failure domains (a broken notification flow should not kill checkout)

Cost/complexity tradeoff:

- **Monolith pain**: slower deploys, tighter coupling, shared blast radius
- **Microservice pain**: network failures, eventual consistency, platform overhead, higher DevOps burden

Decision checklist:

1. Do we have clear bounded contexts with low overlap?
2. Do we have 3+ teams needing independent release cycles?
3. Is one domain scaling very differently from the rest?
4. Do we have incident response maturity (on-call, monitoring, runbooks)?
5. Can we afford platform investment (CI/CD, observability, security controls)?

If 3+ answers are "yes," microservices are often reasonable. If not, keep a modular monolith and improve boundaries first.

---

## 2. Core microservices concepts

- **Service boundaries (bounded contexts):** split by business capability, not by technical layer. Good: `orders-service`, `payments-service`. Bad: `controllers-service`, `database-service`.
- **Stateless services:** avoid request-specific in-memory state so any instance can serve any request.
- **API gateway / BFF:** single edge entry for auth, routing, rate limits, and response shaping. For mobile, BFF is like creating one endpoint optimized for the app screen model.
- **Synchronous calls (REST/gRPC):** good for immediate responses; increases coupling and latency chain.
- **Async messaging (queues/events):** good for decoupling, retries, and spike smoothing; adds eventual consistency complexity.
- **Eventual consistency:** data across services converges over time, not in one DB transaction.

---

## 3. Recommended service architecture for TypeScript at this scale

Practical baseline for hundreds/thousands of active users:

- **Edge/API Gateway**: auth checks, rate limiting, request routing, coarse caching
- **Auth Service**: identity, tokens, session policies
- **Core Domain Services**: users, orders, billing, catalog, etc.
- **Worker Services**: async jobs (emails, exports, webhooks, reconciliations)
- **Queue/Broker**: SQS/RabbitMQ/Kafka/NATS for events and commands
- **Cache**: Redis for hot reads, token/session metadata, rate limit counters
- **Databases**: Postgres/MySQL per service boundary
- **Object Storage**: S3/GCS for files, reports, media
- **Config/Secrets**: parameter store + secrets manager, never hardcoded

Text architecture diagram:

```text
Clients (Mobile/Web)
        |
        v
[API Gateway / BFF]
   |        |         \
   v        v          v
[Auth]   [Orders]   [Catalog]  ... Core services
   |         |           |
   |         +----+------+---------+
   |              |                |
   v              v                v
[Redis]      [Service DBs]    [Object Storage]
                  |
                  v
            [Queue / Broker] <---- [Webhook Ingest]
                  |
                  v
             [Worker Services]
```

---

## 4. Communication patterns

Use the simplest pattern that satisfies the requirement:

| Pattern | Use it when | Avoid when |
|--------|-------------|------------|
| **Request/response** (REST/gRPC) | Caller needs immediate answer (login, price quote) | Long-running/fragile workflows |
| **Pub/sub events** | Multiple consumers react independently (`order.created`) | You need strict immediate consistency |
| **Command queue** | One worker should process a task reliably (`generate-report`) | Fan-out to many independent consumers |
| **Webhooks** | Integrating external systems | You cannot verify signatures/retries/idempotency |

Rule of thumb:

- interactive user flow -> request/response
- background side effects -> queue/event
- external callbacks -> webhook + idempotency + signature validation

---

## 5. Data consistency patterns

- **Database per service:** each service owns its schema and writes.
- **Outbox pattern:** write domain state + event record in the same transaction, then publish from outbox asynchronously.
- **Saga pattern:** coordinate multi-service business flows.
  - **Orchestration:** central coordinator decides next step.
  - **Choreography:** services react to each other's events.
- **Idempotency + deduplication keys:** ensure retries do not create duplicate side effects.
- **Avoid N+1/chatty calls:** never build APIs that chain many service calls per request if they can be pre-joined, cached, or projected.

Interview line:

"I assume at-least-once delivery and design idempotent handlers with dedupe keys."

---

## 6. Resilience patterns for production

- **Timeouts:** every outbound call has a hard limit.
- **Retries:** only for transient errors, with exponential backoff + jitter.
- **Circuit breaker:** stop hammering unhealthy dependencies.
- **Bulkheads:** isolate resources (thread pools/queues) per dependency.
- **Rate limiting/throttling:** protect services and downstream systems.
- **Dead-letter queue (DLQ):** quarantine poison messages after retry exhaustion.
- **Graceful shutdown:** stop accepting new work, finish in-flight, close connections.
- **Health checks:**
  - liveness: "is process alive?"
  - readiness: "can process serve traffic now?"

Retry helper example:

```typescript
type RetryOptions = {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
};

function computeBackoffWithJitterMs(attempt: number, baseDelayMs: number, maxDelayMs: number): number {
  const backoff = Math.min(maxDelayMs, baseDelayMs * 2 ** (attempt - 1));
  const jitter = Math.floor(Math.random() * 200);
  return backoff + jitter;
}

export async function retry<T>(fn: () => Promise<T>, options: RetryOptions): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= options.maxAttempts; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt === options.maxAttempts) {
        break;
      }

      const delayMs = computeBackoffWithJitterMs(attempt, options.baseDelayMs, options.maxDelayMs);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}
```

Health endpoint example:

```typescript
import type { Request, Response } from "express";

export async function readinessHandler(_req: Request, res: Response): Promise<void> {
  const dependenciesOk = true; // replace with DB/cache checks
  if (!dependenciesOk) {
    res.status(503).json({ status: "not_ready" });
    return;
  }

  res.status(200).json({ status: "ready" });
}
```

Graceful shutdown example:

```typescript
import type { Server } from "http";

export function attachGracefulShutdown(server: Server, closeResources: () => Promise<void>): void {
  const shutdown = async (signal: string): Promise<void> => {
    console.log(`Received ${signal}, shutting down gracefully`);
    server.close(async () => {
      await closeResources();
      process.exit(0);
    });

    setTimeout(() => {
      console.error("Forced shutdown after timeout");
      process.exit(1);
    }, 15_000).unref();
  };

  process.on("SIGTERM", () => {
    void shutdown("SIGTERM");
  });
  process.on("SIGINT", () => {
    void shutdown("SIGINT");
  });
}
```

---

## 7. DevOps foundations for TypeScript services

Docker basics for Node/TS:

- multi-stage builds (`builder` then lightweight runtime)
- pin Node version and use non-root user
- keep image small and deterministic

12-factor mindset:

- config in environment variables
- logs to stdout/stderr
- stateless processes, disposable instances
- parity between dev/stage/prod environments

Config and secrets:

- use env vars for non-sensitive config
- use secrets manager for credentials/keys
- rotate secrets and audit access

CI/CD pipeline stages:

1. lint + type-check
2. unit/integration tests
3. build artifact/container image
4. dependency + container security scan
5. deploy to staging
6. smoke tests
7. progressive prod deploy

Deployment strategies:

- **Rolling:** simple default, good for most services
- **Blue-green:** safer switchovers for high-risk releases
- **Canary:** expose to small traffic percent first, monitor error/latency

Rollback strategy:

- keep last known good artifact ready
- roll back fast on SLO breach
- ensure schema changes are backward-compatible before rollout

---

## 8. Runtime platform choices

| Platform | Best for | Tradeoffs |
|----------|----------|-----------|
| **Kubernetes** | Larger teams, many services, advanced routing/scaling needs | Highest operational complexity |
| **ECS/Fargate** | AWS teams wanting less ops overhead than K8s | Some platform constraints, AWS-centric |
| **Serverless** (Lambda/Cloud Functions) | Spiky workloads, small teams, event-driven APIs/jobs | Cold starts, execution limits, local debug complexity |

Simple recommendation matrix:

- **1-2 backend engineers, early product:** serverless or ECS/Fargate
- **3-8 engineers, moderate scale:** ECS/Fargate or managed K8s
- **many teams, platform engineering function:** Kubernetes

---

## 9. Observability + SLOs

Three pillars:

- **Logs**: structured logs with `requestId`, `userId`, `service`, `version`
- **Metrics**: request count, latency percentiles, queue depth, error rates
- **Traces**: end-to-end request path across services

Golden signals:

- **Latency**
- **Traffic**
- **Errors**
- **Saturation**

SLO/SLI basics:

- **SLI:** measured signal (example: p95 latency under 300 ms)
- **SLO:** target over time window (example: 99.9% successful requests in 30 days)
- alert on sustained SLO burn rate, not single noisy spikes

---

## 10. Security essentials

- TLS everywhere (external and internal traffic)
- validate JWT at edge and re-check critical claims in services
- mTLS or service-to-service auth for internal calls
- least privilege IAM (service can access only required resources)
- dependency and container scanning in CI
- signed webhooks + replay protection
- audit logging for auth/admin actions

---

## 11. Cost/performance levers

- horizontal scaling with autoscaling policies tied to CPU/latency/queue depth
- database connection pooling (`pg` pool + PgBouncer)
- caching layers:
  - in-memory for tiny hot data
  - Redis for shared hot data/session/rate limits
  - CDN for static and cacheable API responses
- queue-based smoothing to absorb spikes and protect core DB
- right-size instances and set resource limits to avoid noisy-neighbor effects

---

## 12. TypeScript-specific best practices

- maintain a **shared contracts package** (schemas/types), but keep it focused
- use **runtime validation** at service boundaries (for example, with Zod)
- do not create a giant shared `utils` package that couples every service
- version APIs/events and keep backward compatibility during rollout windows
- keep strict TypeScript settings enabled for all services

---

## 13. Production-ready starter checklist

1. Clear service ownership and on-call rotation
2. Health endpoints (`/livez`, `/readyz`)
3. Timeouts on all outbound calls
4. Retries with backoff + jitter where safe
5. Idempotency keys for external side effects
6. Dead-letter queue configured
7. Structured logging with correlation IDs
8. Metrics dashboard for golden signals
9. Distributed tracing enabled
10. SLOs defined per critical endpoint
11. Rate limiting at edge
12. Secrets manager integrated (no plaintext secrets in repo)
13. Dependency and container scanning in CI
14. Zero-downtime deploy strategy tested
15. Rollback runbook documented and practiced
16. Database migrations backward-compatible

---

## 14. Interview talk track (60 seconds)

"I start with a modular monolith until team and scaling pressure justify splitting by bounded contexts. As traffic grows, I add an API gateway, independent domain services, async workers, Redis cache, and a broker for events/commands. I treat all distributed workflows as at-least-once, so I use idempotency keys, outbox, and saga patterns for consistency. In production, I prioritize resilience with timeouts, retries, circuit breakers, DLQ, and graceful shutdown. I ship through CI/CD with tests and security scans, deploy progressively with canary or rolling releases, and manage reliability through logs, metrics, traces, and SLO-driven alerts." 

---

## 15. Flutter/Dart mapping table

| Microservices/DevOps concept | Flutter/Dart analogy |
|-----------------------------|----------------------|
| API gateway / BFF | Screen-specific repository/adapter for one app surface |
| Bounded context | Feature module boundary (`auth`, `checkout`, `profile`) |
| Stateless service instance | Rebuildable widget instance with state externalized |
| Queue + worker | Background isolate processing tasks |
| Pub/sub event | `Stream` updates consumed by multiple listeners |
| Saga compensation | Undo/rollback flow across multiple async steps |
| Idempotency key | Prevent duplicate button tap side effect |
| Circuit breaker | Short-circuit failed dependency to protect UX |
| Health readiness | App readiness gate before enabling interactions |
| Canary deployment | Gradual rollout in app store feature flag cohorts |

Use this mapping in interviews when you need to explain backend architecture from a mobile-first perspective.
