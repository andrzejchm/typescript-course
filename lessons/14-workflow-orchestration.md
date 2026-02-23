# 14 — Workflow Orchestration in TypeScript (Durable, Resumable, Cancelable)

If you are coming from Flutter, think of a workflow as a long-lived state machine, not just one async function call. In mobile apps you often handle retries at the request layer. In backend systems, you need retries, persistence, resume, and cancellation across minutes or hours.

This lesson is a practical crash guide for interviews and real projects.

---

## 1. What is workflow orchestration?

A simple async function is in-memory and short-lived.

```typescript
async function createOrderSimple(input: CreateOrderInput): Promise<void> {
  const user = await fetchUser(input.userId);
  const payment = await chargeCard(input.cardToken, input.amount);
  await createShipment(payment.orderId);
}
```

If the process crashes after `chargeCard`, you can lose progress, double-charge, or leave inconsistent state.

A durable workflow persists state between steps so it can resume safely after crash/restart/deploy.

```typescript
// Durable mindset: each step is persisted and replay-safe.
await workflowEngine.run("create_order", {
  workflowId: "wf_123",
  input,
});
```

Why long-running tasks fail in real systems:

- process restarts (deploy, autoscaling, OOM)
- network timeouts and partial failures
- third-party API rate limits and outages
- duplicate delivery from queues/webhooks
- human-triggered cancellation and resume

---

## 2. Core concepts you must know

- **Workflow**: full business process (`create order`, `onboard customer`).
- **Step**: one unit of work (`charge card`, `send email`).
- **Dependency graph (DAG)**: step ordering rules. A step can run only when its dependencies are done.
- **State machine**: explicit states like `pending -> running -> completed`.
- **Idempotency key**: stable key so retries do not duplicate side effects.
- **Retry policy**: controlled retries with exponential backoff + jitter.
- **Timeout + heartbeat**: timeout avoids infinite hang; heartbeat proves worker is alive.
- **Compensation (Saga)**: undo/mitigate earlier successful steps when later steps fail.
- **Delivery semantics**:
  - **At-least-once** (common): same step may execute more than once. Requires idempotent handlers.
  - **Exactly-once** (rare/expensive): true global exactly-once is hard. Usually simulated with idempotency + dedupe.

Backoff with jitter example:

```typescript
function computeBackoffMs(attempt: number): number {
  const base = 500;
  const max = 30_000;
  const exp = Math.min(max, base * 2 ** (attempt - 1));
  const jitter = Math.floor(Math.random() * 250);
  return exp + jitter;
}
```

---

## 3. State model in DB

Use three core tables:

- `workflows`: one row per workflow execution
- `workflow_steps`: one row per step per workflow
- `workflow_events`: append-only event/audit log

Status enum:

```sql
CREATE TYPE workflow_status AS ENUM (
  'pending',
  'running',
  'completed',
  'failed',
  'cancelled',
  'paused'
);
```

Schema:

```sql
CREATE TABLE workflows (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  status workflow_status NOT NULL DEFAULT 'pending',
  current_step TEXT,
  attempt_count INT NOT NULL DEFAULT 0,
  next_run_at TIMESTAMPTZ,
  last_error TEXT,
  cancel_requested_at TIMESTAMPTZ,
  resume_token TEXT,
  input_json JSONB NOT NULL,
  output_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE workflow_steps (
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  step_name TEXT NOT NULL,
  status workflow_status NOT NULL DEFAULT 'pending',
  attempt_count INT NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  last_error TEXT,
  output_json JSONB,
  idempotency_key TEXT,
  PRIMARY KEY (workflow_id, step_name)
);

CREATE TABLE workflow_events (
  id BIGSERIAL PRIMARY KEY,
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  step_name TEXT,
  event_type TEXT NOT NULL,
  payload_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Indexes for scheduler and observability:

```sql
CREATE INDEX idx_workflows_status_next_run
  ON workflows (status, next_run_at)
  WHERE status IN ('pending', 'running', 'paused');

CREATE INDEX idx_workflows_cancel_requested
  ON workflows (cancel_requested_at)
  WHERE cancel_requested_at IS NOT NULL;

CREATE INDEX idx_steps_status
  ON workflow_steps (status);

