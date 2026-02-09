# 03 — Functions, Closures & Async

Everything you need to know about functions and async patterns in TypeScript. Code-heavy, Dart comparisons where they help.

## 1. Three Ways to Declare Functions

```typescript
// Function declaration (hoisted — can call before definition)
function add(a: number, b: number): number {
  return a + b;
}

// Arrow function (most common in modern TS)
const add = (a: number, b: number): number => a + b;

// Function expression
const add = function (a: number, b: number): number {
  return a + b;
};
```

**Which to use?** Arrow functions are the default choice in modern TypeScript. Use `function` declarations when you need hoisting (calling before definition) or for top-level named functions in a module.

> **Dart comparison:** Arrow functions are like Dart's `=>`, but in TS they can also have block bodies with `{}`. In Dart, `=>` is single-expression only.

## 2. Arrow Function Gotchas

These trip people up in interviews:

```typescript
// Single expression — implicit return
const double = (x: number) => x * 2;

// Block body — explicit return required!
const double = (x: number) => {
  return x * 2;
};

// ⚠️ Forgetting return in a block body silently returns undefined
const double = (x: number) => {
  x * 2; // BUG: returns undefined, not the result
};

// Returning an object literal — wrap in parens!
const makeUser = (name: string) => ({ name }); // ✅
const makeUser = (name: string) => { name };   // ❌ this is a block body, not an object
```

**`this` binding:** Arrow functions capture `this` from the enclosing scope, just like Dart. No surprises here — but it matters when working with class methods passed as callbacks.

## 3. Optional & Default Parameters

```typescript
// Default parameter
function greet(name: string, greeting: string = "Hello"): string {
  return `${greeting}, ${name}!`;
}

greet("Alice");           // "Hello, Alice!"
greet("Alice", "Hey");    // "Hey, Alice!"

// Optional parameter — type becomes T | undefined
function createUser(name: string, age?: number) {
  // age is number | undefined here
  if (age !== undefined) {
    console.log(`${name} is ${age}`);
  }
}

createUser("Alice");      // age is undefined
createUser("Alice", 30);  // age is 30
```

> **Dart comparison:** Dart uses `[]` for positional optional and `{}` for named optional. In TS, all params are positional by default. Use `?` to mark optional. Optional params must come after required ones.

## 4. "Named Parameters" via Destructuring

This is the **#1 pattern Flutter devs need to learn**. TypeScript doesn't have named parameters — you fake them with object destructuring:

```typescript
// Dart:  void createUser({required String name, int? age})
// TS equivalent:
function createUser({ name, age }: { name: string; age?: number }) {
  console.log(name, age);
}

createUser({ name: "Alice", age: 30 });
createUser({ name: "Bob" }); // age is undefined
```

For functions with many parameters, extract the type:

```typescript
interface CreateUserParams {
  name: string;
  age?: number;
  email?: string;
}

function createUser({ name, age, email }: CreateUserParams) {
  console.log(name, age, email);
}

// Callers get autocomplete and type checking on the object
createUser({ name: "Alice", email: "alice@example.com" });
```

You can also set defaults inside the destructuring:

```typescript
function createUser({ name, age = 0, email = "" }: CreateUserParams) {
  // age is number (not number | undefined) because of the default
}
```

## 5. Rest Parameters

Collect remaining arguments into an array:

```typescript
function sum(...numbers: number[]): number {
  return numbers.reduce((acc, n) => acc + n, 0);
}

sum(1, 2, 3);       // 6
sum(10, 20);         // 30
sum();               // 0
```

Rest params must be last:

```typescript
function log(level: string, ...messages: string[]) {
  console.log(`[${level}]`, ...messages);
}

log("INFO", "Server started", "on port 3000");
```

## 6. Function Types

Define the shape of a function — like Dart's `typedef`:

```typescript
// Type alias for a function
type Callback = (value: string) => void;
type Predicate<T> = (item: T) => boolean;

// Use in function signatures
function filter<T>(items: T[], predicate: Predicate<T>): T[] {
  return items.filter(predicate);
}

const adults = filter(
  [{ name: "Alice", age: 30 }, { name: "Bob", age: 12 }],
  (user) => user.age >= 18,
);

// Inline function type (no alias needed for one-off use)
function onEvent(handler: (event: string, data: unknown) => void) {
  handler("click", { x: 10, y: 20 });
}
```

