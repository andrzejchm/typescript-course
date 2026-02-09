# 05 — Interfaces & Generics

Interfaces define object shapes. Generics make code reusable across types. Both work similarly to Dart — with one critical difference: TypeScript uses **structural typing**, not nominal typing.

---

## Interfaces In Depth

```typescript
interface User {
  id: string;
  name: string;
  email?: string;           // optional — like String? in Dart
  readonly createdAt: Date;  // can't modify after creation
}

const user: User = {
  id: "1",
  name: "Alice",
  createdAt: new Date(),
};

user.name = "Bob";       // ✅ OK
user.createdAt = new Date(); // ❌ Error: cannot assign to 'createdAt'
```

### Extending Interfaces

```typescript
interface Admin extends User {
  permissions: string[];
}

// Multiple extension — Dart needs `implements A, B`
interface Auditable {
  lastModifiedBy: string;
  lastModifiedAt: Date;
}

interface SuperAdmin extends Admin, Auditable {
  superPower: string;
}

const sa: SuperAdmin = {
  id: "1",
  name: "Alice",
  createdAt: new Date(),
  permissions: ["all"],
  lastModifiedBy: "system",
  lastModifiedAt: new Date(),
  superPower: "mass-delete",
};
```

> **Dart comparison** — Dart uses `extends` for single inheritance and `implements` for multiple interfaces. TypeScript interfaces can `extends` multiple interfaces directly. And since interfaces are purely compile-time, there's no runtime cost.

---

## Structural Typing (THE Key Difference From Dart)

This is the single most important concept for a Dart developer to internalize.

```typescript
interface Printable {
  toString(): string;
}

class Dog {
  toString() {
    return "Woof";
  }
}

// Dog never mentions Printable — but this works!
const p: Printable = new Dog(); // ✅
```

**Dart is nominal** — a class must explicitly `implements Printable` to be assignable to `Printable`. **TypeScript is structural** — if the shape matches, it's compatible. Period.

This is called **"duck typing"**: if it walks like a duck and quacks like a duck, it's a duck.

```typescript
interface HasLength {
  length: number;
}

// All of these satisfy HasLength — none "implement" it
const a: HasLength = "hello";       // ✅ string has .length
const b: HasLength = [1, 2, 3];     // ✅ array has .length
const c: HasLength = { length: 42 }; // ✅ plain object with .length
```

> **Why this matters in interviews** — You'll see functions that accept an interface parameter. Any object with the right shape can be passed in — no class hierarchy needed. This enables patterns that are impossible in Dart.

---

## Generics Basics

The syntax is identical to Dart. If you know Dart generics, you already know this.

```typescript
// Generic function
function identity<T>(value: T): T {
  return value;
}

const str = identity("hello"); // type: string
const num = identity(42);      // type: number (inferred!)
```

### Generic Interfaces

```typescript
interface ApiResponse<T> {
  data: T;
  status: number;
  message: string;
}

const userResponse: ApiResponse<User> = {
  data: { id: "1", name: "Alice", createdAt: new Date() },
  status: 200,
  message: "OK",
};
```

### Generic Type Aliases

```typescript
// Default type parameter — E defaults to Error if not specified
type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

function parseNumber(input: string): Result<number> {
  const n = Number(input);
  if (isNaN(n)) {
    return { ok: false, error: new Error(`"${input}" is not a number`) };
  }
  return { ok: true, value: n };
}

const result = parseNumber("42");
if (result.ok) {
  console.log(result.value); // type: number
} else {
  console.log(result.error); // type: Error
}
```

> **Dart comparison** — Dart doesn't have default type parameters. `Result<T, E = Error>` would require you to always specify both types in Dart.

---

## Generic Constraints

Constrain what types `T` can be — same concept as Dart's `extends` in generics.

```typescript
// Dart: void process<T extends Comparable>(T value)
// TS:   function process<T extends Comparable>(value: T)

// Constrain to objects with a .length property
function getLength<T extends { length: number }>(item: T): number {
  return item.length;
}

getLength("hello");     // ✅ string has .length
getLength([1, 2, 3]);   // ✅ array has .length
getLength(42);           // ❌ Error: number doesn't have .length
```

### Constraint With an Interface

```typescript
interface HasId {
  id: string;
}

function findById<T extends HasId>(items: T[], id: string): T | undefined {
  return items.find(item => item.id === id);
}

const users = [
  { id: "1", name: "Alice", age: 30 },
  { id: "2", name: "Bob", age: 25 },
];

const found = findById(users, "1");
// type: { id: string; name: string; age: number } | undefined
// Full type preserved — not just HasId!
```

Notice that `T` preserves the full type of the items, not just `HasId`. This is why generics are better than just accepting `HasId[]` directly.

---

## `keyof` and Indexed Access Types

**No Dart equivalent.** This is one of TypeScript's most powerful features.

### `keyof` — get all property names as a union

```typescript
interface User {
  name: string;
  age: number;
  email: string;
}

type UserKey = keyof User; // "name" | "age" | "email"
```

### Type-safe property access

```typescript
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

const user: User = { name: "Alice", age: 30, email: "a@b.com" };

const name = getProperty(user, "name");   // type: string
const age = getProperty(user, "age");     // type: number
getProperty(user, "phone");               // ❌ Error: "phone" not in keyof User
```

The return type `T[K]` is an **indexed access type** — it looks up the type of property `K` on type `T`. So `User["name"]` is `string`, `User["age"]` is `number`.

> **Why this matters** — This pattern shows up constantly in utility functions, form libraries, and state management. Interviewers use it to test your understanding of the type system.

