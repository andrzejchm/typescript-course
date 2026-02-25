# 02 - Types from Basics to Production Contracts

This lesson restores the core type basics first, then moves to boundary-safe production modeling.

## 1) Beginner foundation

### Inference vs explicit annotations (`const` and `let`)

```typescript
const count = 3;        // inferred as 3 (literal)
let total = 3;          // inferred as number (wider, because mutable)
let price: number = 10; // explicit annotation
```

- `const` keeps values stable, so TS can infer narrower literal types more often.
- `let` is mutable, so TS usually widens to a broader type.
- Add explicit annotations when it improves clarity or prevents accidental widening.

### Optional vs nullable (`?`, `undefined`, `null`, `??`)

```typescript
type Profile = {
  nickname?: string; // string | undefined
  bio: string | null;
};

function label(profile: Profile): string {
  return profile.nickname ?? profile.bio ?? "anonymous";
}
```

- `nickname?` means property may be missing (`undefined`).
- `null` is an explicit value, usually "known empty".
- `??` falls back only for `null` or `undefined` (not for empty string or 0).

### Union basics and narrowing

```typescript
type Id = string | number;

function formatId(id: Id): string {
  if (typeof id === "string") {
    return id.toUpperCase();
  }
  return `#${id}`;
}

type ApiError = { message: string };
type ApiOk = { data: { id: string } };

function readResponse(result: ApiError | ApiOk): string {
  if ("data" in result) {
    return result.data.id;
  }
  if (result.message === "not-found") {
    return "missing";
  }
  return result.message;
}
```

Common narrowing tools: `typeof`, `in`, and equality checks.

### Literal widening and `as const`

```typescript
const role = "admin"; // "admin"
let mutableRole = "admin"; // string

const config = {
  env: "dev",
  retry: 3,
} as const;
```

`as const` keeps object values readonly and literal (`"dev"`, `3`) instead of widened (`string`, `number`).

### `unknown` workflow: untrusted -> checked -> trusted

```typescript
type User = { id: string; email: string };

function isUser(value: unknown): value is User {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  return typeof obj.id === "string" && typeof obj.email === "string";
}

function parseUser(json: string): User {
  const raw: unknown = JSON.parse(json);
  if (!isUser(raw)) throw new Error("Invalid user payload");
  return raw;
}
```

Why `as` is not validation:

```typescript
const raw: unknown = JSON.parse('{"id":123}');
const user = raw as User; // compiler trust only, no runtime check
```

`as` changes TypeScript's belief, not the runtime value.

## 2) Flutter mapping

| Dart / Flutter | TypeScript |
|---|---|
| `final` helps immutability | `const` for bindings, `readonly` in type design |
| Nullable type `String?` | Union with `null` and/or `undefined` |
| `is` type checks | `typeof`, `in`, equality checks, custom type guards |
| `Map<String, dynamic>` at boundaries | `unknown` first, then validate and narrow |
| `const` objects/lists | `as const` for readonly literal inference |

## 3) Production patterns

### Separate DTOs from domain models

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

### Use utility types to derive boundary contracts

```typescript
type Account = {
  id: string;
  email: string;
  name: string;
  role: "admin" | "member";
};

type CreateAccountInput = Omit<Account, "id">;
type PatchAccountInput = Partial<Pick<Account, "email" | "name" | "role">>;
type AccountView = Pick<Account, "id" | "email" | "name">;
```

### Keep contract types explicit at boundaries

- Parse external input as `unknown`.
- Validate with type guards or schema libraries.
- Convert DTO -> domain in mapper functions.
- Return stable view/output types from services and controllers.

## 4) Pitfalls

- Reusing wire DTO types everywhere in app logic.
- Using `as SomeType` to silence errors on external data.
- Confusing optional (`?`) with nullable (`| null`) semantics.
- Over-widening literals by using `let` when values should stay fixed.
- Creating giant unions without clear narrowing strategy.

## 5) Practice tasks

1. Write examples that compare `const` inference, `let` widening, and explicit annotation.
2. Model one type with both optional and nullable fields, then add safe defaults with `??`.
3. Build a union type and narrow it with `typeof`, `in`, and equality checks.
4. Replace one unsafe `as` on parsed JSON with `unknown` + type guard validation.
5. Create `OrderDto` and `Order`, then derive `CreateOrderInput` and `PatchOrderInput` using utility types.

Next: [03-functions-async.md](./03-functions-async.md)
