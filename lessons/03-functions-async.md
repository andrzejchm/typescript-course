# 03 - Functions and Async from Basics to Production

This lesson starts with Promise fundamentals, then layers in production-safe async patterns.

## 1) Beginner foundation

### Promise fundamentals

- A `Promise<T>` represents a value that is not ready yet.
- It can be `pending`, `fulfilled`, or `rejected`.
- `await` pauses only the current async function, not the whole process.

```typescript
function delayedValue(): Promise<number> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(42), 100);
  });
}

async function demo() {
  const value = await delayedValue();
  return value + 1;
}
```

### `async`/`await` behavior

```typescript
async function parseAmount(input: string): Promise<number> {
  const amount = Number(input);
  if (Number.isNaN(amount)) {
    throw new Error("Invalid amount");
  }
  return amount;
}
```

- `async` function always returns a Promise.
- `throw` inside `async` becomes a rejected Promise.

### Sequential vs parallel execution

Sequential (step B depends on step A):

```typescript
async function loadOrderFlow(orderId: string) {
  const order = await fetchOrder(orderId);
  const invoice = await fetchInvoice(order.invoiceId);
  return { order, invoice };
}
```

Parallel (independent calls):

```typescript
async function loadDashboard(userId: string) {
  const [profile, notifications] = await Promise.all([
    fetchProfile(userId),
    fetchNotifications(userId),
  ]);
  return { profile, notifications };
}
```

Use parallelism only when operations are independent.

## 2) Flutter mapping

| Dart / Flutter | TypeScript / Node |
|---|---|
| `Future<T>` | `Promise<T>` |
| `await` in `async` function | same model with `async`/`await` |
| `Future.wait([...])` | `Promise.all([...])` |
| `Future.wait` with error handling variants | `Promise.allSettled([...])` |
| cancellation patterns (`CancelableOperation`, stream cancel) | `AbortController` + `AbortSignal` |

## 3) Production patterns

### Function signatures as contracts

```typescript
type CreateInvoiceInput = {
  customerId: string;
  amountCents: number;
  dueDateIso: string;
};

async function createInvoice(input: CreateInvoiceInput): Promise<{ id: string }> {
  return { id: `inv_${input.customerId}` };
}
```

### Partial-failure handling with `Promise.allSettled`

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

### Cancellation with `AbortController`

```typescript
async function fetchUser(userId: string, signal: AbortSignal) {
  const response = await fetch(`/api/users/${userId}`, { signal });
  return response.json();
}
```

Pass `signal` through your async stack so requests can stop promptly.

### Timeout wrapper

```typescript
async function withTimeout<T>(
  task: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await task(controller.signal);
  } finally {
    clearTimeout(timer);
  }
}
```

### Avoid event-loop blocking

```typescript
function expensiveSyncWork(input: number[]): number {
  return input.reduce((acc, n) => acc + n * n, 0);
}
```

In Node.js, heavy sync CPU work blocks all requests in that process. Move heavy work to workers, queues, or separate services.

## 4) Pitfalls

- Accidentally serializing independent work with `await` in sequence.
- Fire-and-forget Promises without error handling.
- Using `Promise.all` when one failure should not fail everything.
- Ignoring cancellation and timeout requirements in network paths.
- Doing CPU-heavy loops inside request handlers.

## 5) Practice tasks

1. Convert one sequential pair of independent fetches to `Promise.all`.
2. Add `AbortSignal` support to one API helper and propagate it from caller to callee.
3. Wrap one network operation with `withTimeout` and verify abort behavior.
4. Replace one `Promise.all` use with `Promise.allSettled` where partial results are acceptable.
5. Find one sync CPU-heavy function and propose how to move it off the request path.

---

**Previous:** [02-types.md](./02-types.md) - Types  
**Next:** [04-arrays-objects.md](./04-arrays-objects.md) - Arrays & Objects
