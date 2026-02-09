// ============================================================================
// SOLUTION 01: Array Transformations
// Run: npx tsx exercises/solutions/01-array-transform.solution.ts
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
function getEngineerNames(users: User[]): string[] {
  return users
    .filter((user) => user.department === "Engineering")
    .map((user) => user.name);
}

// 2. Get average salary across all users
function getAverageSalary(users: User[]): number {
  const total = users.reduce((sum, user) => sum + user.salary, 0);
  return total / users.length;
}

// 3. Group users by department
function groupByDepartment(users: User[]): Record<string, User[]> {
  return users.reduce<Record<string, User[]>>((groups, user) => {
    const dept = user.department;
    if (!groups[dept]) {
      groups[dept] = [];
    }
    groups[dept].push(user);
    return groups;
  }, {});
}

// 4. Get the highest paid user in each department
function getTopEarnerByDepartment(users: User[]): Record<string, User> {
  const grouped = groupByDepartment(users);

  return Object.fromEntries(
    Object.entries(grouped).map(([dept, deptUsers]) => {
      const topEarner = deptUsers.reduce((top, user) =>
        user.salary > top.salary ? user : top
      );
      return [dept, topEarner];
    })
  );
}

// 5. Sort users by salary descending, then by name ascending
function sortUsers(users: User[]): User[] {
  return [...users].sort((a, b) => {
    if (a.salary !== b.salary) return b.salary - a.salary; // descending
    return a.name.localeCompare(b.name); // ascending
  });
}

// ============================================================================
// TESTS
// ============================================================================

console.log("=== Solution 01: Array Transformations ===\n");

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
