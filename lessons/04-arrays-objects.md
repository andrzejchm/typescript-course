# 04 — Arrays, Objects, Destructuring & Spread

The most important lesson for live coding interviews. You'll use these constructs in every single problem.

## 1. Arrays

```typescript
// Preferred syntax
const numbers: number[] = [1, 2, 3];
const names: string[] = ["Alice", "Bob"];

// Alternative (generic) syntax — same thing, just verbose
const scores: Array<number> = [100, 95, 88];

// Type inference works — no annotation needed
const flags = [true, false, true]; // inferred as boolean[]
```

In Dart you'd write `List<int>`. In TS, `number[]` is the idiomatic form.

## 2. Essential Array Methods

These are the ones you'll reach for in every interview problem.

### `.map()` — Transform each element

```typescript
const nums = [1, 2, 3];
const doubled = nums.map((n) => n * 2); // [2, 4, 6]

// With index
const labeled = nums.map((n, i) => `${i}: ${n}`); // ["0: 1", "1: 2", "2: 3"]
```

### `.filter()` — Keep elements matching a condition

```typescript
const nums = [1, 2, 3, 4, 5];
const evens = nums.filter((n) => n % 2 === 0); // [2, 4]

// Type narrowing with filter
const mixed: (string | number)[] = [1, "a", 2, "b"];
const strings = mixed.filter((x): x is string => typeof x === "string"); // ["a", "b"]
```

### `.reduce()` — Accumulate to a single value

```typescript
const nums = [1, 2, 3, 4];
const sum = nums.reduce((acc, n) => acc + n, 0); // 10

// Build an object
const words = ["hello", "world", "hello", "ts"];
const counts = words.reduce<Record<string, number>>((acc, word) => {
  acc[word] = (acc[word] ?? 0) + 1;
  return acc;
}, {});
// { hello: 2, world: 1, ts: 1 }
```

In Dart this is `.fold()`. The key difference: TS's `.reduce()` puts the initial value **last**, Dart's `.fold()` puts it **first**.

### `.find()` — First match (or `undefined`)

```typescript
const users = [
  { name: "Alice", age: 30 },
  { name: "Bob", age: 25 },
];
const bob = users.find((u) => u.name === "Bob"); // { name: "Bob", age: 25 }
const nobody = users.find((u) => u.name === "Eve"); // undefined
```

⚠️ Unlike Dart's `.firstWhere()`, this does NOT throw if nothing is found — it returns `undefined`.

### `.findIndex()` — Index of first match

```typescript
const nums = [10, 20, 30];
const idx = nums.findIndex((n) => n === 20); // 1
const missing = nums.findIndex((n) => n === 99); // -1
```

### `.some()` — Any match?

```typescript
const nums = [1, 2, 3];
nums.some((n) => n > 2); // true
nums.some((n) => n > 5); // false
```

Same as Dart's `.any()`.

### `.every()` — All match?

```typescript
const nums = [2, 4, 6];
nums.every((n) => n % 2 === 0); // true
nums.every((n) => n > 3);       // false
```

Same as Dart's `.every()`.

### `.includes()` — Contains?

```typescript
const fruits = ["apple", "banana", "cherry"];
fruits.includes("banana"); // true
fruits.includes("grape");  // false
```

Same as Dart's `.contains()`.

### `.flat()` / `.flatMap()` — Flatten nested arrays

```typescript
const nested = [[1, 2], [3, 4], [5]];
nested.flat(); // [1, 2, 3, 4, 5]

// flatMap = map + flat(1)
const sentences = ["hello world", "foo bar"];
sentences.flatMap((s) => s.split(" ")); // ["hello", "world", "foo", "bar"]

// Deep flatten
const deep = [1, [2, [3, [4]]]];
deep.flat(Infinity); // [1, 2, 3, 4]
```

Like Dart's `.expand()`, but `.flat()` can also work on pre-nested arrays without a transform.

### `.sort()` — ⚠️ MUTATES in place!

```typescript
const nums = [3, 1, 2];
nums.sort((a, b) => a - b); // [1, 2, 3] — ascending
nums.sort((a, b) => b - a); // [3, 2, 1] — descending

// ⚠️ Without comparator, sorts as STRINGS!
[10, 9, 2].sort();          // [10, 2, 9] — WRONG! Lexicographic!
[10, 9, 2].sort((a, b) => a - b); // [2, 9, 10] — correct

// Non-mutating sort (ES2023+)
const sorted = nums.toSorted((a, b) => a - b); // new array, original untouched
```

**Always pass a comparator for numbers.** This is a classic interview gotcha.

