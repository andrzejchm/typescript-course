# 10 - Essential Libraries

This lesson organizes the TypeScript backend ecosystem by responsibility, not hype. Pick tools that reduce risk in production and make operational behavior explicit.

---

## 1. Runtime and Application Framework

### Runtime

- **Node.js LTS**: default runtime for most TS services
- **Bun**: fast startup and tooling, but check ecosystem compatibility before adoption

### HTTP Framework

- **Express**: minimal, stable, huge ecosystem
- **Fastify**: stronger type integration and better baseline throughput

Decision heuristic:

- choose **Express** when ecosystem familiarity and plugin availability are primary
- choose **Fastify** when performance and strict request/response typing are primary

---

## 2. Transport Layer (HTTP, RPC, GraphQL)

### HTTP server concerns

- **cors**: explicit browser-origin policy
- **helmet**: secure headers defaults
- **express-rate-limit** or gateway-level policies: abuse protection

### External HTTP clients

- **native `fetch`**: good baseline, no extra dependency
- **axios**: interceptors and richer error ergonomics
- **undici**: low-level performance-focused HTTP client

Decision heuristic:

- start with `fetch`
- adopt `axios` when you need request/response interceptors at scale
- adopt `undici` when you need transport-level throughput tuning

### GraphQL transport

- **graphql-yoga** or **Apollo Server** for GraphQL endpoints
- pair with complexity limits, persisted queries, and request-scoped DataLoaders

---

## 3. Validation and Contract Enforcement

Validation belongs at boundaries: environment startup, incoming requests, external API responses, and message queues.

- **zod**: runtime validation + TS inference, great for API boundaries
- **valibot**: lightweight alternative with strong parsing performance
- **envalid** or **zod**: env var validation at startup

Decision heuristic:

- use one validation library consistently across the service
- fail startup if required config is missing or malformed
- reject invalid input with stable error contracts (`422` + machine-readable details)

---

## 4. Data Access and Storage

### PostgreSQL drivers and query layers

- **pg**: direct SQL control, predictable behavior
- **postgres.js**: ergonomic tagged-template SQL

### ORM / query builders

- **Prisma**: schema-driven DX, migrations, strong team onboarding
- **Drizzle**: SQL-forward approach with typed query builder
- **Kysely**: composable typed SQL builder without full ORM behavior

Decision heuristic:

- choose **Prisma** for fast team delivery and standardized migrations
- choose **Drizzle/Kysely** for SQL-first teams that want tighter query control
- keep complex queries explicit even when using an ORM

Production non-negotiables:

- migrations in source control
- transactions for multi-step writes
- unique constraints for idempotency and data integrity
- query review with `EXPLAIN ANALYZE` on hot paths

---

## 5. Jobs, Workflows, and Async Processing

Use queues when work is slow, retryable, or not required for synchronous API latency.

- **BullMQ**: Redis-backed jobs, retries, delay, dead-letter patterns
- **Temporal**: durable long-running workflows with replayable state
- **Inngest**: event-driven workflow ergonomics with hosted model options

Decision heuristic:

- use **BullMQ** for straightforward background jobs
- use **Temporal** for critical multi-step workflows with compensation/retry semantics
- keep queue payloads schema-validated and versioned

---

## 6. Observability (Logs, Metrics, Traces)

If you cannot observe it, you cannot operate it.

- **pino**: structured JSON logs with low overhead
- **OpenTelemetry**: traces/metrics/log correlations across services
- **Prometheus + Grafana**: metrics storage and dashboards
- **Sentry**: error monitoring and release tracking

Decision heuristic:

- emit structured logs with request IDs and correlation IDs
- track saturation metrics (CPU, memory, queue depth, DB pool usage)
- add tracing to API -> DB -> external dependency flows

---

## 7. Reliability and Resilience Utilities

Common resilience patterns and supporting libraries:

- **Retries with backoff + jitter**: `p-retry` or custom policy
- **Circuit breaking**: `opossum` for unstable dependencies
- **Caching**: `ioredis` for shared cache, bounded in-memory cache for local hot keys
- **Idempotency stores**: Redis/Postgres table keyed by `Idempotency-Key`

Decision heuristic:

- retry only transient failures (`429`, `503`, network timeout)
- never retry non-idempotent operations without idempotency keys
- expire cache entries intentionally; stale data is a correctness risk

---

## 8. Tooling and Developer Workflow

- **TypeScript** (`tsc --noEmit`) for strict type safety
- **eslint** + **prettier** for consistency
- **tsx** for local TypeScript execution
- **vitest** or **jest** for tests
- **supertest** for HTTP integration tests
- **testcontainers** for realistic DB integration tests

Quality gates for production repositories:

- formatting, lint, typecheck, tests in CI
- migration check in CI
- dependency audit and lockfile review

---

## 9. Selection Playbook

When evaluating a new library, score it on:

- operational risk (security posture, maintenance cadence)
- compatibility with your runtime and deployment platform
- performance profile under expected load
- observability hooks and failure transparency
- migration/exit cost if you replace it later

Prefer boring, well-supported defaults unless a measurable constraint demands change.

---

## 10. Suggested Baseline Stack

A practical default for production TypeScript APIs:

- Runtime: Node.js LTS
- HTTP: Express
- Validation: Zod
- Data: PostgreSQL + Prisma or pg
- Queue: BullMQ (add Temporal when workflow complexity grows)
- Observability: Pino + OpenTelemetry + Sentry
- Tooling: TypeScript strict mode, ESLint, Prettier, Vitest, Testcontainers

This baseline covers most backend services without premature complexity.

---

**Previous:** [09-graphql-basics.md](./09-graphql-basics.md) - GraphQL Basics  
**Next:** [11-postgresql-basics.md](./11-postgresql-basics.md) - PostgreSQL Basics
