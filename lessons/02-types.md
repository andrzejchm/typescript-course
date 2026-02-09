# 02 — Types

TypeScript's type system is structural (shape-based), not nominal (name-based) like Dart's. Two types are compatible if they have the same shape — no `implements` needed.

---

## Primitive Types

```typescript
const name: string = "Alice";
const age: number = 30;        // no int/double distinction!
const active: boolean = true;
const nothing: null = null;
const missing: undefined = undefined;
```

Use **lowercase** for primitives: `string`, `number`, `boolean`. The uppercase versions (`String`, `Number`) are wrapper objects — never use them in type annotations.

> **Dart comparison** — Dart has `int` and `double` as separate types. TypeScript has only `number` (always a 64-bit float). There's also `bigint` for arbitrary-precision integers, but you'll rarely need it.

---

## Union Types

Dart doesn't have this. It's one of TypeScript's superpowers.

```typescript
// String literal union — like a Dart enum, but lighter
type Status = "loading" | "success" | "error";

// Mixed type union — value can be either type
type Id = string | number;

function printId(id: Id) {
  console.log(`ID: ${id}`);
}

printId(101);     // OK
printId("abc");   // OK
printId(true);    // Error: boolean not assignable to Id
```

> **Dart comparison** — Dart uses sealed classes + pattern matching for similar "one of these shapes" patterns. In TS, a union type + narrowing does the same job with zero boilerplate.

---

## Literal Types

You can use exact values as types:

```typescript
type Direction = "up" | "down" | "left" | "right";

const move: Direction = "up";    // OK
const bad: Direction = "diagonal"; // Error

type DiceRoll = 1 | 2 | 3 | 4 | 5 | 6;
type Toggle = true | false;      // equivalent to boolean
```

`const` declarations automatically infer literal types:

```typescript
const x = "hello";   // type is "hello" (literal)
let y = "hello";     // type is string (widened)
```

---

## Type Narrowing

TypeScript tracks types through control flow. After a check, it **narrows** the type automatically.

### `typeof` — for primitives

```typescript
function process(value: string | number) {
  if (typeof value === "string") {
    return value.toUpperCase();  // TS knows: string
  }
  return value * 2;              // TS knows: number
}
```

### `instanceof` — for class instances

```typescript
function getDate(input: string | Date): string {
  if (input instanceof Date) {
    return input.toISOString();  // TS knows: Date
  }
  return input;                  // TS knows: string
}
```

### `in` operator — for object shapes

```typescript
type Fish = { swim: () => void };
type Bird = { fly: () => void };

function move(animal: Fish | Bird) {
  if ("swim" in animal) {
    animal.swim();  // TS knows: Fish
  } else {
    animal.fly();   // TS knows: Bird
  }
}
```

### Truthiness narrowing

```typescript
function greet(name: string | null) {
  if (name) {
    console.log(`Hello, ${name}`);  // TS knows: string (non-null)
  } else {
    console.log("Hello, stranger");
  }
}
```

> **Dart comparison** — Dart uses `is` for type checks (`if (value is String)`). TypeScript uses `typeof` for primitives and `instanceof` for classes. The `in` operator has no Dart equivalent — it checks if a property exists on an object.

---

## Type Aliases vs Interfaces

Both define object shapes. Here's when to use each.

### Type alias — can describe anything

```typescript
type Point = { x: number; y: number };
type ID = string | number;
type Callback = (data: string) => void;
type Pair<T> = [T, T];
```

### Interface — objects only, but extendable

```typescript
interface User {
  id: string;
  name: string;
  email?: string;  // optional property (like Dart's nullable fields)
}

// Extend an interface
interface Admin extends User {
  permissions: string[];
}

const admin: Admin = {
  id: "1",
  name: "Alice",
  permissions: ["read", "write"],
};
```

### Rule of thumb

| Use `interface` when...            | Use `type` when...                |
|------------------------------------|-----------------------------------|
| Defining object shapes             | Defining unions or intersections  |
| You might extend it later          | Aliasing primitives or tuples     |
| Writing a public API / library     | Combining types with `&` or `\|` |

In practice, either works for objects. Pick one convention and stick with it.

> **Dart comparison** — Dart uses `abstract class` or `abstract interface class` for interfaces. TypeScript interfaces are purely compile-time — they produce zero JavaScript output.

---

## Utility Types

TypeScript ships built-in type transformers. These are the ones you'll actually use.