---

## Discriminated Unions (Like Dart Sealed Classes!)

This is THE pattern for modeling variants in TypeScript. Every variant shares a common **discriminant** property (usually called `kind`, `type`, or `tag`) with a unique literal value.

```typescript
type Shape =
  | { kind: "circle"; radius: number }
  | { kind: "rectangle"; width: number; height: number }
  | { kind: "triangle"; base: number; height: number };

function area(shape: Shape): number {
  switch (shape.kind) {
    case "circle":
      return Math.PI * shape.radius ** 2;
    case "rectangle":
      return shape.width * shape.height;
    case "triangle":
      return 0.5 * shape.base * shape.height;
  }
}
```

TypeScript narrows the type inside each `case` branch — you get autocomplete for `radius` only in the `"circle"` case.

### Exhaustiveness Checking

Add a `default` branch that catches unhandled cases at compile time:

```typescript
function area(shape: Shape): number {
  switch (shape.kind) {
    case "circle":
      return Math.PI * shape.radius ** 2;
    case "rectangle":
      return shape.width * shape.height;
    case "triangle":
      return 0.5 * shape.base * shape.height;
    default:
      // If you add a new Shape variant and forget to handle it,
      // this line will produce a compile error
      const _exhaustive: never = shape;
      return _exhaustive;
  }
}
```

> **Dart comparison** — This is the TypeScript equivalent of Dart's `sealed class` + `switch` expression. The `never` trick is like Dart's exhaustiveness checking — the compiler ensures you handle every case.

---

## Mapped Types (Brief)

Mapped types transform every property of a type. You don't need to write these yourself — they're built-in — but understanding the syntax helps you read library code.

```typescript
// How Partial<T> works under the hood:
type Partial<T> = { [K in keyof T]?: T[K] };

// How Readonly<T> works under the hood:
type Readonly<T> = { readonly [K in keyof T]: T[K] };

// How Required<T> works under the hood:
type Required<T> = { [K in keyof T]-?: T[K] };
//                                 ^^ removes the optional modifier
```

Read it as: "For each key `K` in `keyof T`, create a property with that key and the corresponding value type `T[K]`."

> **Dart comparison** — Dart has no equivalent. This is pure type-level programming — it generates zero runtime code.

---

## `as const` (Const Assertions)

`as const` makes a value deeply readonly and narrows its type to the most specific literal type possible.

### Arrays

```typescript
// Without as const: type is string[]
const colors = ["red", "green", "blue"];

// With as const: type is readonly ["red", "green", "blue"]
const colorsConst = ["red", "green", "blue"] as const;

// Extract a union type from the array
type Color = (typeof colorsConst)[number]; // "red" | "green" | "blue"
```

### Objects — Better Than Enums

```typescript
const Status = {
  Active: "active",
  Inactive: "inactive",
  Pending: "pending",
} as const;

// Extract the value union
type Status = (typeof Status)[keyof typeof Status];
// "active" | "inactive" | "pending"

function setStatus(status: Status) {
  console.log(status);
}

setStatus(Status.Active);   // ✅
setStatus("active");        // ✅ — also works, it's just a string
setStatus("invalid");       // ❌ Error
```

### Why `as const` Over `enum`?

| `enum`                          | `as const`                        |
|---------------------------------|-----------------------------------|
| Generates runtime JavaScript    | Zero runtime cost                 |
| Has quirky behaviors            | Plain objects, no surprises       |
| Nominal — must use enum member  | Structural — string literal works |
| Can't iterate values easily     | `Object.values(Status)` works    |

Most TypeScript teams prefer `as const` over `enum`. Use it in interviews unless asked specifically about enums.

> **Dart comparison** — Dart enums are nominal and generate runtime classes. `as const` objects are closer to how you'd use a class with `static const` fields in Dart, but with automatic type narrowing.

---

## Common Patterns Summary

Quick reference for what to reach for in different situations:

| Situation                        | Pattern                                    |
|----------------------------------|--------------------------------------------|
| Define an object shape           | `interface`                                |
| Unions, intersections, aliases   | `type`                                     |
| Model variants / states          | Discriminated unions (`kind` field)        |
| Enum-like constants              | `as const` object                          |
| Avoid `any`                      | Generics with constraints                  |
| Type-safe property access        | `keyof` + indexed access types             |
| Transform all properties         | Mapped types (`Partial`, `Readonly`, etc.) |
| Preserve full type in generics   | `<T extends Interface>` (not just `Interface`) |

---

## Quick Reference

| Concept              | TypeScript                              | Dart Equivalent                          |
|----------------------|-----------------------------------------|------------------------------------------|
| Interface            | `interface User { ... }`                | `abstract class User`                    |
| Optional property    | `email?: string`                        | `String? email`                          |
| Readonly property    | `readonly id: string`                   | `final String id`                        |
| Structural typing    | Implicit — shape match is enough        | Nominal — must `implements`              |
| Generic function     | `function f<T>(x: T): T`               | `T f<T>(T x)`                           |
| Generic constraint   | `<T extends HasId>`                     | `<T extends HasId>`                      |
| Default type param   | `<T, E = Error>`                        | Not supported                            |
| keyof                | `keyof User` → `"name" \| "age"`       | No equivalent                            |
| Discriminated union  | `{ kind: "circle"; radius: number }`    | `sealed class Shape` + subclasses        |
| Mapped types         | `{ [K in keyof T]?: T[K] }`            | No equivalent                            |
| Const assertion      | `as const`                              | `static const` fields (roughly)          |

---

Next: [06 — Modules & Project Structure](./06-modules-project-structure.md)
