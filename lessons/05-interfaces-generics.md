# 05 - Interfaces, Type Aliases, Generics, and Discriminated Unions

These tools help you model domain concepts safely while keeping APIs ergonomic.

## Why this matters in production

- Correct domain models remove impossible states.
- Generics prevent copy-paste logic across entities.
- Clear `interface` vs `type` usage keeps codebases consistent.

## Core concepts with code

### 1) `interface` vs `type` in practical terms

```typescript
interface Customer {
  id: string;
  email: string;
}

type CustomerId = Customer["id"];
type CustomerWithTier = Customer & { tier: "free" | "pro" };
```

Guideline:
- Use `interface` for object contracts that may be extended/implemented.
- Use `type` for unions, intersections, mapped helpers, and aliases.

### 2) Generics for reusable, type-safe operations

```typescript
function byId<T extends { id: string }>(items: T[], id: string): T | undefined {
  return items.find((item) => item.id === id);
}

const found = byId(
  [{ id: "u1", name: "Ana" }, { id: "u2", name: "Lee" }],
  "u2",
);
```

### 3) Generic API envelope

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

### 4) Discriminated unions for domain state

```typescript
type InvoiceState =
  | { kind: "draft" }
  | { kind: "sent"; sentAtIso: string }
  | { kind: "paid"; paidAtIso: string; txId: string };

function canSend(state: InvoiceState): boolean {
  return state.kind === "draft";
}
```

### 5) Exhaustive handling

```typescript
function labelState(state: InvoiceState): string {
  switch (state.kind) {
    case "draft":
      return "Draft";
    case "sent":
      return `Sent at ${state.sentAtIso}`;
    case "paid":
      return `Paid with ${state.txId}`;
    default: {
      const neverState: never = state;
      return neverState;
    }
  }
}
```

### 6) Dart mapping

| Dart | TypeScript |
|---|---|
| `abstract interface class` | `interface` |
| generic methods/classes | generic functions/types |
| sealed states | discriminated unions |

## Best practices

- Prefer discriminated unions over boolean-flag combinations.
- Constrain generics (`<T extends ...>`) when behavior needs specific fields.
- Keep one naming convention for discriminants (`kind` or `type`).
- Make exhaustive switches a default habit for domain states.

## Common anti-patterns / pitfalls

- Using `any` instead of a generic type parameter.
- Modeling state with multiple booleans (`isLoading`, `isError`, `isSuccess`).
- Mixing `interface` and `type` randomly with no team convention.
- Forgetting exhaustive handling when union variants grow.

## Short practice tasks

1. Replace one boolean-state object with a discriminated union.
2. Write a generic `pluck<T, K extends keyof T>` helper.
3. Add exhaustive `switch` checks to one state-render function.
4. Document your local rule for when to choose `interface` vs `type`.

Next: [06-error-handling.md](./06-error-handling.md)
