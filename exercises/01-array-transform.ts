export {};
// ============================================================================
// EXERCISE 01: Array Transformations
// Difficulty: ⭐ Easy | Time target: 5 minutes
// Run: npx tsx exercises/01-array-transform.ts
// Solution: npx tsx exercises/solutions/01-array-transform.solution.ts
// ============================================================================
//
// Given an array of users, implement the following 5 functions using
// array methods (filter, map, reduce, sort).
//
// Dart equivalents:
//   filter → where    |    map → map    |    reduce → fold    |    sort → sort
//
// Key difference: Array.sort() MUTATES in place in JS/TS! Spread first: [...arr].sort()
// ============================================================================

interface User {
  id: number;
  name: string;
  age: number;
  department: string;
  salary: number;
}

const users: User[] = [
  { id: 1, name: "Alice", age: 30, department: "Engineering", salary: 120000 },
  { id: 2, name: "Bob", age: 25, department: "Marketing", salary: 80000 },
  { id: 3, name: "Charlie", age: 35, department: "Engineering", salary: 150000 },
  { id: 4, name: "Diana", age: 28, department: "Marketing", salary: 90000 },
  { id: 5, name: "Eve", age: 32, department: "Engineering", salary: 130000 },
];

// 1. Get names of all engineers
//    Expected: ["Alice", "Charlie", "Eve"]
function getEngineerNames(users: User[]): string[] {
  // TODO: filter by department === "Engineering", then map to name
  throw new Error("Not implemented");
}

// 2. Get average salary across all users
//    Expected: 114000
function getAverageSalary(users: User[]): number {
  // TODO: use reduce to sum salaries, then divide by length
  throw new Error("Not implemented");
}

// 3. Group users by department
//    Expected: { Engineering: [Alice, Charlie, Eve], Marketing: [Bob, Diana] }
function groupByDepartment(users: User[]): Record<string, User[]> {
  // TODO: use reduce to build a Record<string, User[]>
  throw new Error("Not implemented");
}

// 4. Get the highest paid user in each department
//    Expected: { Engineering: Charlie (150k), Marketing: Diana (90k) }
function getTopEarnerByDepartment(users: User[]): Record<string, User> {
  // TODO: first group by department, then find max salary in each group
  throw new Error("Not implemented");
}

// 5. Sort users by salary descending, then by name ascending (for ties)
//    Expected: Charlie (150k), Eve (130k), Alice (120k), Diana (90k), Bob (80k)
function sortUsers(users: User[]): User[] {
  // TODO: use [...users].sort() — remember sort mutates, so spread first!
  // Return negative if a should come first, positive if b should come first
  throw new Error("Not implemented");
}

// ============================================================================
// TESTS — Run this file to check your answers
// ============================================================================

console.log("=== Exercise 01: Array Transformations ===\n");

console.log("1. Engineer names:");
console.log("   Got:     ", getEngineerNames(users));
console.log("   Expected:", ["Alice", "Charlie", "Eve"]);

console.log("\n2. Average salary:");
console.log("   Got:     ", getAverageSalary(users));
console.log("   Expected:", 114000);

console.log("\n3. Group by department:");
const grouped = groupByDepartment(users);
console.log("   Engineering count:", grouped["Engineering"]?.length, "(expected 3)");
console.log("   Marketing count:  ", grouped["Marketing"]?.length, "(expected 2)");

console.log("\n4. Top earner by department:");
const topEarners = getTopEarnerByDepartment(users);
console.log("   Engineering:", topEarners["Engineering"]?.name, "(expected Charlie)");
console.log("   Marketing:  ", topEarners["Marketing"]?.name, "(expected Diana)");

console.log("\n5. Sorted users:");
const sorted = sortUsers(users);
console.log("   Got:     ", sorted.map((u) => `${u.name}(${u.salary})`));
console.log(
  "   Expected:",
  ["Charlie(150000)", "Eve(130000)", "Alice(120000)", "Diana(90000)", "Bob(80000)"]
);