### `.slice()` — Copy a portion (non-mutating)

```typescript
const arr = [0, 1, 2, 3, 4];
arr.slice(1, 3);  // [1, 2] — from index 1 up to (not including) 3
arr.slice(2);     // [2, 3, 4] — from index 2 to end
arr.slice(-2);    // [3, 4] — last 2 elements
```

Like Dart's `.sublist()`.

### `.splice()` — Remove/insert in place (MUTATES)

```typescript
const arr = [0, 1, 2, 3, 4];

// Remove 2 elements starting at index 1
arr.splice(1, 2);        // returns [1, 2], arr is now [0, 3, 4]

// Insert at index 1 (remove 0 elements)
arr.splice(1, 0, 99);    // arr is now [0, 99, 3, 4]

// Replace: remove 1 element at index 2, insert 88
arr.splice(2, 1, 88);    // arr is now [0, 99, 88, 4]
```

No direct Dart equivalent. Dart uses `.removeRange()` + `.insertAll()` separately.

### `.forEach()` — Side effects only

```typescript
const names = ["Alice", "Bob"];
names.forEach((name) => console.log(name));

// ⚠️ Cannot break out of forEach. Use a for...of loop if you need to break.
```

Same as Dart's `.forEach()`.

### Dart → TypeScript Array Method Cheat Sheet

| Dart | TypeScript | Notes |
|------|-----------|-------|
| `.map()` | `.map()` | Identical |
| `.where()` | `.filter()` | Different name, same thing |
| `.fold()` | `.reduce()` | Initial value position differs |
| `.firstWhere()` | `.find()` | TS returns `undefined`, Dart throws |
| `.any()` | `.some()` | Different name, same thing |
| `.every()` | `.every()` | Identical |
| `.contains()` | `.includes()` | Different name, same thing |
| `.expand()` | `.flatMap()` | Different name, same thing |
| `.sublist()` | `.slice()` | Different name, same thing |
| `.sort()` | `.sort()` | Both mutate! TS has `.toSorted()` |
| `.forEach()` | `.forEach()` | Identical |
| `.length` | `.length` | Identical |

## 3. Objects

In Dart, you reach for a class. In TypeScript, you reach for an object literal. This is the single biggest mindset shift.

### Object Literals

```typescript
// No class needed — just declare the shape inline
const user = {
  name: "Alice",
  age: 30,
  email: "alice@example.com",
};

// Access
user.name;          // "Alice"
user["name"];       // "Alice" — bracket notation (useful for dynamic keys)
```

### Typed Objects

```typescript
// Inline type annotation
const user: { name: string; age: number } = {
  name: "Alice",
  age: 30,
};

// With interface (preferred for reuse)
interface User {
  name: string;
  age: number;
  email?: string; // optional property
}

const alice: User = { name: "Alice", age: 30 };
const bob: User = { name: "Bob", age: 25, email: "bob@b.com" };

// With type alias (also common)
type Point = {
  x: number;
  y: number;
};
```

### Key Insight: Objects vs Classes

```typescript
// ❌ Dart mindset — don't do this for simple data
class UserClass {
  constructor(public name: string, public age: number) {}
}

// ✅ TypeScript mindset — object literal + interface
interface User {
  name: string;
  age: number;
}

const user: User = { name: "Alice", age: 30 };
```

Use classes when you need methods with complex logic, inheritance, or `instanceof` checks. For data? Objects.

## 4. Destructuring

This is how TypeScript developers unpack values. You'll see it everywhere — function params, return values, imports. **Master this.**

### Object Destructuring

```typescript
const user = { name: "Alice", age: 30, email: "a@b.com" };

// Basic — pull out properties by name
const { name, age } = user;
console.log(name); // "Alice"
console.log(age);  // 30

// Rename — when the property name clashes or isn't descriptive enough
const { name: userName, age: userAge } = user;
console.log(userName); // "Alice"

// Default value — if property is undefined
const { role = "user" } = user as any;
console.log(role); // "user"

// Nested destructuring
const order = {
  id: 1,
  customer: {
    name: "Alice",
    address: { city: "NYC", zip: "10001" },
  },
};
const {
  customer: {
    address: { city },
  },
} = order;
console.log(city); // "NYC"
```

### Destructuring in Function Parameters

This is how "named parameters" work in TypeScript. **You'll use this constantly.**