CREATE INDEX idx_events_workflow_created
  ON workflow_events (workflow_id, created_at DESC);

CREATE UNIQUE INDEX idx_steps_idempotency_key
  ON workflow_steps (idempotency_key)
  WHERE idempotency_key IS NOT NULL;
```

---

## 4. Execution architecture

Building blocks:

- **API layer**: start, cancel, resume endpoints
- **Worker loop / scheduler**: claims runnable workflows and executes one tick
- **Step executor registry**: map `stepName -> executor function`
- **Persistence adapter**: DB operations behind an interface
- **Event log + hooks**: append events and emit metrics/traces/logs

Text diagram:

```text
Client -> API (start/cancel/resume)
            |
            v
       workflows table <-> workflow_steps table <-> workflow_events table
            ^
            |
     Worker Scheduler (poll next_run_at, claim jobs)
            |
            v
      Step Executor Registry
       |      |      |
       v      v      v
    DB call  HTTP   Queue publish
```

---

## 5. Minimal durable engine in TypeScript

This is intentionally compact but realistic.

```typescript
type WorkflowStatus = "pending" | "running" | "completed" | "failed" | "cancelled" | "paused";

type WorkflowRecord = {
  id: string;
  status: WorkflowStatus;
  currentStep: string | null;
  attemptCount: number;
  cancelRequestedAt: string | null;
  nextRunAt: string | null;
  lastError: string | null;
  steps: string[];
};

type StepRecord = {
  workflowId: string;
  stepName: string;
  status: WorkflowStatus;
  attemptCount: number;
  outputJson: unknown | null;
};

type StepContext = {
  workflowId: string;
  stepName: string;
  input: Record<string, unknown>;
  previousOutputs: Record<string, unknown>;
  idempotencyKey: string;
  heartbeat: () => Promise<void>;
};

type StepExecutor = (ctx: StepContext) => Promise<unknown>;

type Db = {
  getWorkflowById: (workflowId: string) => Promise<WorkflowRecord | null>;
  getWorkflowInput: (workflowId: string) => Promise<Record<string, unknown>>;
  getStep: (workflowId: string, stepName: string) => Promise<StepRecord | null>;
  getStepOutputs: (workflowId: string) => Promise<Record<string, unknown>>;
  upsertStep: (step: StepRecord) => Promise<void>;
  updateWorkflow: (workflowId: string, patch: Partial<WorkflowRecord>) => Promise<void>;
  appendEvent: (workflowId: string, eventType: string, payload: Record<string, unknown>) => Promise<void>;
  markHeartbeat: (workflowId: string, stepName: string) => Promise<void>;
};

const MAX_ATTEMPTS = 5;

function computeBackoffMs(attempt: number): number {
  const exp = Math.min(30_000, 500 * 2 ** (attempt - 1));
  const jitter = Math.floor(Math.random() * 250);
  return exp + jitter;
}