### `Partial<T>` — all fields become optional

```typescript
interface User {
  id: string;
  name: string;
  email: string;
}

function updateUser(id: string, changes: Partial<User>) {
  // changes can have any subset of User fields
}

updateUser("1", { name: "Bob" });  // OK — email and id are optional
```

> **Dart comparison** — This is like `copyWith()` in Dart/freezed. You pass only the fields you want to change.

### `Required<T>` — all fields become required

```typescript
type Config = {
  host?: string;
  port?: number;
};

const fullConfig: Required<Config> = {
  host: "localhost",  // must provide both
  port: 3000,
};
```

### `Pick<T, Keys>` — select specific fields

```typescript
type UserPreview = Pick<User, "id" | "name">;
// equivalent to: { id: string; name: string }
```

### `Omit<T, Keys>` — exclude specific fields

```typescript
type CreateUserInput = Omit<User, "id">;
// equivalent to: { name: string; email: string }
```

### `Record<K, V>` — typed dictionary

```typescript
type Scores = Record<string, number>;

const scores: Scores = {
  alice: 95,
  bob: 87,
};
```

> **Dart comparison** — `Record<string, number>` is like `Map<String, int>` in Dart, but it's a plain object, not a `Map` class.

### `Readonly<T>` — all fields become readonly

```typescript
const user: Readonly<User> = {
  id: "1",
  name: "Alice",
  email: "alice@example.com",
};

user.name = "Bob";  // Error: cannot assign to 'name' because it is read-only
```

> **Dart comparison** — Similar to what `@freezed` gives you in Dart. But note: `Readonly` is shallow — nested objects are still mutable.

---

## Type Assertions

Tell the compiler "trust me, I know the type":

```typescript
const input = document.getElementById("name") as HTMLInputElement;
input.value = "Alice";

const data = JSON.parse(text) as User;
```

**Warning:** Assertions don't validate anything at runtime. They just silence the compiler. If you're wrong, you get runtime errors with no helpful message.

```typescript
const data = JSON.parse('{"foo": 1}') as User;
console.log(data.name);  // undefined — no error thrown!
```

> **Dart comparison** — Dart's `as` keyword performs a runtime cast and throws `TypeError` if it fails. TypeScript's `as` is erased at compile time — it's purely a hint to the type checker. For runtime validation, use a library like [zod](https://zod.dev).

---

## `unknown` vs `any`

### `any` — disables type checking

```typescript
let value: any = "hello";
value.foo.bar.baz;  // no error — TS stops checking entirely
value = 42;
value.toUpperCase();  // no error at compile time, crashes at runtime
```

**Avoid `any`.** It defeats the purpose of TypeScript.

### `unknown` — safe "I don't know yet"

```typescript
let value: unknown = "hello";
value.toUpperCase();  // Error: 'value' is of type 'unknown'

// Must narrow before use
if (typeof value === "string") {
  value.toUpperCase();  // OK — TS knows it's a string
}
```

**Use `unknown` when you genuinely don't know the type** (e.g., parsing JSON, handling API responses). It forces you to narrow before accessing properties.

> **Dart comparison** — `any` is like casting everything to `dynamic` in Dart. `unknown` is like using `Object?` — you can hold any value but must check the type before using it.

---

## Quick Reference

| Concept            | TypeScript                          | Dart Equivalent                     |
|--------------------|-------------------------------------|-------------------------------------|
| Primitives         | `string`, `number`, `boolean`       | `String`, `int`/`double`, `bool`    |
| Union types        | `string \| number`                  | Sealed classes + pattern matching   |
| Optional field     | `email?: string`                    | `String? email`                     |
| Type narrowing     | `typeof`, `instanceof`, `in`        | `is` keyword                        |
| Interface          | `interface User { ... }`            | `abstract class User`               |
| Utility types      | `Partial<T>`, `Pick<T, K>`, etc.    | No built-in equivalent (use freezed)|
| Type assertion     | `value as Type` (compile-time only) | `value as Type` (runtime cast)      |
| Unsafe any         | `any`                               | `dynamic`                           |
| Safe unknown       | `unknown`                           | `Object?`                           |
| Readonly           | `Readonly<T>`                       | `@freezed`                          |
| Dictionary         | `Record<K, V>`                      | `Map<K, V>`                         |

---

Next: [03 — Functions & Async](./03-functions-async.md)