```typescript
// ❌ Positional params — easy to mix up
function createUser(name: string, age: number, email: string) { ... }
createUser("Alice", 30, "a@b.com"); // which is which?

// ✅ Destructured params — self-documenting
function createUser({ name, age, email }: { name: string; age: number; email: string }) {
  return { name, age, email };
}
createUser({ name: "Alice", age: 30, email: "a@b.com" }); // clear!

// With an interface (cleaner)
interface CreateUserParams {
  name: string;
  age: number;
  email?: string;
}

function createUser({ name, age, email = "none" }: CreateUserParams) {
  return { name, age, email };
}
```

In Dart you'd write `void greet({required String name, required int age})`. In TS, you destructure an object parameter.

### Array Destructuring

```typescript
const [first, second, ...rest] = [1, 2, 3, 4, 5];
// first = 1, second = 2, rest = [3, 4, 5]

// Skip elements with empty slots
const [, , third] = [1, 2, 3];
// third = 3

// Swap variables (no temp needed!)
let a = 1;
let b = 2;
[a, b] = [b, a];
// a = 2, b = 1

// From function returns (like Dart's records, sort of)
function getMinMax(nums: number[]): [number, number] {
  return [Math.min(...nums), Math.max(...nums)];
}
const [min, max] = getMinMax([3, 1, 4, 1, 5]);
```

## 5. Spread Operator (`...`)

Works like Dart's `...` spread operator. You'll use it for copying, merging, and building new arrays/objects.

### Array Spread

```typescript
const a = [1, 2, 3];
const b = [4, 5, 6];

// Combine arrays
const all = [...a, ...b]; // [1, 2, 3, 4, 5, 6]

// Copy an array
const copy = [...a]; // [1, 2, 3] — new array, not a reference

// Add elements
const withZero = [0, ...a]; // [0, 1, 2, 3]
const withFour = [...a, 4]; // [1, 2, 3, 4]
```

### Object Spread (like Dart's `copyWith`!)

```typescript
const user = { name: "Alice", age: 30, email: "a@b.com" };

// Update a field (creates new object)
const updated = { ...user, age: 31 };
// { name: "Alice", age: 31, email: "a@b.com" }

// Merge objects (later properties win)
const defaults = { theme: "light", lang: "en", debug: false };
const overrides = { theme: "dark", debug: true };
const config = { ...defaults, ...overrides };
// { theme: "dark", lang: "en", debug: true }

// Add a new field
const withRole = { ...user, role: "admin" };
```

⚠️ **Shallow copy only!** Nested objects are still references — same as Dart.

```typescript
const original = { name: "Alice", address: { city: "NYC" } };
const copy = { ...original };
copy.address.city = "LA";
console.log(original.address.city); // "LA" — oops, shared reference!
```

### Rest Parameters (the other side of spread)

```typescript
// Collect remaining args into an array
function sum(...nums: number[]): number {
  return nums.reduce((a, b) => a + b, 0);
}
sum(1, 2, 3, 4); // 10

// Collect remaining object properties
const { name, ...rest } = { name: "Alice", age: 30, email: "a@b.com" };
// name = "Alice", rest = { age: 30, email: "a@b.com" }
```

## 6. Optional Chaining & Nullish Coalescing

```typescript
interface User {
  name: string;
  address?: {
    city?: string;
    zip?: string;
  };
  getName?: () => string;
}

const user: User = { name: "Alice" };

// Optional chaining — short-circuits to undefined
const city = user?.address?.city;       // undefined (no crash!)
const upper = user?.address?.city?.toUpperCase(); // undefined

// Optional method call
const name = user?.getName?.();         // undefined

// Nullish coalescing — default for null/undefined ONLY
const value = null ?? "default";        // "default"
const zero = 0 ?? "default";           // 0 (not "default"! 0 is not null/undefined)
const empty = "" ?? "default";         // "" (not "default"!)

// ⚠️ Compare with || which treats 0, "", false as falsy
const value2 = 0 || "default";         // "default" — probably not what you want!

// Common pattern: safe access with fallback
const items = user?.address?.city ?? "Unknown";
```

In Dart, `?.` and `??` work the same way. The only gotcha: TS has both `??` and `||`, and they behave differently. **Use `??` for null checks.**

## 7. Object Methods You'll Use

```typescript
const user = { name: "Alice", age: 30, email: "a@b.com" };

// Keys
Object.keys(user);    // ["name", "age", "email"]

// Values
Object.values(user);  // ["Alice", 30, "a@b.com"]

// Entries (key-value pairs as tuples)
Object.entries(user);  // [["name", "Alice"], ["age", 30], ["email", "a@b.com"]]

// Iterate over entries
for (const [key, value] of Object.entries(user)) {
  console.log(`${key}: ${value}`);
}

// Build object from entries (reverse of Object.entries)
const entries: [string, number][] = [["a", 1], ["b", 2]];
const obj = Object.fromEntries(entries); // { a: 1, b: 2 }

// Merge (prefer spread instead)
const merged = Object.assign({}, user, { age: 31 });

// Freeze — make immutable (shallow)
const frozen = Object.freeze({ x: 1, y: 2 });
frozen.x = 99; // ❌ TypeError at runtime, TS error at compile time
```

