# 01 - Dart to TypeScript Mental Model (Production Edition)

You already know Dart. This lesson focuses on where TypeScript behaves differently in ways that affect real systems.

## Why this matters in production

- Most TS bugs are mental-model bugs: nullability, shape compatibility, and runtime vs compile-time assumptions.
- A good Dart -> TS translation layer helps you write predictable code instead of "it compiles, ship it" code.

## Core concepts with code

### 1) Nullability: `undefined` is everywhere

```typescript
interface User {
  id: string;
  displayName?: string; // string | undefined
}

function greeting(user: User): string {
  return `Hi ${user.displayName ?? "anonymous"}`;
}
```

- Dart habit: think `null`.
- TS reality: optional properties are usually `undefined`, not `null`.

### 2) Structural typing (shape over declaration)

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

const job: Job = new EmailJob("job-1"); // OK: same shape
```

In Dart, explicit `implements` matters. In TS, compatible shape is enough.

### 3) Named params -> object params

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

### 4) Runtime values vs erased types

```typescript
type UserId = string;

function toUserId(value: string): UserId {
  return value;
}
```

`UserId` improves readability, but it is not a runtime wrapper. It is just `string` at runtime.

### 5) Equality and coercion

```typescript
console.log(0 == "0");  // true (coercion)
console.log(0 === "0"); // false (safe)
```

Always use `===` / `!==`.

## Best practices

- Default to `const`; use `let` only when reassignment is needed.
- Model absent data with optional fields and `??` defaults.
- Treat `unknown` as the boundary type for external inputs.
- Prefer object params for functions with 3+ arguments.

## Common anti-patterns / pitfalls

- Assuming `null` and `undefined` are interchangeable.
- Expecting nominal typing like Dart (`implements` is not required for compatibility).
- Using type assertions (`as`) as runtime validation.
- Keeping Dart-style positional mega-constructors in TS APIs.

## Short practice tasks

1. Convert a Dart-style function with named args to a TS object-parameter function.
2. Write a type-safe `displayName` function that returns a fallback for `undefined` and `null`.
3. Create two unrelated classes with the same method shape and assign one to an interface typed for the other.
4. Replace `==` with `===` across one file and verify behavior stays correct.

Next: [02-types.md](./02-types.md)
