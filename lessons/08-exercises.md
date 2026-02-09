# Lesson 08: Practice Exercises

> Interview-style coding problems to solidify your TypeScript skills. Work through these in order — they build on concepts from previous lessons.

---

## How to Run

Each exercise is a standalone file. Run any exercise with:

```bash
npx tsx exercises/01-array-transform.ts
```

Solutions are in `exercises/solutions/`. Try to solve each exercise before peeking!

```bash
npx tsx exercises/solutions/01-array-transform.solution.ts
```

---

## Exercise Overview

| # | Name | Difficulty | Tests | Time Target | Run Command |
|---|------|-----------|-------|-------------|-------------|
| 01 | Array Transformations | ⭐ Easy | Array methods (`filter`, `map`, `reduce`, `sort`) | 5 min | `npx tsx exercises/01-array-transform.ts` |
| 02 | Type-Safe Event Emitter | ⭐⭐ Medium | Generics, callbacks, `Map` | 10 min | `npx tsx exercises/02-type-safe-event-emitter.ts` |
| 03 | Async Task Queue | ⭐⭐ Medium | Promises, async/await, concurrency | 10 min | `npx tsx exercises/03-async-task-queue.ts` |
| 04 | Discriminated Unions | ⭐⭐ Medium | Union types, type narrowing, generics | 10 min | `npx tsx exercises/04-discriminated-unions.ts` |
| 05 | Todo REST API | ⭐⭐⭐ Hard | Express, Zod validation, error handling | 15 min | `npx tsx exercises/05-todo-api.ts` |
| 06 | Utility Functions | ⭐ Easy | Core TS patterns, closures, generics | 10 min | `npx tsx exercises/06-utility-functions.ts` |

**Total time: ~60 min** (give yourself some buffer — in an interview you'd pick 2-3 of these)

---

## Tips for Interview Success

1. **Talk through your approach** before writing code — interviewers care about your thought process
2. **Start with types** — define your data shapes first, then implement
3. **Handle edge cases** — empty arrays, missing keys, invalid input
4. **Use built-in methods** — `map`, `filter`, `reduce`, `Object.entries` — don't reinvent the wheel
5. **Keep it simple** — a working solution beats an over-engineered one every time

---

## Dart → TypeScript Cheat Sheet for Exercises

| Dart | TypeScript |
|------|-----------|
| `list.where((x) => ...)` | `array.filter((x) => ...)` |
| `list.map((x) => ...)` | `array.map((x) => ...)` |
| `list.fold(init, (acc, x) => ...)` | `array.reduce((acc, x) => ..., init)` |
| `list.sort((a, b) => ...)` | `array.sort((a, b) => ...)` — **mutates in place!** |
| `Map<String, List<User>>` | `Record<string, User[]>` |
| `Future<T>` | `Promise<T>` |
| `async/await` | `async/await` (same!) |
| `Stream` | No built-in equivalent — use callbacks or async iterators |

---

## Exercise Details

### 01 — Array Transformations ⭐

**What you'll practice:** `filter`, `map`, `reduce`, `sort`, `Record` type, `Object.entries`

Given an array of users, implement 5 functions that transform the data. This is the most common type of interview warm-up question.

### 02 — Type-Safe Event Emitter ⭐⭐

**What you'll practice:** Generics with constraints, `keyof`, mapped types, `Map` data structure

Build an event emitter where TypeScript enforces that event names and payloads match. This tests your understanding of generics — a very common interview topic.

### 03 — Async Task Queue ⭐⭐

**What you'll practice:** Promises, async/await, concurrency control

Implement a queue that limits how many async tasks run simultaneously. This tests your understanding of the event loop and Promise mechanics — critical for any Node.js role.

### 04 — Discriminated Unions ⭐⭐

**What you'll practice:** Union types, type narrowing with `switch`, generic transformations

Build a type-safe API response handler (Loading | Success | Error). This pattern is everywhere in production TypeScript — similar to Dart's sealed classes.

### 05 — Todo REST API ⭐⭐⭐

**What you'll practice:** Express routing, Zod validation, error handling, HTTP status codes

Build a complete CRUD API. This is the "build something real" exercise — the kind of thing you'd do in a live coding interview for a backend role.

### 06 — Utility Functions ⭐

**What you'll practice:** Closures, generics, recursion, async retry patterns

Implement 5 common utility functions (`debounce`, `deepClone`, `groupBy`, `retry`, `memoize`). These are classic interview questions that test core JavaScript/TypeScript fundamentals.
