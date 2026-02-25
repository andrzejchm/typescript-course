# 01 - Dart to TypeScript Mental Model

You already know Dart. This lesson translates that knowledge to TypeScript without skipping core differences.

## 1) Beginner foundation

### Structural typing: shape beats declaration

```typescript
interface Job {
  id: string;
  run(): Promise<void>;
}

class EmailJob {
  constructor(public id: string) {}
  async run(): Promise<void> {
    console.log("sending email");
  }
}

const job: Job = new EmailJob("job-1");
```

If the shape matches, assignment usually works.

### `undefined` is a first-class absence value

```typescript
interface User {
  id: string;
  displayName?: string; // string | undefined
}

function greeting(user: User): string {
  return `Hi ${user.displayName ?? "anonymous"}`;
}
```

Optional property (`?`) means the key may be missing and reads as `undefined`.

### Object params scale better than long positional params

```typescript
type CreateUserInput = {
  name: string;
  email: string;
  marketingOptIn?: boolean;
};

function createUser({ name, email, marketingOptIn = false }: CreateUserInput) {
  return { id: crypto.randomUUID(), name, email, marketingOptIn };
}
```

### Compile-time types vs runtime behavior (types are erased)

```typescript
type UserId = string;

function toUserId(value: string): UserId {
  return value;
}
```

`UserId` helps tooling and refactors, but runtime still sees only a plain string.

### Equality rules

```typescript
console.log(0 == "0");  // true (coercion)
console.log(0 === "0"); // false (no coercion)
```

Use `===` and `!==` unless you have a very specific coercion reason.

## 2) Flutter mapping

| Dart / Flutter habit | TypeScript mental model |
|---|---|
| Nominal typing via classes/interfaces | Structural typing by compatible shape |
| `null` as common absence value | `undefined` appears everywhere, especially optional props |
| Named params in function declarations | Object parameter type + destructuring |
| Types exist at runtime for some checks | TS types are removed at runtime |
| `==` often acceptable in Dart | Prefer strict equality `===` in TS/JS |

## 3) Production patterns

- Start function signatures from input/output contracts, not implementation details.
- Use small mapper functions to convert API shapes into app-friendly shapes.
- Default to `const`; only use `let` when reassignment is real.
- Treat external data as untrusted until validated (covered deeper in next lesson).

## 4) Pitfalls

- Expecting `implements`-style nominal guarantees from TS assignments.
- Treating `null` and `undefined` as interchangeable in business logic.
- Assuming type aliases enforce runtime constraints.
- Copying Dart positional constructor patterns into TS APIs.

## 5) Practice tasks

1. Convert one Dart-style API call into an object-parameter TS function.
2. Write a `displayNameOrFallback` helper that handles both `undefined` and `null`.
3. Create two unrelated classes with the same method shape and assign one to an interface of the other.
4. Scan one file and replace loose equality with strict equality.

---

**Previous:** [00-setup.md](./00-setup.md) - Setup  
**Next:** [02-types.md](./02-types.md) - Types
