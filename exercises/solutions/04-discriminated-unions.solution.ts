// ============================================================================
// SOLUTION 04: Discriminated Unions — Type-Safe API Response Handler
// Run: npx tsx exercises/solutions/04-discriminated-unions.solution.ts
// ============================================================================

// The discriminated union — `status` is the discriminant property.
// TypeScript uses the literal type of `status` to narrow the union in switch/if blocks.
type ApiResponse<T> =
  | { status: "loading" }
  | { status: "success"; data: T }
  | { status: "error"; code: number; message: string };

// Process the response — TypeScript narrows the type in each case branch
function handleResponse<T>(response: ApiResponse<T>): string {
  switch (response.status) {
    case "loading":
      return "Loading...";
    case "success":
      return `Success: ${JSON.stringify(response.data)}`;
    case "error":
      return `Error ${response.code}: ${response.message}`;
  }
}

// Transform successful responses (like map on a Result/Either)
function mapResponse<T, U>(
  response: ApiResponse<T>,
  fn: (data: T) => U
): ApiResponse<U> {
  if (response.status === "success") {
    return { status: "success", data: fn(response.data) };
  }
  return response; // loading and error pass through unchanged
}

// Chain API calls (like flatMap/bind on a Result/Either)
function chainResponse<T, U>(
  response: ApiResponse<T>,
  fn: (data: T) => ApiResponse<U>
): ApiResponse<U> {
  if (response.status === "success") {
    return fn(response.data);
  }
  return response; // loading and error pass through unchanged
}

// ============================================================================
// TESTS
// ============================================================================

console.log("=== Solution 04: Discriminated Unions ===\n");

// Helper constructors
const loading = <T>(): ApiResponse<T> => ({ status: "loading" });
const success = <T>(data: T): ApiResponse<T> => ({ status: "success", data });
const error = <T>(code: number, message: string): ApiResponse<T> => ({
  status: "error",
  code,
  message,
});

// Test handleResponse
console.log("handleResponse tests:");
console.log(" ", handleResponse(loading()));                          // "Loading..."
console.log(" ", handleResponse(success({ name: "Alice" })));        // 'Success: {"name":"Alice"}'
console.log(" ", handleResponse(error(404, "Not found")));           // "Error 404: Not found"

// Test mapResponse
console.log("\nmapResponse tests:");
const userResponse = success({ name: "Alice", age: 30 });
const nameResponse = mapResponse(userResponse, (user) => user.name);
console.log(" ", handleResponse(nameResponse));                      // 'Success: "Alice"'

const loadingMapped = mapResponse(loading<string>(), (s) => s.length);
console.log(" ", handleResponse(loadingMapped));                     // "Loading..."

const errorMapped = mapResponse(error<string>(500, "Server error"), (s) => s.length);
console.log(" ", handleResponse(errorMapped));                       // "Error 500: Server error"

// Test chainResponse
console.log("\nchainResponse tests:");
const lookupAge = (name: string): ApiResponse<number> => {
  if (name === "Alice") return success(30);
  return error(404, `User ${name} not found`);
};

const aliceAge = chainResponse(success("Alice"), lookupAge);
console.log(" ", handleResponse(aliceAge));                          // "Success: 30"

const unknownAge = chainResponse(success("Unknown"), lookupAge);
console.log(" ", handleResponse(unknownAge));                        // "Error 404: User Unknown not found"

const chainedLoading = chainResponse(loading<string>(), lookupAge);
console.log(" ", handleResponse(chainedLoading));                    // "Loading..."