| Dart | TypeScript | Purpose |
|------|-----------|---------|
| `typedef Predicate<T> = bool Function(T)` | `type Predicate<T> = (item: T) => boolean` | Function type alias |
| `void Function(String)` | `(value: string) => void` | Inline function type |

## 7. Closures

Functions capture variables from their enclosing scope:

```typescript
function createCounter() {
  let count = 0;
  return {
    increment: () => ++count,
    decrement: () => --count,
    getCount: () => count,
  };
}

const counter = createCounter();
counter.increment(); // 1
counter.increment(); // 2
counter.getCount();  // 2
```

A practical example — creating a logger with a prefix:

```typescript
function createLogger(prefix: string) {
  return (message: string) => {
    console.log(`[${prefix}] ${message}`);
  };
}

const dbLog = createLogger("DB");
dbLog("Connected");    // [DB] Connected
dbLog("Query ran");    // [DB] Query ran
```

> **Dart comparison:** Works exactly the same. Closures close over variables, not values.

## 8. Promises & Async/Await

Side-by-side with Dart:

```typescript
// Dart:  Future<String> fetchUser(String id) async { ... }
// TS:
async function fetchUser(id: string): Promise<string> {
  const response = await fetch(`/api/users/${id}`);
  const data = await response.json();
  return data.name;
}
```

| Dart | TypeScript | Purpose |
|------|-----------|---------|
| `Future<T>` | `Promise<T>` | Async result container |
| `Future.wait([a, b])` | `Promise.all([a, b])` | Run in parallel |
| — | `Promise.race([a, b])` | First to complete wins |
| `.then((v) => ...)` | `.then((v) => ...)` | Callback style |
| `.catchError((e) => ...)` | `.catch((e) => ...)` | Error callback |
| `try/catch` | `try/catch` | Error handling (same!) |

### Creating Promises manually

Rarely needed, but good to understand:

```typescript
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

await delay(1000); // wait 1 second
```

### Error handling

`try/catch` works the same as Dart:

```typescript
async function fetchUser(id: string): Promise<User> {
  try {
    const response = await fetch(`/api/users/${id}`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Failed to fetch user:", error);
    throw error; // re-throw to let caller handle it
  }
}
```

> **Watch out:** In TypeScript, `catch` gives you `unknown`, not a typed error. You need to narrow it:
>
> ```typescript
> catch (error) {
>   if (error instanceof Error) {
>     console.error(error.message);
>   }
> }
> ```

## 9. Common Async Patterns

These come up constantly in interviews and real code:

### Parallel execution — `Promise.all`

```typescript
// Both requests fire at the same time
const [users, posts] = await Promise.all([
  fetchUsers(),
  fetchPosts(),
]);
// Both are done here
```

### Sequential loop

```typescript
const results: User[] = [];
for (const id of ids) {
  results.push(await fetchUser(id)); // one at a time
}
```

### Parallel map

```typescript
// Fire all requests at once, wait for all to finish
const results = await Promise.all(
  ids.map((id) => fetchUser(id)),
);
```

### `Promise.race` — first to finish wins

```typescript
// Timeout pattern: race the fetch against a timer
const result = await Promise.race([
  fetch("/api/data"),
  delay(5000).then(() => {
    throw new Error("Timeout");
  }),
]);
```

### `Promise.allSettled` — don't fail on one error

```typescript
// Unlike Promise.all, this doesn't short-circuit on failure
const results = await Promise.allSettled([
  fetchUser("1"),
  fetchUser("2"),
  fetchUser("bad-id"),
]);

for (const result of results) {
  if (result.status === "fulfilled") {
    console.log(result.value);
  } else {
    console.error(result.reason);
  }
}
```

## Quick Reference

| Concept | Dart | TypeScript |
|---------|------|-----------|
| Arrow function | `(x) => x * 2` (single expr only) | `(x) => x * 2` or `(x) => { return x * 2; }` |
| Named params | `void f({required String name})` | `function f({ name }: { name: string })` |
| Optional param | `void f([int? x])` | `function f(x?: number)` |
| Default param | `void f({int x = 0})` | `function f(x: number = 0)` |
| Function type | `typedef Fn = void Function(int)` | `type Fn = (x: number) => void` |
| Async function | `Future<T> f() async` | `async function f(): Promise<T>` |
| Parallel async | `Future.wait([a, b])` | `Promise.all([a, b])` |
| Closure | Same as TS | Same as Dart |

## Next Up

Head to [04-classes-interfaces.md](./04-classes-interfaces.md) to learn about classes, interfaces, and OOP patterns.
