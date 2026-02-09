// ============================================================================
// SOLUTION 03: Async Task Queue
// Run: npx tsx exercises/solutions/03-async-task-queue.solution.ts
// ============================================================================

type Task<T> = () => Promise<T>;

class TaskQueue {
  private concurrency: number;
  private running = 0;
  private queue: Array<() => void> = [];

  constructor(concurrency: number) {
    this.concurrency = concurrency;
  }

  async add<T>(task: Task<T>): Promise<T> {
    // Return a Promise that we control. We store its resolve/reject
    // so we can call them later when the task actually runs.
    return new Promise<T>((resolve, reject) => {
      const run = async () => {
        this.running++;
        try {
          const result = await task();
          resolve(result);
        } catch (err) {
          reject(err);
        } finally {
          this.running--;
          this.tryRunNext();
        }
      };

      if (this.running < this.concurrency) {
        run();
      } else {
        this.queue.push(run);
      }
    });
  }

  private tryRunNext(): void {
    if (this.running < this.concurrency && this.queue.length > 0) {
      const next = this.queue.shift()!;
      next();
    }
  }
}

// ============================================================================
// TESTS
// ============================================================================

console.log("=== Solution 03: Async Task Queue ===\n");

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
  queue.add(delay(600, "A")),
  queue.add(delay(300, "B")),
  queue.add(delay(400, "C")),
  queue.add(delay(200, "D")),
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