async function runWorkflow(workflowId: string, db: Db, executors: Record<string, StepExecutor>): Promise<void> {
  const workflow = await db.getWorkflowById(workflowId);
  if (!workflow) {
    throw new Error(`Workflow not found: ${workflowId}`);
  }

  if (workflow.status === "completed" || workflow.status === "cancelled") {
    return;
  }

  if (workflow.cancelRequestedAt) {
    await db.updateWorkflow(workflowId, { status: "cancelled", currentStep: workflow.currentStep });
    await db.appendEvent(workflowId, "workflow.cancelled", {});
    return;
  }

  await db.updateWorkflow(workflowId, { status: "running" });
  const workflowInput = await db.getWorkflowInput(workflowId);

  for (const stepName of workflow.steps) {
    const latest = await db.getWorkflowById(workflowId);
    if (!latest) {
      throw new Error(`Workflow not found during execution: ${workflowId}`);
    }
    if (latest.cancelRequestedAt) {
      await db.updateWorkflow(workflowId, { status: "cancelled", currentStep: stepName });
      await db.appendEvent(workflowId, "workflow.cancelled", { stepName });
      return;
    }

    const existingStep = await db.getStep(workflowId, stepName);
    if (existingStep?.status === "completed") {
      continue;
    }

    const attempt = (existingStep?.attemptCount ?? 0) + 1;
    const idempotencyKey = `${workflowId}:${stepName}`;

    await db.updateWorkflow(workflowId, { currentStep: stepName });
    await db.upsertStep({
      workflowId,
      stepName,
      status: "running",
      attemptCount: attempt,
      outputJson: existingStep?.outputJson ?? null,
    });
    await db.appendEvent(workflowId, "step.started", { stepName, attempt });

    const executor = executors[stepName];
    if (!executor) {
      const message = `Missing executor for step: ${stepName}`;
      await db.upsertStep({
        workflowId,
        stepName,
        status: "failed",
        attemptCount: attempt,
        outputJson: null,
      });
      await db.updateWorkflow(workflowId, { status: "failed", lastError: message });
      await db.appendEvent(workflowId, "step.failed", { stepName, error: message });
      return;
    }

    try {
      const previousOutputs = await db.getStepOutputs(workflowId);
      const output = await executor({
        workflowId,
        stepName,
        input: workflowInput,
        previousOutputs,
        idempotencyKey,
        heartbeat: () => db.markHeartbeat(workflowId, stepName),
      });

      await db.upsertStep({
        workflowId,
        stepName,
        status: "completed",
        attemptCount: attempt,
        outputJson: output,
      });
      await db.appendEvent(workflowId, "step.completed", { stepName, attempt });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      await db.upsertStep({
        workflowId,
        stepName,
        status: "failed",
        attemptCount: attempt,
        outputJson: null,
      });
      await db.appendEvent(workflowId, "step.failed", { stepName, attempt, error: errorMessage });

      if (attempt >= MAX_ATTEMPTS) {
        await db.updateWorkflow(workflowId, { status: "failed", lastError: errorMessage });
        return;
      }

      const backoffMs = computeBackoffMs(attempt);
      const nextRunAt = new Date(Date.now() + backoffMs).toISOString();
      await db.updateWorkflow(workflowId, {
        status: "pending",
        nextRunAt,
        attemptCount: workflow.attemptCount + 1,
        lastError: errorMessage,
      });
      return;
    }
  }

  await db.updateWorkflow(workflowId, {
    status: "completed",
    currentStep: null,
    nextRunAt: null,
    lastError: null,
  });
  await db.appendEvent(workflowId, "workflow.completed", {});
}
```

Why this survives crashes:

- step state is persisted before and after execution
- completed steps are skipped on retry/resume
- cancellation is checked between steps
- retries schedule next run using persisted `nextRunAt`

---

## 6. Cancellation + Resume

Use cooperative cancellation:

- API sets `cancel_requested_at = now()`
- worker checks that flag between steps and exits safely
- workflow becomes `cancelled`

Resume pattern:

- set status back to `pending`
- keep `workflow_steps` rows
- `runWorkflow` skips completed steps and continues from first non-completed step

If cancellation happens during a long external API call:

- you usually cannot interrupt the remote side immediately
- wait for call to return/timeout
- check cancel flag before next step
- use idempotency key for any retried side effect after restart

---

## 7. Dependency handling

### Sequential pipeline

`A -> B -> C` is simplest and often enough for interviews.

### Fan-out / fan-in

Example:

- `fetch_orders`
- fan-out: `enrich_order_1`, `enrich_order_2`, `enrich_order_3` in parallel
- fan-in: `aggregate_results`

Minimal cycle detection for DAG safety:

```typescript
type Graph = Record<string, string[]>; // step -> dependencies

function assertAcyclic(graph: Graph): void {
  const visiting = new Set<string>();
  const visited = new Set<string>();

  const dfs = (node: string): void => {
    if (visiting.has(node)) {
      throw new Error(`Cycle detected at step: ${node}`);
    }
    if (visited.has(node)) {
      return;
    }

    visiting.add(node);
    for (const dep of graph[node] ?? []) {
      dfs(dep);
    }
    visiting.delete(node);
    visited.add(node);
  };

  for (const node of Object.keys(graph)) {
    dfs(node);
  }
}
```

---

## 8. Resilience patterns you should mention

- **Circuit breaker**: stop calling a failing dependency temporarily.
- **Bulkhead**: separate worker pools/queues per dependency to avoid total collapse.
- **Rate limiting**: protect external APIs and your own DB.
- **Dead letter queue (DLQ)**: move poison jobs after max retries for manual inspection.
- **De-dup with idempotency key**: same business request maps to same effect.
- **Outbox pattern**: write DB update + outgoing event intent in one transaction, publish later reliably.

Circuit breaker sketch:

```typescript
if (breaker.isOpen("payments")) {
  throw new Error("Payments dependency temporarily unavailable");
}

