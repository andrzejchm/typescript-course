# 12 - Backend Concepts Playbook

This playbook covers recurring backend decisions in production systems: performance pitfalls, consistency models, caching, queueing, and failure handling. Use it as a decision guide when designing or reviewing services.

---

## 1. N+1 Queries

**Symptom**: one parent query followed by one child query per row.

**Fix options**:

- SQL join + in-memory grouping
- batch query with `WHERE id = ANY($1)`
- request-scoped DataLoader in GraphQL

**Trade-off**:

- joins can duplicate row data but minimize round trips
- batching keeps query count low while preserving simpler query shapes

Rule: never query inside loops over DB results unless you can prove bounded cardinality.

---

## 2. Consistency and Correctness

Choose consistency guarantees intentionally.

### Strong consistency patterns

- transactions for multi-write invariants
- unique constraints for deduplication
- optimistic locking (`version` columns)
- atomic updates (`SET count = count + 1`)

### Eventual consistency patterns

- outbox pattern for cross-service events
- async projection/read models
- delayed reconciliation jobs

Trade-off: stronger consistency lowers anomaly risk but increases contention and latency.

---

## 3. API Boundary Discipline

Every boundary should enforce contracts and preserve traceability.

- validate request body/query/params before business logic
- return a stable error envelope with machine-readable codes
- propagate request/correlation IDs in logs and responses
- version public APIs (`/api/v1`) and evolve additively when possible

This prevents silent contract drift between teams.

---

## 4. Idempotency and Safe Retries

Retries are normal during network failures. Make writes retry-safe.

- require `Idempotency-Key` for critical `POST` endpoints
- store key + request fingerprint + response snapshot
- return prior response on duplicate key
- reject key reuse with different payload (`409 Conflict`)

Retry policy guidelines:

- retry transient failures (`429`, `503`, timeout)
- use exponential backoff + jitter
- cap attempts and total retry window

---

## 5. Caching Strategy

Use caching to reduce latency and dependency load, not to hide correctness bugs.

Cache levels:

- in-process cache (fastest, per-instance only)
- Redis/shared cache (cross-instance)
- HTTP cache headers and CDN (edge distribution)

Decisions to make explicitly:

- key design (include tenant, locale, auth scope)
- TTL and invalidation trigger
- stale-read tolerance
- behavior on cache miss/failure

Anti-pattern: caching mutable business-critical records without invalidation strategy.

---

## 6. Queueing and Workflow Execution

Move work off request path when it is slow, retryable, or external.

Good queue candidates:

- email/webhook delivery
- document processing and media conversion
- third-party synchronization
- multi-step workflow orchestration

Queue design essentials:

- durable payload schema with explicit version
- visibility timeout and retry policy
- dead-letter queue for poison messages
- idempotent consumers

For long-running workflows, persist per-step state so execution can resume after crashes.

---

## 7. Failure Modes and Resilience

Design for partial failures. Dependencies will fail independently.

Common failure modes:

- dependency timeout or saturation
- rate limits from upstream APIs
- DB lock contention/deadlocks
- message backlog growth

Resilience controls:

- timeout budgets on all network/database calls
- circuit breaker on unstable dependencies
- bulkhead limits for expensive routes
- graceful degradation (serve partial functionality)

Set SLO-driven alerts on latency, error rate, and saturation, not only process uptime.

---

## 8. Transactions and Outbox Pattern

If you update DB state and publish an event, avoid split-brain behavior.

Pattern:

1. Write business row and outbox row in one DB transaction
2. Background worker publishes outbox rows
3. Mark published rows with timestamp/attempt count

This guarantees no event is published without committed state and no committed state loses its event.

---

## 9. Observability as a Feature

Minimum production telemetry:

- structured logs with `requestId`, `userId`, route, latency
- metrics: throughput, p95/p99 latency, error rate, queue depth, DB pool usage
- traces across API -> DB -> external APIs

Add semantic events for business flows (order created, workflow step failed). Operational metrics alone rarely explain product impact.

---

## 10. Operational Readiness Checklist

- health/readiness endpoints implemented
- graceful shutdown drains in-flight requests
- schema migrations reviewed and reversible
- rate limits and payload limits configured
- retries and idempotency tested under failure injection
- dashboards and alerts defined before release

If a service is functionally correct but operationally opaque, it is not production-ready.

---

## 11. Quick Decision Matrix

| Problem | Primary Pattern | Secondary Pattern |
|---|---|---|
| Slow nested reads | Join/batch/DataLoader | Read model cache |
| Duplicate writes after retry | Idempotency keys + unique constraints | Request fingerprinting |
| Expensive synchronous endpoint | Queue + async worker | Streaming partial responses |
| Cross-service state + events | Transactional outbox | Saga compensation |
| Upstream instability | Timeout + retry + circuit breaker | Cached fallback |
| Hot data read pressure | Redis/edge cache | Precomputed projections |

---

**Previous:** [11-postgresql-basics.md](./11-postgresql-basics.md) - PostgreSQL Basics  
**Next:** [09-graphql-basics.md](./09-graphql-basics.md) - GraphQL Basics
