# Lesson 17: Production Exercises

Build this sequence as one progressive backend project. Each phase adds production concerns, not just language features.

---

## How to Work Through This Lesson

1. Start from a clean branch of your course project.
2. Complete exercises in order.
3. Keep each phase releasable (tests green, no TODO stubs on critical paths).
4. Treat acceptance criteria as required behavior, not suggestions.

Recommended commands (adapt to your project scripts):

```bash
npm run typecheck
npm run lint
npm test
```

---

## Quality Gates (Apply to Every Exercise)

- **Type safety**: strict TypeScript passes with no ignored errors.
- **Boundary validation**: request payloads and env vars validated at runtime.
- **Error consistency**: all failures use one response envelope and stable codes.
- **Observability basics**: structured logs include request ID and route latency.
- **Verification evidence**: include commands run and outcomes.

Do not move to the next phase until all gates pass.

---

## Exercise Progression

| Phase | Focus | Main Deliverable |
|---|---|---|
| 01 | Service foundation | Express app skeleton with versioned routing and health endpoints |
| 02 | Validation and errors | Centralized validation and error middleware with stable contracts |
| 03 | PostgreSQL integration | CRUD with parameterized SQL, migrations, and indexes |
| 04 | Transactional workflows | Multi-step operation wrapped in transaction with rollback safety |
| 05 | Resilience | Rate limiting, retry policy, timeout budgets, idempotency keys |
| 06 | Async processing | Queue-backed background jobs with retry and dead-letter handling |
| 07 | GraphQL layer | GraphQL API with DataLoader and schema governance rules |
| 08 | Operational hardening | Graceful shutdown, readiness checks, dashboards/alerts checklist |

---

## Detailed Exercises

### 01 - Service Foundation

Create a maintainable API skeleton:

- `src/app.ts` for middleware and routes
- `src/server.ts` for startup/shutdown
- `/api/v1` route namespace
- `/health` and `/ready` endpoints

Acceptance criteria:

- app starts and serves `GET /health` with `200`
- route namespace is versioned (`/api/v1/...`)
- app module can be imported in tests without opening a port

How to verify:

- run service locally and call `GET /health`
- run integration test that imports app and asserts `200`

### 02 - Validation and Error Contract

Add runtime schemas for request and environment validation.

Acceptance criteria:

- invalid body returns `422` with field-level details
- unknown routes return a consistent not-found error shape
- uncaught errors map to generic `500` response with request ID

How to verify:

- send malformed JSON payload and assert error envelope
- hit nonexistent endpoint and assert not-found contract

### 03 - PostgreSQL Integration

Introduce PostgreSQL-backed persistence for a core resource (for example, tasks or orders).

Acceptance criteria:

- migrations create schema and constraints
- all SQL is parameterized (`$1`, `$2`, ...)
- list and detail queries are indexed for expected access pattern

How to verify:

- run migrations on clean database
- execute CRUD tests against real Postgres
- capture one `EXPLAIN ANALYZE` for a list endpoint query

### 04 - Transactional Workflow

Implement a two-step write flow that must be atomic (for example, create order + reserve inventory).

Acceptance criteria:

- both writes commit on success
- any failure triggers rollback
- conflict path returns explicit `409` or domain-specific error code

How to verify:

- write test that injects failure in step two and confirms no partial data

### 05 - Resilience Controls

Protect the API from retries, bursts, and flaky dependencies.

Acceptance criteria:

- route-level rate limit returns `429` with retry hint
- outbound dependency calls use timeout + exponential backoff with jitter
- create endpoint supports `Idempotency-Key` and deduplicates writes

How to verify:

- run repeated request script and observe rate-limit behavior
- force timeout from dependency mock and verify retry policy
- send duplicate idempotent requests and confirm one logical write

### 06 - Async Jobs and Queueing

Move a slow side effect to background processing.

Acceptance criteria:

- API returns quickly with accepted/queued status
- worker processes job with retry policy
- poison jobs are isolated (dead-letter or failure state)

How to verify:

- enqueue a job and confirm eventual completion state
- simulate worker failure and confirm retry then dead-letter behavior

### 07 - GraphQL with Production Guardrails

Add a GraphQL endpoint for read-heavy use cases.

Acceptance criteria:

- schema supports pagination and explicit nullability
- related-field resolution avoids N+1 via DataLoader
- deprecated fields are marked with deprecation reason

How to verify:

- run one query that would cause N+1 and show batched execution in logs
- run schema diff check after adding/deprecating fields

### 08 - Operational Hardening

Finish with service runtime safety and observability checks.

Acceptance criteria:

- graceful shutdown drains in-flight requests and closes DB pool
- readiness endpoint fails when dependencies are unavailable
- service emits structured logs and core metrics

How to verify:

- send `SIGTERM` during active requests and confirm graceful completion
- disable DB dependency and confirm readiness returns non-`200`

---

## Delivery Checklist for Each Phase

- tests added/updated and passing
- typecheck and lint passing
- migration or schema changes documented
- rollback plan for breaking changes
- short note on trade-offs made in that phase

The goal is not just code that works locally; the goal is code that can run safely in production.

---

**Previous:** [16-nestjs.md](./16-nestjs.md) - NestJS
