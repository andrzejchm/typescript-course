# 12 - Workflow Orchestration in TypeScript

Workflow orchestration is what you use when business processes outlive a single process lifetime.

If a service restarts mid-flight, work must continue safely without duplicate side effects.

---

## 1) Durable execution model

A durable workflow engine is a persisted state machine:

- state is stored in DB (not memory)
- each step transition is recorded
- retries are scheduled with backoff
- cancellation and resume are explicit states

Common states:

```text
pending -> running -> completed
                 \-> failed
                 \-> cancelling -> cancelled
                 \-> paused -> running
```

Durability rule: if you cannot replay from persisted state after a crash, it is not a workflow engine yet.

---

## 2) Persisted state machine schema

Use explicit workflow and step records.

```sql
CREATE TYPE workflow_status AS ENUM (
  'pending',
  'running',
  'paused',
  'completed',
  'failed',
  'cancelling',
  'cancelled'
);

CREATE TABLE workflows (
  id UUID PRIMARY KEY,
  workflow_name TEXT NOT NULL,
  status workflow_status NOT NULL DEFAULT 'pending',
  input_json JSONB NOT NULL,
  output_json JSONB,
  next_run_at TIMESTAMPTZ,
  cancel_requested_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE workflow_steps (
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  step_name TEXT NOT NULL,
  status workflow_status NOT NULL DEFAULT 'pending',
  attempt_count INT NOT NULL DEFAULT 0,
  idempotency_key TEXT,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  output_json JSONB,
  last_error TEXT,
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

Indexes to support scheduling:

```sql
CREATE INDEX idx_workflows_runnable
  ON workflows (status, next_run_at)
  WHERE status IN ('pending', 'running', 'paused');

CREATE INDEX idx_workflow_events_lookup
  ON workflow_events (workflow_id, created_at DESC);
```

---

## 3) Execution loop with retries and backoff

Execution should be tick-based and resumable.

```typescript
type StepExecutor = (ctx: {
  workflowId: string;
  stepName: string;
  idempotencyKey: string;
  heartbeat: () => Promise<void>;
}) => Promise<unknown>;

const MAX_ATTEMPTS = 8;

function computeBackoffMs(attempt: number): number {
  const base = 500;
  const max = 60_000;
  const exp = Math.min(max, base * 2 ** (attempt - 1));
  const jitter = Math.floor(Math.random() * 300);
  return exp + jitter;
}

async function runStepWithRetry(
  workflowId: string,
  stepName: string,
  executor: StepExecutor,
  attemptCount: number
): Promise<{ status: "completed" } | { status: "retry_scheduled" } | { status: "failed" }> {
  const attempt = attemptCount + 1;
  const idempotencyKey = `${workflowId}:${stepName}`;

  try {
    await executor({
      workflowId,
      stepName,
      idempotencyKey,
      heartbeat: async () => {
        await markStepHeartbeat(workflowId, stepName);
      },
    });

    await markStepCompleted(workflowId, stepName, attempt);
    return { status: "completed" };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await markStepFailed(workflowId, stepName, attempt, message);

    if (attempt >= MAX_ATTEMPTS) {
      await markWorkflowFailed(workflowId, message);
      return { status: "failed" };
    }

    await scheduleWorkflowRetry(workflowId, computeBackoffMs(attempt), message);
    return { status: "retry_scheduled" };
  }
}
```

Operational notes:

- retry only transient failures
- do not retry validation/domain errors forever
- cap attempts and use DLQ for poison workflows

---

## 4) Cancellation and resume semantics

Cancellation should be cooperative and explicit.

Cancellation contract:

- API marks `cancel_requested_at`
- worker checks flag between steps and before retries
- workflow moves `running -> cancelling -> cancelled`

Resume contract:

- clear cancellation flag
- set status to `pending`
- keep completed step rows
- continue from first non-completed step

If a step calls an external API that cannot be interrupted, finish/timeout that call, then stop before the next side effect.

---

## 5) Idempotency rules for side effects

Assume at-least-once execution in distributed systems.

Idempotency checklist per side-effect step:

- deterministic `idempotencyKey` from business identity
- upstream API supports idempotency key header/body
- local dedupe table or unique constraint
- store provider response by key for replay-safe retries

Example SQL dedupe:

```sql
CREATE TABLE external_call_dedupe (
  idempotency_key TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  response_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## 6) Dependency graphs and scheduling

Many workflows are DAGs, not simple chains.

Minimal node model:

```typescript
type Graph = Record<string, string[]>; // node -> dependencies

function getRunnableSteps(graph: Graph, completed: Set<string>, running: Set<string>): string[] {
  return Object.keys(graph).filter((step) => {
    if (completed.has(step) || running.has(step)) {
      return false;
    }

    const deps = graph[step] ?? [];
    return deps.every((dep) => completed.has(dep));
  });
}
```

Safety requirements:

- validate DAG is acyclic at registration time
- cap fan-out concurrency per workflow and per dependency
- enforce per-step timeout and heartbeat timeout

---

## 7) Compensation patterns (Saga)

For multi-step business flows, define compensating actions where possible.

Example:

1. reserve inventory
2. capture payment
3. create shipment

If shipment fails:

- void/refund payment
- release inventory reservation
- mark workflow `failed` with compensation result

Store compensation status as first-class events:

- `compensation.started`
- `compensation.completed`
- `compensation.failed`

Compensation is not perfect rollback. It is explicit damage control for partial success.

---

## 8) Dead-letter queue (DLQ) and replay

Move exhausted workflows to DLQ with full context.

DLQ payload should include:

- `workflowId`
- failed `stepName`
- `attemptCount`
- `lastError`
- snapshot of relevant input

Operations runbook:

1. inspect DLQ item and classify failure type
2. patch code/config/dependency if systemic
3. replay only idempotent-safe workflows
4. track replay outcome metrics

Never bulk replay without idempotency validation.

---

## 9) When to adopt a managed workflow engine

Use a custom engine when workflows are few and simple.

Adopt managed platforms (Temporal, Inngest, Trigger.dev, cloud-native engines) when you need:

- many long-running workflows across teams
- strong durability/replay guarantees out of the box
- visibility tooling and operational primitives (timeouts, retries, cron, signals)
- lower maintenance burden than custom scheduler internals

Decision rule:

- if orchestration code is becoming your product's hidden platform, move to a managed engine

---

## 10) Production checklist

- Persist every state transition before/after step execution
- Enforce idempotency for all external side effects
- Retry transient failures with capped exponential backoff + jitter
- Support cancellation and resume through explicit state transitions
- Instrument logs/metrics/traces with `workflowId`, `stepName`, `attempt`
- Use heartbeat + timeout to detect stuck workers
- Route retry-exhausted workflows to DLQ
- Implement compensation for irreversible partial failures
- Validate DAG definitions and concurrency limits
- Document runbooks for pause, resume, replay, and incident response

---

## 11) Flutter/Dart mental mapping

| Flutter/Dart concept | Workflow orchestration equivalent |
|---|---|
| Cubit/BLoC explicit states | persisted workflow state machine |
| app lifecycle pause/resume | pause/cancel/resume semantics in workflow rows |
| `Future.wait` | DAG fan-out with dependency tracking |
| retry interceptor | step-level retry policy with idempotency and backoff |

Useful analogy for onboarding, but backend behavior must be designed for process restarts and at-least-once execution.

---

**Previous:** [11-observability-basics.md](./11-observability-basics.md) - Observability Basics  
**Next:** [13-redis-bullmq.md](./13-redis-bullmq.md) - Redis & BullMQ
