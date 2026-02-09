export {};
// ============================================================================
// SOLUTION 06: Utility Functions
// Run: npx tsx exercises/solutions/06-utility-functions.solution.ts
// ============================================================================

// 1. debounce — delay execution, reset timer on each call
function debounce<T extends (...args: any[]) => any>(fn: T, ms: number): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | undefined;

  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

// 2. deepClone — deep copy an object (handle nested objects and arrays)
function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => deepClone(item)) as T;
  }

  const cloned = {} as Record<string, unknown>;
  for (const key of Object.keys(obj)) {
    cloned[key] = deepClone((obj as Record<string, unknown>)[key]);
  }
  return cloned as T;
}

// 3. groupBy — group array items by a key function
function groupBy<T, K extends string>(items: T[], keyFn: (item: T) => K): Record<K, T[]> {
  return items.reduce<Record<K, T[]>>((groups, item) => {
    const key = keyFn(item);
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(item);
    return groups;
  }, {} as Record<K, T[]>);
}

// 4. retry — retry an async function N times with delay between attempts
async function retry<T>(fn: () => Promise<T>, retries: number, delay: number): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

// 5. memoize — cache function results based on arguments
function memoize<T extends (...args: any[]) => any>(fn: T): T {
  const cache = new Map<string, ReturnType<T>>();

  return ((...args: Parameters<T>): ReturnType<T> => {
    const key = JSON.stringify(args);
    if (cache.has(key)) {
      return cache.get(key)!;
    }
    const result = fn(...args);
    cache.set(key, result);
    return result;
  }) as T;
}

// ============================================================================
// TESTS
// ============================================================================

async function runTests() {
  console.log("=== Solution 06: Utility Functions ===\n");

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
