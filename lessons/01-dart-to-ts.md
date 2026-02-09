# Lesson 01: Dart → TypeScript Mental Model Map

> You already know Dart. This lesson maps every Dart concept to its TypeScript equivalent so you can hit the ground running.

---

## 1. Syntax Side-by-Side

### Variable Declarations

| Dart | TypeScript |
|------|-----------|
| `var` (mutable, inferred) | `let` (mutable, inferred) |
| `final` (immutable, runtime) | `const` (immutable, runtime) |
| `const` (immutable, compile-time) | *No equivalent* — `const` is the closest, but it's runtime only |

```dart
// Dart
var name = 'Alice';        // mutable
final age = 30;            // immutable (runtime)
const pi = 3.14;           // immutable (compile-time)
```

```typescript
// TypeScript
let name = 'Alice';        // mutable
const age = 30;            // immutable (runtime — like Dart's final)
const pi = 3.14;           // same — there's no compile-time const in TS
```

> **Key insight:** TS `const` = Dart `final`. There is no Dart `const` equivalent in TS. Forget about compile-time constants.

---

### Type Annotations

Types come **after** the variable name in TS, separated by `:`.

```dart
// Dart — type BEFORE name
String name = 'Alice';
int age = 30;
List<String> tags = ['a', 'b'];
```

```typescript
// TypeScript — type AFTER name
const name: string = 'Alice';
const age: number = 30;
const tags: string[] = ['a', 'b'];
```

> Note: primitive types are **lowercase** in TS: `string`, `number`, `boolean` (not `String`, `Number`, `Boolean`).

---

### Null Safety

Dart has `null`. TypeScript has **both** `null` and `undefined`.

```dart
// Dart
String? name;           // can be String or null
name ?? 'default';      // null-coalescing
```

```typescript
// TypeScript
let name: string | null = null;           // explicitly null
let name2: string | undefined = undefined; // explicitly undefined
let name3: string | null | undefined;      // either

name ?? 'default';      // null-coalescing (works the same!)
```

> **`undefined`** = "never assigned" or "missing property". **`null`** = "explicitly set to nothing".
> In practice, `undefined` is far more common in TS. Optional properties (`?`) default to `undefined`, not `null`.

```typescript
interface User {
  name: string;
  bio?: string;  // type is string | undefined (NOT string | null)
}
```

---

### String Interpolation

```dart
// Dart — single quotes, $ prefix
var greeting = 'Hello $name, age ${age + 1}';
```

```typescript
// TypeScript — BACKTICKS required, ${} always
const greeting = `Hello ${name}, age ${age + 1}`;
```

