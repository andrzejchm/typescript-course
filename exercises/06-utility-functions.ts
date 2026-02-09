// ============================================================================
// EXERCISE 06: Utility Functions
// Difficulty: ⭐ Easy | Time target: 10 minutes
// Run: npx tsx exercises/06-utility-functions.ts
// Solution: npx tsx exercises/solutions/06-utility-functions.solution.ts
// ============================================================================
//
// Implement 5 common utility functions. These are classic interview questions
// that test your understanding of closures, generics, recursion, and async patterns.
//
// Dart equivalents noted for each function.
// ============================================================================

// 1. debounce — delay execution, reset timer on each call
//    Dart equivalent: Timer + cancel pattern, or rxdart's debounceTime
//
//    How it works:
//    - Returns a new function that delays calling `fn` by `ms` milliseconds
//    - If called again before `ms` elapses, the timer resets
//    - Only the LAST call within the delay window actually executes
//
//    Example: debounced search — user types "abc", only searches for "abc" (not "a", "ab")
function debounce<T extends (...args: any[]) => any>(fn: T, ms: number): (...args: Parameters<T>) => void {
  // TODO: use setTimeout/clearTimeout
  // Hint: store the timer ID in a closure variable
  throw new Error("Not implemented");
}

// 2. deepClone — deep copy an object (handle nested objects and arrays)
//    Dart equivalent: json.decode(json.encode(obj)) or a manual recursive copy
//
//    Rules:
//    - Primitives (string, number, boolean, null, undefined) → return as-is
//    - Arrays → recursively clone each element
//    - Objects → recursively clone each value
//    - Don't worry about Date, Map, Set, or circular references
function deepClone<T>(obj: T): T {
  // TODO: implement recursively
  // Hint: check Array.isArray() first, then typeof === "object"
  throw new Error("Not implemented");
}

// 3. groupBy — group array items by a key function
//    Dart equivalent: collection package's groupBy
//
//    Example: groupBy([1,2,3,4], n => n % 2 === 0 ? "even" : "odd")
//    Result: { even: [2, 4], odd: [1, 3] }
function groupBy<T, K extends string>(items: T[], keyFn: (item: T) => K): Record<K, T[]> {
  // TODO: use reduce to build the record
  throw new Error("Not implemented");
}

// 4. retry — retry an async function N times with delay between attempts
//    Dart equivalent: manual try/catch in a loop with Future.delayed
//
//    Rules:
//    - Try calling fn()
//    - If it throws, wait `delay` ms, then try again
//    - After `retries` failed attempts, throw the last error
//    - If retries is 0, just call fn() once (no retries)
async function retry<T>(fn: () => Promise<T>, retries: number, delay: number): Promise<T> {
  // TODO: implement with a loop or recursion
  throw new Error("Not implemented");
}

// 5. memoize — cache function results based on arguments
//    Dart equivalent: no built-in, but similar to a manual cache Map
//
//    Rules:
//    - First call with given args → call fn, cache result, return it
//    - Subsequent calls with same args → return cached result (don't call fn)
//    - Use JSON.stringify(args) as the cache key (simple but effective)
function memoize<T extends (...args: any[]) => any>(fn: T): T {
  // TODO: use a Map<string, ReturnType<T>> as cache
  // Hint: JSON.stringify(args) for the cache key
  throw new Error("Not implemented");
}

// ============================================================================
// TESTS — Run this file to check your implementations
// ============================================================================

async function runTests() {
  console.log("=== Exercise 06: Utility Functions ===\n");

  // --- Test debounce ---
  console.log("1. debounce:");
  let callCount = 0;
  const debouncedFn = debounce((x: number) => { callCount++; console.log(`   Called with ${x}`); }, 100);
  debouncedFn(1);
  debouncedFn(2);
  debouncedFn(3); // Only this one should execute
  await new Promise((r) => setTimeout(r, 200));
  console.log(`   Call count: ${callCount} (expected 1)`);

  // --- Test deepClone ---
  console.log("\n2. deepClone:");
  const original = { a: 1, b: { c: [1, 2, { d: 3 }] } };
  const cloned = deepClone(original);
  cloned.b.c[0] = 999;
  console.log(`   Original b.c[0]: ${original.b.c[0]} (expected 1 — should not be mutated)`);
  console.log(`   Cloned b.c[0]:   ${cloned.b.c[0]} (expected 999)`);

  // --- Test groupBy ---
  console.log("\n3. groupBy:");
  const numbers = [1, 2, 3, 4, 5, 6];
  const grouped = groupBy(numbers, (n) => (n % 2 === 0 ? "even" : "odd") as "even" | "odd");
  console.log(`   Even: [${grouped["even"]}] (expected [2,4,6])`);
  console.log(`   Odd:  [${grouped["odd"]}] (expected [1,3,5])`);

  // --- Test retry ---
  console.log("\n4. retry:");
  let attempt = 0;
  const flakyFn = async (): Promise<string> => {
    attempt++;
    if (attempt < 3) throw new Error(`Attempt ${attempt} failed`);
    return "success";
  };
  try {
    const result = await retry(flakyFn, 3, 100);
    console.log(`   Result: ${result} (expected "success")`);
    console.log(`   Attempts: ${attempt} (expected 3)`);
  } catch (e) {
    console.log(`   Unexpected error: ${e}`);
  }

  // Test retry failure
  const alwaysFails = async () => { throw new Error("always fails"); };
  try {
    await retry(alwaysFails, 2, 50);
    console.log("   Should have thrown!");
  } catch (e: any) {
    console.log(`   Correctly threw after retries: "${e.message}"`);
  }

  // --- Test memoize ---
  console.log("\n5. memoize:");
  let computeCount = 0;
  const expensiveFn = (x: number, y: number): number => {
    computeCount++;
    return x + y;
  };
  const memoized = memoize(expensiveFn);
  console.log(`   memoized(1, 2) = ${memoized(1, 2)} (expected 3)`);
  console.log(`   memoized(1, 2) = ${memoized(1, 2)} (expected 3, from cache)`);
  console.log(`   memoized(3, 4) = ${memoized(3, 4)} (expected 7)`);
  console.log(`   Compute count: ${computeCount} (expected 2 — second call was cached)`);
}

runTests();
