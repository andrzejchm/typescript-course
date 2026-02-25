# 06 - Error Handling, Validation, and Propagation Strategy

Production systems need predictable failure behavior, not just `try/catch` blocks.

## Why this matters in production

- Different failures need different actions (retry, alert, user message, fail fast).
- Typed errors improve observability and recovery.
- Runtime validation protects trust boundaries where TypeScript cannot.

## Core concepts with code

### 1) Error taxonomy (operational vs programmer)

```typescript
type ErrorKind = "validation" | "not_found" | "conflict" | "dependency" | "internal";

class AppError extends Error {
  constructor(
    public kind: ErrorKind,
    message: string,
    public metadata: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = "AppError";
  }
}
```

### 2) Throw typed errors with context

```typescript
function requireEmail(email: string | undefined): string {
  if (!email) {
    throw new AppError("validation", "email is required", { field: "email" });
  }
  return email;
}
```

### 3) Runtime validation with Zod at boundaries

```typescript
import { z } from "zod";

const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
});

type CreateUserInput = z.infer<typeof CreateUserSchema>;

function parseCreateUser(payload: unknown): CreateUserInput {
  const result = CreateUserSchema.safeParse(payload);
  if (!result.success) {
    throw new AppError("validation", "invalid create user payload", {
      issues: result.error.issues,
    });
  }
  return result.data;
}
```

### 4) Propagate with translation at layer boundaries

```typescript
async function getUserOrThrow(id: string) {
  const response = await fetch(`https://example.com/users/${id}`);
  if (response.status === 404) {
    throw new AppError("not_found", "user not found", { id });
  }
  if (!response.ok) {
    throw new AppError("dependency", "user service failed", { status: response.status });
  }
  return response.json();
}
```

Catch low, translate once, and rethrow typed errors upward.

### 5) Convert errors to transport-safe responses

```typescript
function toHttpStatus(error: unknown): number {
  if (error instanceof AppError) {
    if (error.kind === "validation") return 400;
    if (error.kind === "not_found") return 404;
    if (error.kind === "conflict") return 409;
    if (error.kind === "dependency") return 502;
  }
  return 500;
}
```

### 6) Dart mapping

| Dart | TypeScript |
|---|---|
| custom `Exception` hierarchy | custom `Error` classes |
| `try/catch` with typed checks | `try/catch` + `instanceof` narrowing |
| JSON validation packages | Zod runtime schemas + inferred types |

## Best practices

- Define a small shared error taxonomy for the whole service.
- Add metadata needed for logs/alerts, but avoid leaking secrets.
- Validate all external inputs (`HTTP`, env vars, queues, files).
- Keep one consistent propagation rule per layer.

## Common anti-patterns / pitfalls

- Catching and swallowing errors.
- Throwing raw strings instead of `Error` objects.
- Returning unvalidated `JSON.parse` data as trusted types.
- Mapping every failure to `500` with no context.

## Short practice tasks

1. Introduce an `AppError` type in one module and replace string throws.
2. Add a Zod schema to validate one incoming payload before business logic.
3. Implement `toHttpStatus(error)` and map at least 3 typed error kinds.
4. Audit one catch block and remove swallowed errors.

Next: [07-express-basics.md](./07-express-basics.md)
