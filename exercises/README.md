# Exercises: From Practice to Production

This folder is designed so you can keep the current exercise implementations and still train production habits on top of them.

## How Exercises Are Organized

- `01`-`06` files in `exercises/` are starter implementations with TODOs.
- Matching files in `exercises/solutions/` are reference implementations.
- Each exercise runs standalone with `tsx` and prints quick runtime checks.
- Treat starter files as the coding surface and solutions as last-resort diff checks.

## Suggested Learning Order

Follow this progression to move from core TypeScript to production engineering:

1. **Fundamentals**
   - `exercises/01-array-transform.ts`
   - `exercises/02-type-safe-event-emitter.ts`
   - `exercises/04-discriminated-unions.ts`
   - `exercises/06-utility-functions.ts`
2. **Reliability**
   - `exercises/03-async-task-queue.ts`
   - revisit `exercises/06-utility-functions.ts` (`retry`, `memoize`) with failure and load scenarios
3. **API**
   - `exercises/05-todo-api.ts`
4. **Workflows**
   - add tests, CI checks, and production hardening tasks across all exercises

## Definition of Done (Per Exercise)

For each exercise, consider it complete only when these five areas are covered.

### 01 Array Transformations

- **Types:** function signatures and return types are explicit and strict-safe.
- **Validation:** edge cases handled (`[]`, unknown department, missing groups).
- **Errors:** avoid throws for normal flow; use deterministic defaults (e.g., empty results).
- **Tests:** add Vitest cases for happy path, empty input, and tie/ordering behavior.
- **Logging:** optional debug logs behind a toggle for transformation steps.

### 02 Type-Safe Event Emitter

- **Types:** `on`, `off`, `emit` enforce exact event name and payload typing.
- **Validation:** defensive checks for duplicate registrations and unknown removal attempts.
- **Errors:** handler failures are isolated so one bad handler does not break all listeners.
- **Tests:** cover subscribe/unsubscribe, multiple handlers, no-handler emit, type guarantees.
- **Logging:** structured event logs include event name, listener count, and failure metadata.

### 03 Async Task Queue

- **Types:** generic `add<T>` preserves task result typing end to end.
- **Validation:** reject invalid constructor input (`concurrency < 1`).
- **Errors:** propagate task rejection correctly and continue draining queue safely.
- **Tests:** concurrency cap, ordering guarantees, rejection behavior, queue drain completion.
- **Logging:** per-task lifecycle logs (queued, started, completed, failed, duration).

### 04 Discriminated Unions

- **Types:** `ApiResponse<T>` union is exhaustive and `switch` handling is fully narrowed.
- **Validation:** mapping/chaining preserve non-success variants exactly.
- **Errors:** domain errors preserve code/message through transforms.
- **Tests:** assert `handleResponse`, `mapResponse`, `chainResponse` for success/loading/error.
- **Logging:** log response transitions for traceability in async flows.

### 05 Todo API

- **Types:** request/response types and Todo model are explicit and consistent.
- **Validation:** Zod validates create/update payloads and query filters.
- **Errors:** return stable error JSON with correct status codes (`400`, `404`, `500`).
- **Tests:** add API tests for CRUD, validation failures, and not-found paths.
- **Logging:** structured request/error logs with method, path, status, latency, and id.

### 06 Utility Functions

- **Types:** generics preserve argument and return typing for all utilities.
- **Validation:** guard invalid params (negative delays, invalid retries) with clear messages.
- **Errors:** retry rethrows final error with attempt context; no swallowed exceptions.
- **Tests:** deterministic tests with fake timers for `debounce` and retry delay behavior.
- **Logging:** optional instrumentation for cache hits/misses and retry attempts.

## Verification Commands

Use these commands while working on exercises:

```bash
npm run exercise exercises/01-array-transform.ts
npm run exercise exercises/02-type-safe-event-emitter.ts
npm run exercise exercises/03-async-task-queue.ts
npm run exercise exercises/04-discriminated-unions.ts
npm run exercise exercises/05-todo-api.ts
npm run exercise exercises/06-utility-functions.ts
```

For the API exercise:

```bash
curl http://localhost:3000/todos
curl -X POST http://localhost:3000/todos -H "Content-Type: application/json" -d '{"title":"Buy milk"}'
curl http://localhost:3000/todos/1
curl -X PATCH http://localhost:3000/todos/1 -H "Content-Type: application/json" -d '{"completed":true}'
curl -X DELETE http://localhost:3000/todos/1
curl "http://localhost:3000/todos?completed=false"
```

When you add automated tests:

```bash
npm run test
```

## Production Hardening Extensions

Use these as next steps without rewriting the core exercise goals:

- `01`: add input schema checks and performance tests for large arrays.
- `02`: add once-handlers, max-listener limits, and async handler support.
- `03`: add queue pause/resume, cancellation, timeout, and backpressure metrics.
- `04`: split transport vs domain errors and add typed error categories.
- `05`: add request ids, centralized error formatter, pagination, and persistence layer.
- `06`: add property-based tests, timer abstraction, and cache eviction policy.

If you want a reusable gate before marking any exercise as complete, use `exercises/CHECKLIST.md`.
