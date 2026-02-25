# 04 - Arrays and Objects Without Mutation Bugs

Arrays and objects are the data structures you touch in almost every backend endpoint.
If you understand when data is copied vs shared, you avoid a large class of production bugs.

## 1) Foundation concepts (clear and simple)

### Value vs reference semantics (the key beginner concept)

Primitive values (`number`, `string`, `boolean`) are copied by value.

```typescript
let a = 10;
let b = a;
b = 20;

// a is still 10
```

Objects and arrays are copied by reference (the variable stores a pointer).

```typescript
const first = { city: "Warsaw" };
const second = first;
second.city = "Krakow";

// first.city is now also "Krakow"
```

That shared reference is why mutation bugs happen.

### Mutation bugs you will see in real code

```typescript
const numbers = [3, 1, 2];
numbers.sort((a, b) => a - b); // mutates original array

const items = ["a", "b", "c"];
items.splice(1, 1); // mutates original array

const user = { profile: { name: "Ana" } };
user.profile.name = "Lee"; // mutates nested object in place
```

If `numbers`, `items`, or `user` are shared across layers, one function can unexpectedly break another.

### Safer immutable updates

Use non-mutating array methods and object spread.

```typescript
const numbers = [3, 1, 2];
const sorted = numbers.toSorted((a, b) => a - b);

const items = ["a", "b", "c"];
const withoutB = items.filter((x) => x !== "b");

type User = { profile: { name: string; city: string } };
const user: User = { profile: { name: "Ana", city: "Warsaw" } };
const renamed: User = {
  ...user,
  profile: { ...user.profile, name: "Lee" },
};
```

If `toSorted` is unavailable in your runtime, use `[...numbers].sort(...)`.

## 2) Flutter mapping

| Flutter/Dart | TypeScript |
|---|---|
| `.where()` | `.filter()` |
| `.map()` | `.map()` |
| `.fold()` | `.reduce()` |
| `copyWith(...)` pattern | object spread (`{ ...obj, field: value }`) |
| avoid mutating shared state in Cubit/Bloc | avoid mutating shared arrays/objects in services/controllers |

If you already use immutable state in Flutter, apply the same rule in TypeScript service and API code.

## 3) Production patterns

Use these patterns in backend handlers and services.

### Filter + map for response shaping

```typescript
type Order = { id: string; amount: number; status: "paid" | "draft" };

function paidOrderIds(orders: Order[]): string[] {
  return orders
    .filter((order) => order.status === "paid")
    .map((order) => order.id);
}
```

### Reduce for deterministic aggregation

```typescript
type Tx = { category: "food" | "tools"; amount: number };

function totalsByCategory(txs: Tx[]): Record<Tx["category"], number> {
  return txs.reduce<Record<Tx["category"], number>>(
    (acc, tx) => ({ ...acc, [tx.category]: acc[tx.category] + tx.amount }),
    { food: 0, tools: 0 },
  );
}
```

### Safe optional access with defaults

```typescript
type Cart = { items?: Array<{ sku: string; qty: number }> };

function itemCount(cart: Cart): number {
  return cart.items?.reduce((sum, item) => sum + item.qty, 0) ?? 0;
}
```

### Small rule set for teams

- Treat inputs as read-only in business logic.
- Prefer pure functions (same input -> same output, no side effects).
- Split long chains into named steps when readability drops.
- Use explicit comparators for sorting.

## 4) Pitfalls

- Calling `sort`, `splice`, `push`, or direct property assignment on shared data.
- Shallow copying only top level (`{ ...obj }`) but mutating nested fields later.
- Using `map` for side effects instead of transformation.
- Relying on object key iteration order for business behavior.

## 5) Short practice tasks

1. Replace one mutating `sort` with `toSorted` (or copy-then-sort).
2. Refactor one `splice`-based removal to `filter`.
3. Refactor one nested object mutation to immutable spread update.
4. Implement `totalsByCategory` with `reduce` and add one unit test.

Next: [05-interfaces-generics.md](./05-interfaces-generics.md)