> **Gotcha:** Regular quotes (`'` or `"`) do NOT support interpolation in TS. You **must** use backticks (`` ` ``).

---

### Collections

```dart
// Dart
List<int> numbers = [1, 2, 3];
Map<String, int> scores = {'alice': 100, 'bob': 90};
Set<String> tags = {'a', 'b', 'c'};
```

```typescript
// TypeScript
const numbers: number[] = [1, 2, 3];
// or: const numbers: Array<number> = [1, 2, 3];

const scores: Record<string, number> = { alice: 100, bob: 90 };
// or: const scores: Map<string, number> = new Map([['alice', 100], ['bob', 90]]);

const tags: Set<string> = new Set(['a', 'b', 'c']);
```

| Dart | TypeScript | Notes |
|------|-----------|-------|
| `List<T>` | `T[]` or `Array<T>` | `T[]` is more common |
| `Map<K, V>` | `Record<K, V>` | For plain objects (most common) |
| `Map<K, V>` | `Map<K, V>` | For actual Map instances (less common) |
| `Set<T>` | `Set<T>` | Same! |

> **Prefer `Record<K, V>`** for simple key-value data. Use `Map<K, V>` only when you need non-string keys or ordered iteration.

---

### Functions

```dart
// Dart
int add(int a, int b) => a + b;

// or
int add(int a, int b) {
  return a + b;
}
```

```typescript
// TypeScript — arrow function (most common)
const add = (a: number, b: number): number => a + b;

// or — function declaration
function add(a: number, b: number): number {
  return a + b;
}
```

> Return type goes **after** the parameter list with `:`. TS can usually infer it, but explicit is better in interviews.

---

### Named Parameters → Object Destructuring

This is the **#1 syntax difference** you'll encounter.

```dart
// Dart — named parameters
void greet({required String name, int age = 0}) {
  print('Hello $name, age $age');
}

greet(name: 'Alice', age: 30);
```

```typescript
// TypeScript — destructured object parameter
function greet({ name, age = 0 }: { name: string; age?: number }): void {
  console.log(`Hello ${name}, age ${age}`);
}

greet({ name: 'Alice', age: 30 });
```

For cleaner code, extract the parameter type:

```typescript
interface GreetParams {
  name: string;
  age?: number;  // optional (like Dart's non-required named param)
}

function greet({ name, age = 0 }: GreetParams): void {
  console.log(`Hello ${name}, age ${age}`);
}
```

> **No `required` keyword** — all params are required by default. Add `?` to make optional.

---

### Classes

```dart
// Dart
class User {
  final String name;
  int _age;  // private by convention

  User(this.name, this._age);

  String greet() => 'Hi, I\'m $name';

  int get age => _age;
}
```

```typescript
// TypeScript
class User {
  readonly name: string;   // like Dart's final
  private age: number;     // actually private (enforced by compiler)

  constructor(name: string, age: number) {
    this.name = name;
    this.age = age;
  }

  greet(): string {
    return `Hi, I'm ${this.name}`;
  }

  getAge(): number {
    return this.age;
  }
}
```

**Shorthand constructor** (like Dart's `this.` syntax):

```typescript
class User {
  constructor(
    public readonly name: string,  // declares + assigns in one line
    private age: number,
  ) {}

  greet(): string {
    return `Hi, I'm ${this.name}`;
  }
}
```

| Dart | TypeScript |
|------|-----------|
| `final` field | `readonly` |
| `_private` (convention) | `private` (keyword, enforced) |
| `this.name` in constructor | `public name` in constructor params |
| getters/setters with `get`/`set` | Same: `get`/`set` keywords |

---

### Async / Await

```dart
// Dart
Future<String> fetchName() async {
  final response = await http.get(uri);
  return response.body;
}
```

```typescript
// TypeScript
async function fetchName(): Promise<string> {
  const response = await fetch(url);
  return response.text();
}
```

| Dart | TypeScript |
|------|-----------|
| `Future<T>` | `Promise<T>` |
| `async` / `await` | `async` / `await` (identical!) |
| `Future.wait([])` | `Promise.all([])` |
| `Stream<T>` | `AsyncIterable<T>` or libraries like RxJS |

---

### Null-Aware Operators

```dart
// Dart
name ?? 'default';     // null-coalescing
user?.name;            // null-conditional access
name ??= 'fallback';  // null-aware assignment
```

```typescript
// TypeScript
name ?? 'default';     // same!
user?.name;            // same!
// name ??= 'fallback'; // DOES exist in TS (ES2021+), actually works!
```

> `??` and `?.` work identically. `??=` also works in modern TS (ES2021+).

---

### Type Casting

```dart
// Dart
final name = value as String;
if (value is String) { ... }
```

```typescript
// TypeScript
const name = value as string;     // note: lowercase 'string'
if (typeof value === 'string') { ... }  // type guard (primitives)
if (value instanceof MyClass) { ... }   // type guard (classes)
```

> **`typeof`** for primitives (`string`, `number`, `boolean`). **`instanceof`** for class instances.

---

### Enums

```dart
// Dart
enum Color { red, green, blue }

// Enhanced enum
enum Color {
  red('Red'),
  green('Green'),
  blue('Blue');

  final String label;
  const Color(this.label);
}
```

```typescript
// TypeScript — enum (works but controversial)
enum Color {
  Red = 'red',
  Green = 'green',
  Blue = 'blue',
}

// PREFERRED — const object (more idiomatic TS)
const Color = {
  Red: 'red',
  Green: 'green',
  Blue: 'blue',
} as const;

type Color = typeof Color[keyof typeof Color];
// type Color = 'red' | 'green' | 'blue'
```

> **Prefer `as const` objects** over `enum`. TS enums generate extra runtime code and have quirky behavior. The `as const` pattern is what most modern TS codebases use.

---

## 2. Key Differences That Will Trip You Up

### No `late` keyword

```dart
// Dart
late String name;  // initialized later, runtime check
```

```typescript
// TypeScript — options:

// Option 1: Non-null assertion (use sparingly!)
let name!: string;  // tells compiler "trust me, I'll assign it"

// Option 2: Union with undefined (safer)
let name: string | undefined;
if (!name) throw new Error('name not set');

// Option 3: Initialize properly (best)
const name: string = computeName();
```

---

### No named parameters — use object destructuring

```dart
// Dart — this won't work in TS
void createUser({required String name, required int age}) { ... }
createUser(name: 'Alice', age: 30);
```

```typescript
// TypeScript — destructure an object
function createUser({ name, age }: { name: string; age: number }): void { ... }
createUser({ name: 'Alice', age: 30 });
```

> This is the **#1 gotcha**. Burn this pattern into memory.

---

### `===` not `==`

```dart
// Dart
if (a == b) { ... }  // works fine
```

```typescript
// TypeScript
if (a === b) { ... }  // ALWAYS use triple equals
if (a == b) { ... }   // BAD — does type coercion ('' == 0 is true!)
```

> **Rule:** Always use `===` and `!==`. Forget `==` exists.

---

### `undefined` vs `null`

```typescript
let a;                // undefined — never assigned
let b: string | null = null;  // null — explicitly set

// Both are falsy:
if (!a) { ... }  // true
if (!b) { ... }  // true

// Check specifically:
if (a === undefined) { ... }
if (b === null) { ... }
```

> **Convention:** Most TS code uses `undefined` (optional params, missing properties). Use `null` only when an API requires it.

---

### All params required by default

```dart
// Dart — named params are optional unless `required`
void greet({String? name}) { ... }
```

```typescript
// TypeScript — all params required unless marked with ?
function greet(name: string): void { ... }     // required
function greet(name?: string): void { ... }    // optional (string | undefined)
```

---

### Structural typing (not nominal)

This is a **fundamental** difference from Dart.

```typescript
interface Dog {
  name: string;
  bark(): void;
}

class Wolf {
  constructor(public name: string) {}
  bark(): void { console.log('Howl!'); }
}

// Wolf is NOT declared to implement Dog, but this works!
const pet: Dog = new Wolf('Grey');  // OK — same shape = compatible
```

> TS doesn't care about class names or `implements` declarations. If the shape matches, it's compatible. Dart is **nominal** (must explicitly implement/extend).

---

### `number` — one type to rule them all

```dart
// Dart
int count = 42;
double price = 9.99;
```

```typescript
// TypeScript — just number
const count: number = 42;
const price: number = 9.99;
```

> No `int` vs `double` distinction. Everything is a floating-point `number` (or `bigint` for very large integers).

---

### `console.log()` not `print()`

```dart
// Dart
print('Hello');
```

```typescript
// TypeScript
console.log('Hello');
console.error('Something went wrong');
console.warn('Watch out');
```

---

### No `extension` methods

```dart
// Dart
extension StringX on String {
  String capitalize() => '${this[0].toUpperCase()}${substring(1)}';
}
'hello'.capitalize(); // 'Hello'
```

```typescript
// TypeScript — use standalone functions
function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
capitalize('hello'); // 'Hello'

// DON'T modify prototypes (String.prototype.capitalize = ...)
```

---

### Semicolons — optional but use them

```typescript
const name = 'Alice'   // works
const name = 'Alice';  // preferred — most codebases enforce this
```

---

### `interface` vs `abstract class`

```typescript
// Interface — compile-time only, zero runtime cost
interface Animal {
  name: string;
  speak(): void;
}

// Abstract class — exists at runtime, can have implementation
abstract class Animal {
  abstract name: string;
  abstract speak(): void;

  describe(): string {  // concrete method
    return `I am ${this.name}`;
  }
}
```

> **Prefer `interface`** unless you need shared implementation. Interfaces are erased at compile time — they generate no JavaScript code.

---

## 3. Quick Reference Card

| Dart | TypeScript | Notes |
|------|-----------|-------|
| `var x = 1` | `let x = 1` | Mutable |
| `final x = 1` | `const x = 1` | Immutable |
| `const x = 1` | `const x = 1` | No compile-time const in TS |
| `String` | `string` | Lowercase! |
| `int` / `double` | `number` | Single numeric type |
| `bool` | `boolean` | |
| `List<T>` | `T[]` | |
| `Map<K, V>` | `Record<K, V>` | For plain objects |
| `dynamic` | `any` | Avoid both |
| `Object` | `unknown` | Safer than `any` |
| `void` | `void` | Same |
| `String?` | `string \| null` | TS also has `undefined` |
| `late String` | `let s!: string` | Non-null assertion |
| `required` | *(default)* | All params required by default |
| `'$name'` | `` `${name}` `` | Backticks required |
| `Future<T>` | `Promise<T>` | |
| `async` / `await` | `async` / `await` | Identical |
| `print()` | `console.log()` | |
| `as String` | `as string` | Lowercase type |
| `is String` | `typeof x === 'string'` | |
| `??` / `?.` | `??` / `?.` | Identical |
| `==` | `===` | Always triple equals |
| `extension` | standalone function | No extension methods |
| `enum` | `as const` object | Preferred over `enum` |
| `abstract class` | `interface` | Prefer interface |
| `implements` | `implements` | But structural typing means it's optional |
| `{required String name}` | `{ name }: { name: string }` | Object destructuring |

---

**Next:** [Lesson 02 →](./02-ts-type-system.md) — The TypeScript type system (unions, generics, utility types)
