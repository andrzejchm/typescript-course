# 13 - Observability Basics for Production Services

Observability is how your team answers, in minutes, these production questions:

- What is failing right now?
- Which users or tenants are affected?
- Which dependency is slow?
- What changed before the incident?

For backend teams, this is not optional tooling. It is part of service design.

---

## 1) Practical telemetry model: logs, metrics, traces

Use all three together. Each solves a different part of incident response.

| Signal | Best for | Typical query |
|---|---|---|
| Logs | Detailed events, payload context, exceptions | "show all errors for request `req_abc`" |
| Metrics | Fast health and trend detection | "is p95 latency above target for 10m?" |
| Traces | Cross-service latency and dependency bottlenecks | "which hop is consuming 80% of request time?" |

If you only ship logs, detection is late. If you only ship metrics, root cause is slow. If you only ship traces, coverage is often incomplete.

---

## 2) Baseline telemetry contract (every service)

Define this once and enforce it in middleware and libraries.

Required fields:

- `timestamp`
- `service`
- `environment`
- `version` (git SHA or build id)
- `requestId` (correlation id)
- `traceId` and `spanId` (if tracing enabled)
- `tenantId` or `accountId` when available
- `eventName`
- `durationMs` for timed operations

Structured JSON log example:

```json
{
  "timestamp": "2026-02-25T12:14:30.124Z",
  "level": "error",
  "service": "billing-api",
  "environment": "prod-eu",
  "version": "a8f0c4e",
  "requestId": "req_7ec9",
  "traceId": "ec4e2b8a11d642f3",
  "eventName": "payment.capture.failed",
  "orderId": "ord_910",
  "provider": "stripe",
  "durationMs": 1320,
  "errorCode": "timeout"
}
```

---

## 3) Correlation IDs and context propagation

Correlation IDs make logs searchable per request. Trace context links service hops.

### Express request context middleware

```typescript
import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}

export function requestContext(req: Request, res: Response, next: NextFunction): void {
  const requestId = req.header("x-request-id") ?? randomUUID();

  req.requestId = requestId;
  res.setHeader("x-request-id", requestId);

  next();
}
```

### Forward context on outbound HTTP

```typescript
type Context = {
  requestId: string;
  traceparent?: string;
};

export async function callCatalogService(ctx: Context, sku: string): Promise<Response> {
  return fetch(`https://catalog.internal/items/${sku}`, {
    headers: {
      "x-request-id": ctx.requestId,
      ...(ctx.traceparent ? { traceparent: ctx.traceparent } : {}),
    },
  });
}
```

Flutter analogy: this is the backend equivalent of attaching headers in a `dio` interceptor so all requests carry the same request context.

---

## 4) SLIs and SLOs that drive operations

Define SLIs from user-visible behavior first.

Core SLIs:

- Availability: successful requests / total requests
- Latency: p95 and p99 of critical endpoints
- Freshness/lag for async pipelines (queue age, processing delay)
- Correctness signals (for example, failed reconciliation ratio)

Example SLOs:

- API availability >= `99.9%` over 30 days
- Checkout p95 latency <= `400ms` over 30 days
- Async invoice workflow completion <= `5m` for `99%` of jobs

Error budget:

- SLO `99.9%` allows ~43.2 minutes of monthly unavailability
- Consume budget too fast -> freeze risky releases and prioritize reliability work

---

## 5) Metrics and dashboards

Expose metrics with labels that are stable and low-cardinality.

Good labels:

- `service`
- `route` (templated, not raw URL)
- `status_code`
- `dependency`

Avoid high-cardinality labels (user IDs, request IDs) in metrics.

### Minimal dashboard layout

1. Traffic: requests/sec by route
2. Errors: 4xx/5xx rate and dependency errors
3. Latency: p50/p95/p99 for top endpoints
4. Saturation: CPU, memory, DB pool usage, queue depth
5. Workflow panels: success rate, retry rate, DLQ count, age of oldest job

### `prom-client` histogram snippet

```typescript
import client from "prom-client";

const registry = new client.Registry();
client.collectDefaultMetrics({ register: registry });

export const httpDurationMs = new client.Histogram({
  name: "http_request_duration_ms",
  help: "HTTP request latency in milliseconds",
  labelNames: ["service", "route", "method", "status_code"],
  buckets: [10, 25, 50, 100, 200, 400, 800, 1600],
  registers: [registry],
});
```

---

## 6) Alerting that is actionable

Alert on symptoms and sustained impact, not on every spike.

Priority alerts:

- High error-rate burn for critical API
- Latency SLO burn for checkout/payment paths
- Queue age over threshold (workers cannot keep up)
- DLQ growth with no recovery
- Dependency outage (payment provider, DB, auth)

Alert message should include:

- service + environment
- current value vs threshold
- links to dashboard, traces, runbook
- owning on-call team

Example policy:

- `critical`: error rate > `2%` for `10m` on checkout endpoint
- `warning`: error rate > `1%` for `30m`

---

## 7) Incident debugging workflow (repeatable)

Use a fixed flow so incidents are handled consistently.

1. **Confirm impact**: affected routes, regions, tenants, error budget burn
2. **Triage quickly**: dashboard -> identify whether issue is latency, errors, or saturation
3. **Pivot by correlation ID**: inspect failed requests in logs
4. **Use traces**: find the slow/failing span (DB, internal service, third-party)
5. **Check recent change events**: deploys, config flags, migrations, dependency incidents
6. **Mitigate first**: rollback, disable feature flag, reduce traffic, scale workers
7. **Stabilize and verify**: alerts clear, SLI back within target
8. **Post-incident**: write timeline, root cause, and preventive actions

Keep this runbook in the repo so on-call engineers do not improvise under pressure.

---

## 8) Workflow observability (long-running jobs)

For orchestrated jobs, emit standardized step events.

Required step fields:

- `workflowId`
- `stepName`
- `attempt`
- `status` (`started`, `completed`, `failed`, `compensated`)
- `durationMs`
- `idempotencyKey`

Use these to build views for:

- median/p95 step duration
- retries by step
- failure concentration by dependency
- age of in-progress workflows

---

## 9) Production readiness checklist

- Structured logs enabled for all services and workers
- Correlation IDs accepted and propagated across internal calls
- Traces exported with service + version metadata
- Metrics endpoint exposed and scraped
- Critical SLIs and SLOs documented per service
- Dashboard links included in runbooks
- Alert thresholds tuned to avoid noisy paging
- Error tracking integrated with stack traces and release tags
- Incident response workflow tested in game day drills

---

## 10) Flutter/Dart mental mapping

| Flutter/Dart concept | Backend operations equivalent |
|---|---|
| `dio` interceptors | request/trace header propagation middleware |
| Crashlytics signal triage | centralized backend error tracking + trace linkage |
| DevTools performance timeline | distributed tracing waterfall across services |
| app release monitoring | service SLO dashboards and alert policies |

Use the analogy to onboard mobile-heavy teams, but keep production decisions based on backend traffic and failure modes.

---

**Previous:** [09-graphql-basics.md](./09-graphql-basics.md) - GraphQL Basics  
**Next:** [14-workflow-orchestration.md](./14-workflow-orchestration.md) - Workflow Orchestration
