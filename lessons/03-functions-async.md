# 03 - Functions and Async in Production

This lesson focuses on async correctness, bounded concurrency, cancellation, and event-loop safety.

## Why this matters in production

- Async mistakes cause latency spikes, duplicate work, and stuck requests.
- Good function signatures reduce misuse and make refactors safer.
- Event-loop blocking can take down throughput even when code is "correct".

## Core concepts with code

### 1) Function signatures as contracts

```typescript
type CreateInvoiceInput = {
  customerId: string;
  amountCents: number;
  dueDateIso: string;
};

function createInvoice(input: CreateInvoiceInput): { id: string } {
  return { id: `inv_${input.customerId}` };
}
```

Object parameters scale better than long positional args.

### 2) Sequential vs parallel work

```typescript
async function loadDashboard(userId: string) {
  const [profile, notifications] = await Promise.all([
    fetchProfile(userId),
    fetchNotifications(userId),
  ]);

  return { profile, notifications };
}
```

Use `Promise.all` only when tasks are independent.

### 3) Handle partial failure with `Promise.allSettled`

```typescript
const results = await Promise.allSettled([
  fetchProfile("u1"),
  fetchRecommendations("u1"),
]);

for (const result of results) {
  if (result.status === "rejected") {
    console.error("dependency failed", result.reason);
  }
}
```

### 4) Cancellation basics with `AbortController`

```typescript
async function fetchWithTimeout(url: string, timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}
```

### 5) Avoid blocking the event loop

```typescript
function expensiveSyncWork(input: number[]): number {
  // Simulated CPU-heavy operation
  return input.reduce((acc, n) => acc + n * n, 0);
}

// Better: run heavy CPU tasks outside request path (worker/queue).
```

In Node.js, CPU-heavy sync code blocks all requests on that process.

### 6) Dart mapping

| Dart | TypeScript |
|---|---|
| `Future<T>` | `Promise<T>` |
| `Future.wait` | `Promise.all` |
| cancellation via `CancelableOperation` patterns | `AbortController` |

## Best practices

- Prefer `async/await` over mixed `.then()` chains.
- Keep async functions small and explicit about return types.
- Use timeouts/cancellation for network operations.
- Bound fan-out when calling many downstream services.

## Common anti-patterns / pitfalls

- `await` inside loops when parallelism is safe and needed.
- Fire-and-forget promises with no error handling.
- Ignoring cancellation signals in long request paths.
- Running expensive synchronous work in HTTP handlers.

## Short practice tasks

1. Refactor sequential API calls into `Promise.all` where safe.
2. Add timeout + abort support to one `fetch` helper.
3. Convert a `.then()` chain into `async/await` with explicit error propagation.
4. Find one loop with `await` and justify whether it should stay sequential.

Next: [04-arrays-objects.md](./04-arrays-objects.md)
