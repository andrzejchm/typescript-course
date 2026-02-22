# 13 — Observability Basics (Logs, Metrics, Traces)

In a Flutter app, local debugging usually means breakpoints, `debugPrint`, and hot reload. In production full-stack systems, you do not have that luxury. This lesson shows how to set up practical observability in TypeScript so you can answer: "What failed, where, and why?"

---

## 1. What is observability?

Observability is your ability to understand system behavior from the outside using telemetry:

- **Logs**: discrete events ("user clicked", "API failed")
- **Metrics**: numeric trends over time (latency, error rate)
- **Traces**: request journey across services (API -> DB -> external API -> LLM)

Why production debugging is different from local:

- users have real traffic patterns and bad network conditions
- requests overlap, retry, and fail in non-deterministic ways
- external systems (DB, APIs, LLMs) can be slow or flaky

Observability is basically "production visibility."

---

## 2. The 3 pillars

### Logs

Event-level records with context.

Example:

```json
{
  "level": "info",
  "message": "workflow step started",
  "workflowId": "wf_123",
  "stepName": "llm_summarize",
  "requestId": "req_abc"
}
```

### Metrics

Aggregated numbers over time.

Examples:

- `http_requests_total{route="/api/workflows"}`
- `http_request_duration_ms` p50/p95/p99
- `workflow_failed_total`

### Traces

Timeline of one request broken into spans.

Example trace:

- span 1: `POST /api/run-workflow`
- span 2: `SELECT workflow config`
- span 3: `Call external API`
- span 4: `Call OpenAI`

---

## 3. Logging setup in Node/TS

`console.log` is fine for quick local checks, but weak at scale:

- inconsistent format
- hard to filter/search
- no built-in log level strategy

Use `pino` for structured logs.

Install:

```bash
npm install pino
npm install -D pino-pretty
```

`src/logger.ts`:

```typescript
import pino from "pino";

const isDev = process.env.NODE_ENV !== "production";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  transport: isDev
    ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:standard",
          ignore: "pid,hostname",
        },
      }
    : undefined,
});
```

Log levels you should use intentionally:

- `debug`: noisy internal detail (development)
- `info`: expected business events
- `warn`: suspicious but recoverable
- `error`: failed operation requiring attention

---

## 4. Request logging and correlation IDs

A correlation ID (often `requestId`) lets you tie all logs from one request together.

`src/middleware/request-context.ts`:

```typescript
import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { logger } from "../logger";

export function requestContext(req: Request, res: Response, next: NextFunction) {
  const requestId = req.header("x-request-id") ?? randomUUID();

  req.requestId = requestId;
  res.setHeader("x-request-id", requestId);

  const start = Date.now();
  logger.info({ requestId, method: req.method, path: req.path }, "request started");

  res.on("finish", () => {
    logger.info(
      {
        requestId,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        durationMs: Date.now() - start,
      },
      "request completed"
    );
  });

  next();
}
```

Minimal Express usage:

```typescript
app.use(requestContext);

app.get("/api/tasks", async (req, res) => {
  logger.info({ requestId: req.requestId }, "fetching tasks");
  res.json({ items: [] });
});
```

Flutter analogy: similar to adding a request ID in a `dio` interceptor and including it in all API logs.

---

## 5. Error tracking

Use Sentry so errors are grouped, searchable, and linked to stack traces.

Backend (Express):

```typescript
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
});

app.get("/api/run", async (req, res) => {
  try {
    await runWorkflow();
    res.json({ ok: true });
  } catch (error) {
    Sentry.captureException(error, {
      tags: { route: "/api/run" },
      extra: { requestId: req.requestId },
    });
    throw error;
  }
});
```

Frontend (React/Vite style):

```typescript
import * as Sentry from "@sentry/browser";

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
});
```

Flutter analogy: Crashlytics for Flutter is conceptually very similar to Sentry for web/backend.

---

## 6. Metrics basics

For interviews, measure what shows system health quickly:

- request count
- latency: p50/p95/p99
- error rate
- queue depth
- DB query duration
- token usage and cost for LLM calls

`prom-client` + `/metrics` endpoint (Prometheus format):

```typescript
import client from "prom-client";

const register = new client.Registry();
client.collectDefaultMetrics({ register });

const httpRequestDuration = new client.Histogram({
  name: "http_request_duration_ms",
  help: "HTTP request duration in ms",
  labelNames: ["method", "route", "status_code"],
  buckets: [10, 50, 100, 250, 500, 1000, 2000],
  registers: [register],
});

app.use((req, res, next) => {
  const end = httpRequestDuration.startTimer({ method: req.method, route: req.path });
  res.on("finish", () => end({ status_code: String(res.statusCode) }));
  next();
});

app.get("/metrics", async (_req, res) => {
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
});
```

