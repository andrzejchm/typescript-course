# 05 - Interfaces, Type Aliases, Generics, and Discriminated Unions

This lesson builds from beginner basics to production-safe modeling.

## 1) Foundation concepts (clear and simple)

### `interface` vs `type` with beginner examples

Both describe shapes in TypeScript.

```typescript
interface User {
  id: string;
  email: string;
}

type UserRole = "admin" | "member";
```

Use this rule of thumb in production:
- `interface`: object contracts that classes or modules may implement/extend.
- `type`: unions, intersections, aliases, mapped/utility-style compositions.

### Generics, step by step

#### Step A: simple generic function

```typescript
function first<T>(items: T[]): T | undefined {
  return items[0];
}

const a = first([10, 20]); // number | undefined
const b = first(["x", "y"]); // string | undefined
```

`T` means "some type provided later".

#### Step B: generic interface

```typescript
interface ApiResponse<T> {
  ok: boolean;
  data: T;
}

const userResponse: ApiResponse<{ id: string; name: string }> = {
  ok: true,
  data: { id: "u1", name: "Ana" },
};
```

#### Step C: constrained generic (`extends`)

```typescript
function byId<T extends { id: string }>(items: T[], id: string): T | undefined {
  return items.find((item) => item.id === id);
}
```

Constraint means: `T` can vary, but must include `id: string`.

#### Step D: `keyof` and indexed access `T[K]`

```typescript
function pluck<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

const email = pluck({ id: "u1", email: "a@example.com" }, "email");
// email: string
```

`keyof T` = all valid keys of `T`. `T[K]` = value type at that key.

### Discriminated unions in simple terms

A discriminated union is one object type with multiple valid variants, each with a clear tag field.

```typescript
type PaymentState =
  | { kind: "pending" }
  | { kind: "failed"; reason: string }
  | { kind: "paid"; receiptId: string };
```

The `kind` field lets TypeScript narrow safely.

### Exhaustive checks (catch missing cases early)

```typescript
function paymentLabel(state: PaymentState): string {
  switch (state.kind) {
    case "pending":
      return "Pending";
    case "failed":
      return `Failed: ${state.reason}`;
    case "paid":
      return `Paid (${state.receiptId})`;
    default: {
      const neverState: never = state;
      return neverState;
    }
  }
}
```

If a new variant is added and not handled, this pattern fails at compile time.

## 2) Flutter mapping

| Flutter/Dart | TypeScript |
|---|---|
| generic classes/functions (`Result<T>`) | generic types/functions (`ApiResponse<T>`) |
| `sealed class` states | discriminated unions (`kind: ...`) |
| `switch` over sealed types | exhaustive `switch` + `never` check |
| interface/abstract contracts | `interface` contracts |

If you model Bloc/Cubit states as sealed classes in Dart, discriminated unions are the closest TypeScript equivalent.

## 3) Production patterns

### Consistent interface/type convention

- Use `interface` for DTO/entity-like object contracts.
- Use `type` for unions (`A | B`), intersections (`A & B`), and aliases.
- Keep this consistent repo-wide to reduce review noise.

### Reusable generic envelopes

```typescript
type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };

function unwrap<T>(result: ApiResult<T>): T {
  if (!result.ok) {
    throw new Error(`${result.error.code}: ${result.error.message}`);
  }
  return result.data;
}
```

### Prefer explicit state modeling over boolean flags

Instead of `{ isLoading, isError, isSuccess }`, use one discriminated union state.

## 4) Pitfalls

- Reaching for `any` instead of a generic parameter.
- Using unconstrained generics when logic requires specific fields.
- Mixing `interface` and `type` randomly with no team convention.
- Forgetting exhaustive switches when union variants grow.

## 5) Short practice tasks

1. Write `first<T>(items: T[])` and use it with numbers and strings.
2. Build `ApiResponse<T>` and apply it to two different payloads.
3. Implement `pluck<T, K extends keyof T>(obj, key)` and test inferred return types.
4. Replace one boolean-heavy UI/domain state with a discriminated union plus exhaustive switch.

Next: [06-error-handling.md](./06-error-handling.md)
