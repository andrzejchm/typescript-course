export {};
// ============================================================================
// SOLUTION 02: Type-Safe Event Emitter
// Run: npx tsx exercises/solutions/02-type-safe-event-emitter.solution.ts
// ============================================================================

interface AppEvents {
  userLoggedIn: { userId: string; timestamp: Date };
  userLoggedOut: { userId: string };
  messageReceived: { from: string; content: string };
  error: { code: number; message: string };
}

class TypedEventEmitter<Events extends Record<string, any>> {
  // Map from event name to a Set of handler functions.
  // We use `any` for the handler type in the Map because the generic constraint
  // is enforced at the method level (on/off/emit), not at the storage level.
  private handlers = new Map<keyof Events, Set<(payload: any) => void>>();

  on<K extends keyof Events>(event: K, handler: (payload: Events[K]) => void): void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);
  }

  off<K extends keyof Events>(event: K, handler: (payload: Events[K]) => void): void {
    this.handlers.get(event)?.delete(handler);
  }

  emit<K extends keyof Events>(event: K, payload: Events[K]): void {
    this.handlers.get(event)?.forEach((handler) => handler(payload));
  }
}

// ============================================================================
// TESTS
// ============================================================================

console.log("=== Solution 02: Type-Safe Event Emitter ===\n");

const emitter = new TypedEventEmitter<AppEvents>();

// Test 1: Basic on + emit
console.log("Test 1: on + emit");
emitter.on("userLoggedIn", (payload) => {
  console.log(`  ✓ User ${payload.userId} logged in at ${payload.timestamp.toISOString()}`);
});
emitter.emit("userLoggedIn", { userId: "alice-123", timestamp: new Date() });

// Test 2: Multiple handlers for same event
console.log("\nTest 2: Multiple handlers");
let handlerCallCount = 0;
const handler1 = () => { handlerCallCount++; };
const handler2 = () => { handlerCallCount++; };
emitter.on("userLoggedOut", handler1);
emitter.on("userLoggedOut", handler2);
emitter.emit("userLoggedOut", { userId: "bob" });
console.log(`  Handler call count: ${handlerCallCount} (expected 2)`);

// Test 3: off removes handler
console.log("\nTest 3: off removes handler");
handlerCallCount = 0;
emitter.off("userLoggedOut", handler1);
emitter.emit("userLoggedOut", { userId: "bob" });
console.log(`  Handler call count: ${handlerCallCount} (expected 1)`);

// Test 4: Emit with no handlers doesn't crash
console.log("\nTest 4: Emit with no handlers");
emitter.emit("messageReceived", { from: "charlie", content: "hello" });
console.log("  ✓ No crash");

// Test 5: Type safety
console.log("\nTest 5: Type safety");
// emitter.emit("userLoggedIn", { wrong: "data" });          // ← Type error!
// emitter.emit("nonExistentEvent", {});                      // ← Type error!
// emitter.on("error", (payload) => console.log(payload.userId)); // ← Type error!
console.log("  ✓ Uncomment the lines above to verify they produce type errors");