---

## 7. Distributed tracing basics

Plain English:

- **Trace** = one full request story
- **Span** = one step in that story

OpenTelemetry helps when one request touches multiple systems (API, DB, third-party APIs, LLM). It shows where time is spent and where failures happen.

Minimal span example around external API + LLM:

```typescript
import { trace } from "@opentelemetry/api";

const tracer = trace.getTracer("workflow-service");

async function runEnrichment(prompt: string) {
  return tracer.startActiveSpan("run-enrichment", async (span) => {
    try {
      const externalResult = await tracer.startActiveSpan("external-api-call", async (child) => {
        try {
          const response = await fetch("https://api.example.com/data");
          return await response.json();
        } finally {
          child.end();
        }
      });

      const llmResult = await tracer.startActiveSpan("llm-call", async (child) => {
        try {
          return await callOpenAI({ prompt, context: externalResult });
        } finally {
          child.end();
        }
      });

      return llmResult;
    } catch (error) {
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  });
}
```

---

## 8. Observability for workflow orchestration

Interview-relevant for task pipelines and retries.

Track these fields at minimum:

- `workflow_id`
- `step_name`
- `step_status` (`started`, `completed`, `failed`)
- `duration_ms`
- `retry_count`

Log each step start/end/failure so you can replay incidents quickly.

Example event shape:

```json
{
  "timestamp": "2026-02-22T10:15:31.120Z",
  "level": "info",
  "workflow_id": "wf_89f",
  "step_name": "fetch_customer_profile",
  "step_status": "completed",
  "duration_ms": 241,
  "retry_count": 1,
  "request_id": "req_7fd"
}
```

---

## 9. Dashboards and alerts (production mindset)

Dashboards tell you what is happening now. Alerts tell you when to wake up.

Good starter alerts:

- high error rate (for example > 2% for 5 minutes)
- high p95 latency (for example > 1.5s)
- repeated workflow failures for same step
- spikes in LLM timeouts

Common tools:

- Grafana (often with Prometheus)
- Datadog
- New Relic

In interviews, mention threshold + duration, not just "set an alert."

---

## 10. Day 1 setup checklist (small full-stack app)

1. Add structured logger (`pino`) and standard log fields (service, env, version).
2. Add request middleware with `requestId` and request duration logging.
3. Define log-level policy (`debug/info/warn/error`) and default `LOG_LEVEL`.
4. Add global error handler and send exceptions to Sentry.
5. Add frontend Sentry initialization for runtime UI errors.
6. Expose `/metrics` with `prom-client` and default Node metrics.
7. Track business metrics (workflow success/failure, LLM tokens/cost, retries).
8. Add trace instrumentation for external API and LLM calls.
9. Build one dashboard (errors, p95 latency, throughput, workflow failures).
10. Configure 3-4 actionable alerts with clear thresholds and on-call routing.

---

## 11. Flutter comparison table

| Flutter/mobile concept | TypeScript/backend equivalent |
|------------------------|-------------------------------|
| `debugPrint` | structured JSON logs (`pino`) |
| Crashlytics | Sentry (frontend + backend SDKs) |
| `dio` interceptors | Express middleware (request logging, auth, tracing context) |
| Performance overlay / DevTools timeline | latency metrics + distributed traces |
| `StreamBuilder` updates | log + metric stream in dashboards |
| Firebase Analytics events | business metrics counters and events |
| Isolate debugging and profiling | worker/service span analysis in traces |
| Flutter release monitoring | production dashboards + alert policies |

---

## 12. Interview talk track (90-minute realistic script)

"For a small app, I would keep observability lightweight but complete from day one. I start with structured logs and a request ID middleware so every API call is traceable. Then I add Sentry on frontend and backend for exception tracking with context like `workflowId` and `requestId`.

Next, I add `prom-client` metrics and a `/metrics` endpoint, focusing on request volume, p95 latency, error rate, workflow failures, and LLM token/cost metrics. For slower chains (API -> DB -> external API -> LLM), I add OpenTelemetry spans around external calls so bottlenecks are obvious.

Finally, I set basic alerts for high error rate, p95 spikes, repeated workflow failures, and LLM timeout spikes. That gives enough visibility to debug production issues quickly without overengineering during a 90-minute interview implementation." 
