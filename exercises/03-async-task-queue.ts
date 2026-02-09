// ============================================================================
// EXERCISE 03: Async Task Queue
// Difficulty: ⭐⭐ Medium | Time target: 10 minutes
// Run: npx tsx exercises/03-async-task-queue.ts
// Solution: npx tsx exercises/solutions/03-async-task-queue.solution.ts
// ============================================================================
//
// Implement a task queue that processes async tasks with a concurrency limit.
//
// Key concepts:
//   - Promise mechanics: resolve/reject, Promise.all
//   - async/await
//   - Concurrency control (like a semaphore)
//
// How it should work:
//   1. queue.add(task) returns a Promise that resolves when the task completes
//   2. At most `concurrency` tasks run simultaneously
//   3. When a running task finishes, the next queued task starts automatically
//
// Dart equivalent: Think of it like a pool of isolates with a max count,
// or like using a Semaphore to limit concurrent operations.
// ============================================================================

type Task<T> = () => Promise<T>;

class TaskQueue {
  private concurrency: number;
  // TODO: add fields to track running count and queued tasks
  // Hint: you need a queue of "start functions" and a count of running tasks

  constructor(concurrency: number) {
    this.concurrency = concurrency;
  }

  async add<T>(task: Task<T>): Promise<T> {
    // TODO: implement
    //
    // Strategy:
    //   1. Return a new Promise
    //   2. Inside the Promise, push a "start function" onto the queue
    //   3. The start function should: run the task, resolve/reject the outer Promise,
    //      then decrement running count and try to start the next queued task
    //   4. After pushing, call a method to try starting tasks (if under concurrency limit)
    //
    // This is tricky! The key insight is that you create a Promise and store its
    // resolve/reject so you can call them later when the task actually runs.
    throw new Error("Not implemented");
  }
}

// ============================================================================
// TESTS — Run this file to check your implementation
// ============================================================================

console.log("=== Exercise 03: Async Task Queue ===\n");

const delay = (ms: number, label: string): Task<string> => {
  return async () => {
    console.log(`  [${new Date().toISOString().slice(11, 23)}] Starting ${label}`);
    await new Promise((resolve) => setTimeout(resolve, ms));
    console.log(`  [${new Date().toISOString().slice(11, 23)}] Finished ${label}`);
    return label;
  };
};

// Test 1: Concurrency limit of 2
console.log("Test 1: Max 2 concurrent tasks");
console.log("  Expected: A and B start together, C starts when B finishes, D starts when C finishes\n");

const queue = new TaskQueue(2);

const start = Date.now();

Promise.all([
  queue.add(delay(600, "A")), // Takes 600ms
  queue.add(delay(300, "B")), // Takes 300ms — finishes first
  queue.add(delay(400, "C")), // Queued — starts when B finishes
  queue.add(delay(200, "D")), // Queued — starts when next slot opens
]).then((results) => {
  const elapsed = Date.now() - start;
  console.log(`\n  All done in ${elapsed}ms`);
  console.log(`  Results: [${results.join(", ")}]`);
  console.log(`  Expected: [A, B, C, D]`);
  console.log(`  Time should be ~700-900ms (not 1500ms if sequential)`);

  // Test 2: Concurrency of 1 (sequential)
  console.log("\n\nTest 2: Concurrency of 1 (sequential)");
  const seqQueue = new TaskQueue(1);
  const seqStart = Date.now();

  Promise.all([
    seqQueue.add(delay(100, "X")),
    seqQueue.add(delay(100, "Y")),
    seqQueue.add(delay(100, "Z")),
  ]).then((seqResults) => {
    const seqElapsed = Date.now() - seqStart;
    console.log(`\n  Sequential done in ${seqElapsed}ms`);
    console.log(`  Results: [${seqResults.join(", ")}]`);
    console.log(`  Time should be ~300ms (sequential)`);
  });
});
