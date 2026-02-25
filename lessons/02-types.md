# 02 - Types for Domain Boundaries and API Contracts

TypeScript is most valuable at boundaries: request/response, persistence, and message passing.

## Why this matters in production

- Domain modeling reduces invalid states.
- Clear API contracts prevent accidental breaking changes.
- Utility types let you evolve contracts safely without duplicating models.

## Core concepts with code

### 1) Separate external DTOs from internal domain models

```typescript
type UserDto = {
  id: string;
  full_name: string;
  created_at: string;
};

type User = {
  id: string;
  fullName: string;
  createdAt: Date;
};

function mapUser(dto: UserDto): User {
  return {
    id: dto.id,
    fullName: dto.full_name,
    createdAt: new Date(dto.created_at),
  };
}
```

Do not leak wire format through the whole app.

### 2) Constrain state with literal unions

```typescript
type PaymentStatus = "pending" | "authorized" | "captured" | "failed";

type Payment = {
  id: string;
  status: PaymentStatus;
};
```

This is lighter than enums and prevents invalid strings.

### 3) Use utility types in realistic flows

```typescript
type User = {
  id: string;
  email: string;
  name: string;
  role: "admin" | "member";
};

type CreateUserInput = Omit<User, "id">;
type UpdateUserInput = Partial<Pick<User, "email" | "name" | "role">>;
type UserView = Pick<User, "id" | "email" | "name">;
```

### 4) Dictionary-like structures with `Record`

```typescript
type FeatureFlags = Record<string, boolean>;

const flags: FeatureFlags = {
  newCheckout: true,
  betaBanner: false,
};
```

### 5) Prefer `unknown` at trust boundaries

```typescript
function parseJson(input: string): unknown {
  return JSON.parse(input);
}
```

`unknown` forces explicit narrowing instead of unsafe access.

## Best practices

- Model domain types around business meaning, not transport quirks.
- Keep boundary mappers explicit and testable.
- Use utility types to derive variants from one source model.
- Avoid `any`; start with `unknown` and narrow deliberately.

## Common anti-patterns / pitfalls

- Reusing API DTO types as domain types everywhere.
- Copy-pasting near-identical type definitions.
- Using `as User` on parsed JSON without validation.
- Overusing massive unions where a discriminated union is clearer.

## Short practice tasks

1. Define `OrderDto` and `Order` where date strings become `Date` values in a mapper.
2. Create `CreateOrderInput` and `PatchOrderInput` from one `Order` type using utility types.
3. Replace one `any` API response with `unknown` and add narrowing.
4. Add a `Status` union to one model and remove raw string literals in callers.

Next: [03-functions-async.md](./03-functions-async.md)
