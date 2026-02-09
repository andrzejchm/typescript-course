// ============================================================================
// EXERCISE 02: Type-Safe Event Emitter
// Difficulty: ⭐⭐ Medium | Time target: 10 minutes
// Run: npx tsx exercises/02-type-safe-event-emitter.ts
// Solution: npx tsx exercises/solutions/02-type-safe-event-emitter.solution.ts
// ============================================================================
//
// Implement a generic event emitter where event names and payloads are type-safe.
//
// Key TypeScript concepts:
//   - Generics with constraints: <Events extends Record<string, any>>
//   - keyof: to restrict event names to valid keys
//   - Indexed access types: Events[K] to get the payload type for a given event
//   - Map<K, V>: like Dart's Map, but use .get(), .set(), .has()
//
// Dart equivalent: This is like a typed StreamController, but with multiple events.
// ============================================================================

// This defines the shape of all events in our app.
// Each key is an event name, each value is the payload type.
interface AppEvents {
  userLoggedIn: { userId: string; timestamp: Date };
  userLoggedOut: { userId: string };
  messageReceived: { from: string; content: string };
  error: { code: number; message: string };
}

// TODO: Implement this class
// Hints:
//   - Store handlers in a Map<keyof Events, Set<handler>>
//   - on() should accept an event name (K) and a handler that takes Events[K]
//   - off() should remove a specific handler
//   - emit() should call all handlers for the given event with the payload
class TypedEventEmitter<Events extends Record<string, any>> {
  // TODO: private field to store handlers

  on<K extends keyof Events>(event: K, handler: (payload: Events[K]) => void): void {
    // TODO: register the handler for this event
    throw new Error("Not implemented");
  }

  off<K extends keyof Events>(event: K, handler: (payload: Events[K]) => void): void {
    // TODO: remove the handler for this event
    throw new Error("Not implemented");
  }

  emit<K extends keyof Events>(event: K, payload: Events[K]): void {
    // TODO: call all registered handlers for this event with the payload
    throw new Error("Not implemented");
  }
}

// ============================================================================
// TESTS — Run this file to check your implementation
// ============================================================================

console.log("=== Exercise 02: Type-Safe Event Emitter ===\n");

const emitter = new TypedEventEmitter<AppEvents>();

// Test 1: Basic on + emit
console.log("Test 1: on + emit");
emitter.on("userLoggedIn", (payload) => {
  // TypeScript knows payload is { userId: string; timestamp: Date }
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

// Test 5: Type safety (uncomment to see type errors)
console.log("\nTest 5: Type safety (uncomment lines below to verify type errors)");
// emitter.emit("userLoggedIn", { wrong: "data" });          // ← Type error!
// emitter.emit("nonExistentEvent", {});                      // ← Type error!
// emitter.on("error", (payload) => console.log(payload.userId)); // ← Type error! (no userId on error)
console.log("  ✓ Uncomment the lines above to verify they produce type errors");