try {
  await callPaymentsApi();
  breaker.recordSuccess("payments");
} catch (error) {
  breaker.recordFailure("payments");
  throw error;
}
```

---

## 9. Library landscape (production)

| Library | Best fit | Tradeoffs |
|--------|----------|-----------|
| **Temporal** | Complex long-running business workflows, strong durability and replay model | Steeper learning curve, infra setup, deterministic workflow constraints |
| **Inngest** | Event-driven app workflows with quick developer onboarding | Platform opinionation, may be less flexible for custom runtime constraints |
| **Trigger.dev** | TypeScript-first background jobs/workflows with good DX | Newer ecosystem, evaluate scaling model vs your traffic needs |
| **BullMQ (+ Redis)** | Queue-first job processing, retries, delayed jobs | You implement more orchestration logic yourself (state machine, saga, resume rules) |

Interview-safe statement:

"I can build a custom durable engine for MVP/interview clarity, but I would graduate to Temporal/Inngest/Trigger.dev when workflow complexity, scale, auditability, and team size increase."

---

## 10. 90-minute interview implementation plan

What to build first (MVP):

1. DB schema (`workflows`, `workflow_steps`, `workflow_events`) + indexes.
2. API: `POST /workflows/start`, `POST /workflows/:id/cancel`, `POST /workflows/:id/resume`.
3. Worker loop: poll runnable workflows (`status in pending/running` and `next_run_at <= now()`).
4. `runWorkflow(workflowId)` with persisted step state and retries.
5. Idempotency key handling per side-effect step.

What to skip in coding due to time:

- full visual DAG editor
- perfect exactly-once claims
- advanced distributed locking implementation details

What to mention verbally to signal seniority:

- at-least-once execution and idempotent handlers
- compensation strategy for partial success (saga)
- observability fields (`workflowId`, `stepName`, `attempt`, `durationMs`)
- backpressure and rate-limit protections
- when to switch from custom engine to a workflow platform

---

## 11. Checklist + common pitfalls

Do/Don't list:

1. **Do** persist state before and after each step.
2. **Do** make side-effect steps idempotent.
3. **Do** use exponential backoff with jitter.
4. **Do** support cooperative cancellation and resume.
5. **Do** log structured step events for debugging.
6. **Don't** keep workflow progress only in memory.
7. **Don't** retry forever without DLQ/quarantine.
8. **Don't** hide errors; persist `last_error` and attempt counts.
9. **Don't** assume exactly-once delivery from queues/webhooks.
10. **Don't** call non-idempotent external APIs without dedupe strategy.

Common bugs:

- double execution after worker restart
- lost progress because step completion was not persisted
- non-idempotent payment/email step causing duplicate side effects
- workflow stuck in `running` due to missing heartbeat timeout handling

---

## 12. Flutter/Dart mapping table

| Flutter/Dart concept | Workflow orchestration equivalent |
|----------------------|-----------------------------------|
| `Future` chain | Sequential step pipeline |
| `Future.wait` | Fan-out parallel step execution |
| `Stream` events | Workflow event log / status updates |
| `Isolate` for background work | Worker process / queue consumer |
| BLoC/Cubit state transitions | Workflow state machine transitions |
| App lifecycle pause/resume | Workflow pause/cancel/resume persisted in DB |
| Repository pattern | Persistence adapter for workflows and steps |
| Retry interceptors in `dio` | Step-level retry policy with backoff + jitter |
| `CancelToken` (`dio`) | Cooperative `cancel_requested_at` flag |
| Equatable immutable state | Immutable workflow snapshots/events for audit |

---

## Interview talk track (short)

"I model workflows as durable state machines persisted in Postgres. Each step is idempotent, retriable with backoff+jitter, and observable through structured events. The worker checks cancellation between steps, resumes from last successful step, and records `next_run_at` for retries. I treat execution as at-least-once and design dedupe keys and compensation actions for safe recovery."
