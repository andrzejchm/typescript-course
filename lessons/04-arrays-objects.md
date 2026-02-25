# 04 - Arrays and Objects Without Mutation Bugs

Use collection APIs to keep transforms predictable, testable, and safe under change.

## Why this matters in production

- Hidden mutation causes stale UI, race conditions, and hard-to-reproduce bugs.
- Immutable transforms make code easier to reason about and easier to test.
- Predictable collection patterns reduce accidental complexity.

## Core concepts with code

### 1) Non-mutating array transforms

```typescript
const orders = [
  { id: "1", amount: 1200 },
  { id: "2", amount: 500 },
  { id: "3", amount: 2200 },
];

const highValueIds = orders
  .filter((o) => o.amount >= 1000)
  .map((o) => o.id);
```

### 2) Immutable object updates

```typescript
type User = { id: string; profile: { name: string; city: string } };

function renameUser(user: User, name: string): User {
  return {
    ...user,
    profile: {
      ...user.profile,
      name,
    },
  };
}
```

### 3) Prefer `toSorted` over mutating `sort`

```typescript
const priorities = [3, 1, 2];

const sorted = priorities.toSorted((a, b) => a - b); // [1, 2, 3]
// priorities remains [3, 1, 2]
```

If `toSorted` is unavailable, use `[...arr].sort(...)`.

### 4) Reduce for deterministic aggregation

```typescript
type Tx = { category: "food" | "tools"; amount: number };

const totals = [
  { category: "food", amount: 10 },
  { category: "tools", amount: 25 },
  { category: "food", amount: 5 },
].reduce<Record<Tx["category"], number>>(
  (acc, tx) => ({ ...acc, [tx.category]: acc[tx.category] + tx.amount }),
  { food: 0, tools: 0 },
);
```

### 5) Safe access and defaults

```typescript
type Cart = { items?: Array<{ sku: string; qty: number }> };

function itemCount(cart: Cart): number {
  return cart.items?.reduce((sum, item) => sum + item.qty, 0) ?? 0;
}
```

### 6) Dart mapping

| Dart | TypeScript |
|---|---|
| `.where()` | `.filter()` |
| `.fold()` | `.reduce()` |
| `copyWith` style updates | object spread (`{ ...obj, x: y }`) |

## Best practices

- Treat arrays/objects as immutable in business logic.
- Prefer pure transformation functions over in-place edits.
- Use explicit comparators with sort.
- Keep chains readable; split long pipelines into named steps.

## Common anti-patterns / pitfalls

- Calling `sort`, `splice`, or direct property mutation on shared state.
- Using `map` for side effects.
- Huge chained expressions with no intermediate names.
- Depending on object key iteration order for business behavior.

## Short practice tasks

1. Replace one mutating `sort` with `toSorted` or copy-then-sort.
2. Refactor one in-place object update to immutable spread style.
3. Build a `groupByCategory` helper using `reduce` and test it.
4. Find one `map` used for side effects and replace it with `for...of` or `forEach`.

Next: [05-interfaces-generics.md](./05-interfaces-generics.md)