## 8. Map and Set

These work almost identically to Dart's `Map` and `Set`.

### Map

```typescript
const map = new Map<string, number>();

map.set("alice", 100);
map.set("bob", 95);

map.get("alice");     // 100
map.get("unknown");   // undefined
map.has("bob");       // true
map.delete("bob");    // true
map.size;             // 1

// Initialize from entries
const scores = new Map([
  ["alice", 100],
  ["bob", 95],
]);

// Iterate
for (const [name, score] of scores) {
  console.log(`${name}: ${score}`);
}

// Convert to/from object
const obj = Object.fromEntries(scores);     // { alice: 100, bob: 95 }
const backToMap = new Map(Object.entries(obj));
```

**When to use Map vs plain object?**
- **Plain object** — when keys are known at compile time (most cases)
- **Map** — when keys are dynamic, non-string, or you need insertion order / `.size`

### Set

```typescript
const set = new Set<number>([1, 2, 3, 2, 1]);
// Set { 1, 2, 3 } — duplicates removed

set.add(4);
set.has(2);     // true
set.delete(2);  // true
set.size;       // 3

// Convert to array
const arr = [...set]; // [1, 3, 4]

// Quick dedup
const unique = [...new Set([1, 2, 2, 3, 3, 3])]; // [1, 2, 3]
```

## 9. Common Interview Patterns

These three patterns come up constantly. Know them cold.

### Pattern 1: Group By

```typescript
interface Person {
  name: string;
  department: string;
}

const people: Person[] = [
  { name: "Alice", department: "eng" },
  { name: "Bob", department: "sales" },
  { name: "Charlie", department: "eng" },
  { name: "Diana", department: "sales" },
];

const byDepartment = people.reduce<Record<string, Person[]>>((groups, person) => {
  const key = person.department;
  groups[key] = [...(groups[key] ?? []), person];
  return groups;
}, {});

// { eng: [Alice, Charlie], sales: [Bob, Diana] }

// ES2024+ has Object.groupBy (if available):
// const byDept = Object.groupBy(people, (p) => p.department);
```

### Pattern 2: Count Occurrences

```typescript
const words = ["apple", "banana", "apple", "cherry", "banana", "apple"];

const counts = words.reduce<Map<string, number>>((map, word) => {
  map.set(word, (map.get(word) ?? 0) + 1);
  return map;
}, new Map());

// Map { "apple" => 3, "banana" => 2, "cherry" => 1 }
```

### Pattern 3: Remove Duplicates

```typescript
// Simple values
const nums = [1, 2, 2, 3, 3, 3];
const unique = [...new Set(nums)]; // [1, 2, 3]

// Objects by key
const users = [
  { id: 1, name: "Alice" },
  { id: 2, name: "Bob" },
  { id: 1, name: "Alice (dup)" },
];

const uniqueById = [
  ...new Map(users.map((u) => [u.id, u])).values(),
];
// [{ id: 1, name: "Alice (dup)" }, { id: 2, name: "Bob" }]
// ⚠️ Last one wins when IDs collide
```

## Quick Reference: Chaining It All Together

In interviews, you'll chain these methods. Here's a realistic example:

```typescript
interface Transaction {
  id: string;
  amount: number;
  category: string;
  status: "completed" | "pending" | "failed";
}

const transactions: Transaction[] = [
  { id: "1", amount: 100, category: "food", status: "completed" },
  { id: "2", amount: 200, category: "tech", status: "completed" },
  { id: "3", amount: 50, category: "food", status: "failed" },
  { id: "4", amount: 300, category: "tech", status: "completed" },
  { id: "5", amount: 75, category: "food", status: "completed" },
];

// "Total completed spending per category"
const spendingByCategory = transactions
  .filter((t) => t.status === "completed")
  .reduce<Record<string, number>>((acc, t) => {
    acc[t.category] = (acc[t.category] ?? 0) + t.amount;
    return acc;
  }, {});

// { food: 175, tech: 500 }
```

## Next Up

Head to [05-functions-closures.md](./05-functions-closures.md) for functions, arrow functions, closures, and higher-order functions.
