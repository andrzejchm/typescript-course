// ============================================================================
// EXERCISE 04: Discriminated Unions — Type-Safe API Response Handler
// Difficulty: ⭐⭐ Medium | Time target: 10 minutes
// Run: npx tsx exercises/04-discriminated-unions.ts
// Solution: npx tsx exercises/solutions/04-discriminated-unions.solution.ts
// ============================================================================
//
// Build a type-safe API response handler using discriminated unions.
//
// Dart equivalent: This is like sealed classes + pattern matching in Dart 3.
//   sealed class ApiResponse<T> {}
//   class Loading<T> extends ApiResponse<T> {}
//   class Success<T> extends ApiResponse<T> { final T data; }
//   class ApiError<T> extends ApiResponse<T> { final int code; final String message; }
//
// In TypeScript, we use discriminated unions instead of sealed classes.
// The "discriminant" is a shared property (like `status`) with literal types.
// TypeScript narrows the type automatically in switch/if blocks.
// ============================================================================

// 1. Define ApiResponse<T> as a discriminated union
//    It should have three variants:
//    - { status: "loading" }                                    — no data
//    - { status: "success", data: T }                           — with typed data
//    - { status: "error", code: number, message: string }       — with error info
//
// TODO: Define the type
// type ApiResponse<T> = ...

// 2. Implement a function that processes the response and returns a human-readable string
//    - loading → "Loading..."
//    - success → "Success: <data>" (use JSON.stringify for the data)
//    - error   → "Error <code>: <message>"
//
// TODO: implement
// function handleResponse<T>(response: ApiResponse<T>): string { ... }

// 3. Implement a function that transforms successful responses (like Dart's map on a Result)
//    - If success → apply fn to data, return new success with transformed data
//    - If loading or error → return as-is (pass through)
//
// TODO: implement
// function mapResponse<T, U>(response: ApiResponse<T>, fn: (data: T) => U): ApiResponse<U> { ... }

// 4. Implement a function that chains API calls (like flatMap/bind)
//    - If success → apply fn to data (fn returns a NEW ApiResponse)
//    - If loading or error → return as-is (pass through)
//
// TODO: implement
// function chainResponse<T, U>(response: ApiResponse<T>, fn: (data: T) => ApiResponse<U>): ApiResponse<U> { ... }

// ============================================================================
// TESTS — Uncomment these after implementing the types and functions above
// ============================================================================

console.log("=== Exercise 04: Discriminated Unions ===\n");

// --- Uncomment everything below once you've defined ApiResponse<T> and the functions ---

// // Helper to create responses easily
// const loading = <T>(): ApiResponse<T> => ({ status: "loading" });
// const success = <T>(data: T): ApiResponse<T> => ({ status: "success", data });
// const error = <T>(code: number, message: string): ApiResponse<T> => ({ status: "error", code, message });

// // Test handleResponse
// console.log("handleResponse tests:");
// console.log(" ", handleResponse(loading()));                          // "Loading..."
// console.log(" ", handleResponse(success({ name: "Alice" })));        // 'Success: {"name":"Alice"}'
// console.log(" ", handleResponse(error(404, "Not found")));           // "Error 404: Not found"

// // Test mapResponse
// console.log("\nmapResponse tests:");
// const userResponse = success({ name: "Alice", age: 30 });
// const nameResponse = mapResponse(userResponse, (user) => user.name);
// console.log(" ", handleResponse(nameResponse));                      // 'Success: "Alice"'

// const loadingMapped = mapResponse(loading<string>(), (s) => s.length);
// console.log(" ", handleResponse(loadingMapped));                     // "Loading..."

// const errorMapped = mapResponse(error<string>(500, "Server error"), (s) => s.length);
// console.log(" ", handleResponse(errorMapped));                       // "Error 500: Server error"

// // Test chainResponse
// console.log("\nchainResponse tests:");
// const lookupAge = (name: string): ApiResponse<number> => {
//   if (name === "Alice") return success(30);
//   return error(404, `User ${name} not found`);
// };

// const aliceAge = chainResponse(success("Alice"), lookupAge);
// console.log(" ", handleResponse(aliceAge));                          // 'Success: 30'

// const unknownAge = chainResponse(success("Unknown"), lookupAge);
// console.log(" ", handleResponse(unknownAge));                        // "Error 404: User Unknown not found"

// const chainedLoading = chainResponse(loading<string>(), lookupAge);
// console.log(" ", handleResponse(chainedLoading));                    // "Loading..."

console.log("\n⚠️  Uncomment the test code above after implementing the types and functions!");
