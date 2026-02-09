# 06 — Error Handling & Validation

Everything about catching errors, building safe APIs, and validating data at runtime. Code-heavy, Dart comparisons where they help.

## 1. Try/Catch in TypeScript

```typescript
try {
  const data = JSON.parse(input);
} catch (error) {
  // error is `unknown` in strict mode (not Error!)
  if (error instanceof Error) {
    console.error(error.message);
  }
}
```

> **Key difference from Dart:** Caught errors are `unknown`, not typed. You **must** narrow with `instanceof` before accessing properties. In Dart, you can `catch (e)` and get a typed `Exception` — TS gives you nothing until you check.

```typescript
// Dart-style "on TypeError catch (e)" equivalent:
try {
  riskyOperation();
} catch (error) {
  if (error instanceof TypeError) {
    console.error("Type error:", error.message);
  } else if (error instanceof RangeError) {
    console.error("Range error:", error.message);
  } else {
    throw error; // re-throw unknown errors
  }
}
```

`finally` works the same as Dart:

```typescript
try {
  const file = openFile("data.txt");
  processFile(file);
} catch (error) {
  if (error instanceof Error) console.error(error.message);
} finally {
  cleanup(); // always runs
}
```

---

## 2. Custom Error Classes

```typescript
class NotFoundError extends Error {
  constructor(public resource: string, public id: string) {
    super(`${resource} with id ${id} not found`);
    this.name = "NotFoundError";
  }
}

class ValidationError extends Error {
  constructor(public field: string, message: string) {
    super(message);
    this.name = "ValidationError";
  }
}
```

Usage:

```typescript
function getUser(id: string): User {
  const user = users.find((u) => u.id === id);
  if (!user) throw new NotFoundError("User", id);
  return user;
}

try {
  const user = getUser("999");
} catch (error) {
  if (error instanceof NotFoundError) {
    console.error(`${error.resource} ${error.id} not found`);
  }
}
```

> **Dart comparison:** Same pattern as extending `Exception` or `Error` in Dart. The `this.name = "NotFoundError"` line ensures the error prints with the correct name (otherwise it shows "Error").

---

## 3. Result Pattern (No Exceptions)

A functional approach — return success or failure instead of throwing:

```typescript
type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

function divide(a: number, b: number): Result<number, string> {
  if (b === 0) return { success: false, error: "Division by zero" };
  return { success: true, data: a / b };
}

const result = divide(10, 0);
if (result.success) {
  console.log(result.data); // TS knows data exists
} else {
  console.log(result.error); // TS knows error exists
}
```

> **Dart comparison:** This is like `dartz` `Either<L, R>` or the `result` package's `Result<S, F>`. The discriminated union (`success: true | false`) gives TS the same exhaustive narrowing.

A more realistic example:

```typescript
type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

async function fetchUser(id: string): Promise<Result<User, string>> {
  try {
    const response = await fetch(`/api/users/${id}`);
    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` };
    }
    const user = await response.json();
    return { success: true, data: user };
  } catch {
    return { success: false, error: "Network error" };
  }
}

// Caller never needs try/catch
const result = await fetchUser("123");
if (!result.success) {
  console.error(result.error);
  return;
}
console.log(result.data.name); // fully typed
```

---

## 4. Zod for Runtime Validation

TypeScript types are **erased at runtime**. When data comes from outside (API requests, env vars, JSON files), you need runtime validation. Zod is the standard tool.

```typescript
import { z } from "zod";

// Define schema (like freezed + json_serializable combined!)
const UserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  age: z.number().int().positive().optional(),
});

// Infer TypeScript type from schema
type User = z.infer<typeof UserSchema>;
// → { name: string; email: string; age?: number }

// Validate at runtime
const result = UserSchema.safeParse(unknownData);
if (result.success) {
  const user: User = result.data; // fully typed!
} else {
  console.error(result.error.issues);
  // [{ code: 'too_small', minimum: 1, path: ['name'], message: '...' }]
}
```

Common Zod patterns:

```typescript
// Throw on invalid data (use for trusted sources)
const user = UserSchema.parse(data); // throws ZodError if invalid

// Nested objects
const OrderSchema = z.object({
  id: z.string().uuid(),
  items: z.array(
    z.object({
      productId: z.string(),
      quantity: z.number().int().positive(),
    }),
  ),
  status: z.enum(["pending", "shipped", "delivered"]),
});

// Transform during validation
const EnvSchema = z.object({
  PORT: z.string().transform(Number), // string → number
  DEBUG: z
    .string()
    .transform((s) => s === "true")
    .default("false"),
});
```

> **Dart comparison:** Zod replaces the need for `json_serializable` + `freezed` + manual validation. One tool does schema definition, type inference, and runtime validation.

---

## 5. Null/Undefined Handling Patterns

```typescript
// Optional chaining (same as Dart's ?.)
const city = user?.address?.city;

// Nullish coalescing (same as Dart's ??)
const name = input ?? "Anonymous";

// Non-null assertion (use sparingly! like Dart's !)
const element = document.getElementById("app")!;

// Nullish coalescing assignment
count ??= 0; // same as: count = count ?? 0
```

### Type Guard Function

```typescript
function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

const items = [1, null, 2, undefined, 3].filter(isDefined);
// items: number[] — nulls and undefineds removed, type narrowed!
```

### Exhaustive Null Checks

```typescript
function getDisplayName(user: User): string {
  // Handle all the nullable fields
  const first = user.firstName ?? "";
  const last = user.lastName ?? "";
  const full = `${first} ${last}`.trim();
  return full || user.email; // fallback to email if name is empty
}
```

| Dart | TypeScript | Purpose |
|------|-----------|---------|
| `x?.y` | `x?.y` | Optional chaining |
| `x ?? y` | `x ?? y` | Nullish coalescing |
| `x!` | `x!` | Non-null assertion |
| `x ??= y` | `x ??= y` | Nullish assignment |
| `if (x != null)` | `if (x != null)` | Null check (one of the few valid uses of `!=`) |

---

## Quick Reference

| Pattern | When to Use |
|---------|-------------|
| `try/catch` + `instanceof` | Catching errors from libraries, JSON parsing, network calls |
| Custom error classes | When you need typed errors with extra context |
| Result pattern | When you want to force callers to handle errors (no surprise throws) |
| Zod `.safeParse()` | Validating external data (API inputs, env vars, user input) |
| Zod `.parse()` | Validating trusted data where failure = bug |
| `?.` / `??` | Accessing potentially missing data |
| Type guard functions | Filtering arrays, reusable null checks |

---

**Next:** [07-express-basics.md](./07-express-basics.md) — Building REST APIs with Express
