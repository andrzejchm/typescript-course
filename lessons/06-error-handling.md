# 06 - Error Handling, Validation, and Propagation Strategy

Reliable systems handle failure deliberately.
Start from the basics, then layer production structure on top.

## 1) Foundation concepts (clear and simple)

### Basic `try/catch`

```typescript
function parseAmount(raw: string): number {
  try {
    const value = Number(raw);
    if (Number.isNaN(value)) {
      throw new Error("amount must be a number");
    }
    return value;
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error(`Invalid amount: ${error.message}`);
    }
    throw new Error("Invalid amount: unknown error");
  }
}
```

Important beginner point: in TypeScript, the `catch` variable is `unknown`.
You must narrow it (for example with `instanceof Error`) before using `.message`.

### TypeScript types are compile-time only

TypeScript helps before runtime. It does not validate incoming JSON, HTTP payloads, env vars, or queue messages at runtime.

```typescript
type User = { email: string };

const data = JSON.parse('{"email": 123}') as User;
// Compiles, but runtime value is wrong.
```

You still need runtime validation for external data.

### When to handle locally vs rethrow

- Handle locally when you can recover meaningfully (fallback, retry, default behavior).
- Rethrow when the current layer cannot decide safely; let a higher boundary translate.

## 2) Flutter mapping

| Flutter/Dart | TypeScript |
|---|---|
| `try/catch` with `on FormatException` | `try/catch` + `instanceof` narrowing |
| custom `Exception` classes | custom `Error` classes |
| validate JSON/model input | runtime schema validation (for example Zod) |
| map domain failures to UI states | map typed errors to HTTP/transport responses |

If you map exceptions to user-friendly states in Flutter, do the same mapping at API boundaries in TypeScript.

## 3) Production patterns

### Small shared error taxonomy

```typescript
type ErrorKind = "validation" | "not_found" | "conflict" | "dependency" | "internal";

class AppError extends Error {
  constructor(
    public kind: ErrorKind,
    message: string,
    public metadata: Record<string, unknown> = {},
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "AppError";
  }
}
```

### Throw typed errors with context

```typescript
function requireEmail(email: string | undefined): string {
  if (!email) {
    throw new AppError("validation", "email is required", { field: "email" });
  }
  return email;
}
```

### Boundary translation (catch low, translate once)

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

### Runtime validation with Zod at trust boundaries

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

### Transport-safe mapping and logging context

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

function logError(error: unknown, context: Record<string, unknown>): void {
  if (error instanceof AppError) {
    console.error("app_error", { kind: error.kind, message: error.message, ...context, ...error.metadata });
    return;
  }
  console.error("unknown_error", { error, ...context });
}
```

## 4) Pitfalls

- Swallowing errors (`catch {}`) and returning fake success.
- Throwing raw strings instead of `Error`/`AppError` objects.
- Trusting `as SomeType` for external data without runtime validation.
- Mapping all failures to `500` with no distinction.
- Logging errors without request/user/context metadata.

## 5) Short practice tasks

1. Update one `catch` block to narrow `error: unknown` with `instanceof Error`.
2. Add an `AppError` with at least three kinds (`validation`, `not_found`, `dependency`).
3. Validate one incoming HTTP payload with Zod before business logic.
4. Implement `toHttpStatus(error)` and decide where to rethrow vs handle locally in one flow.

Next: [07-express-basics.md](./07-express-basics.md)
