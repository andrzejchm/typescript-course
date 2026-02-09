export {};
// ============================================================================
// EXERCISE 05: Todo REST API
// Difficulty: ⭐⭐⭐ Hard | Time target: 15 minutes
// Run: npx tsx exercises/05-todo-api.ts
// Test: curl http://localhost:3000/todos
// Solution: npx tsx exercises/solutions/05-todo-api.solution.ts
// ============================================================================
//
// Build a complete CRUD REST API for todos using Express + Zod.
//
// Requirements:
//   GET    /todos        — list all todos (support ?completed=true/false filter)
//   POST   /todos        — create a todo (validate body with Zod)
//   GET    /todos/:id    — get a single todo by id
//   PATCH  /todos/:id    — partial update (validate body with Zod)
//   DELETE /todos/:id    — delete a todo
//
// Rules:
//   - Use proper HTTP status codes (200, 201, 400, 404)
//   - Use Zod for input validation
//   - Use an in-memory array as the data store
//   - Return JSON responses
//
// Dart equivalent: This is like building a shelf/dart_frog API, but with Express.
// Express is much more minimal — no code generation, just app.get/post/patch/delete.
// ============================================================================

import express, { Request, Response, NextFunction } from "express";
import { z } from "zod";

const app = express();
app.use(express.json());

// --- Data Model ---

interface Todo {
  id: string;
  title: string;
  completed: boolean;
  createdAt: Date;
}

// TODO: Define Zod schemas for validation
// const createTodoSchema = z.object({ ... });
// const updateTodoSchema = z.object({ ... });  // all fields optional (partial update)

// --- In-Memory Store ---

const todos: Todo[] = [];
let nextId = 1;

// --- Routes ---

// GET /todos — list all todos
// Support query param: ?completed=true or ?completed=false
// If no filter, return all todos
app.get("/todos", (req: Request, res: Response) => {
  // TODO: implement
  // Hint: req.query.completed is a string ("true"/"false") or undefined
  res.status(501).json({ error: "Not implemented" });
});

// POST /todos — create a new todo
// Body: { title: string } (validated with Zod)
// Returns: 201 with the created todo
app.post("/todos", (req: Request, res: Response) => {
  // TODO: implement
  // Hint: use createTodoSchema.safeParse(req.body)
  // If validation fails, return 400 with error details
  res.status(501).json({ error: "Not implemented" });
});

// GET /todos/:id — get a single todo
// Returns: 200 with the todo, or 404 if not found
app.get("/todos/:id", (req: Request, res: Response) => {
  // TODO: implement
  res.status(501).json({ error: "Not implemented" });
});

// PATCH /todos/:id — update a todo (partial)
// Body: { title?: string, completed?: boolean } (validated with Zod)
// Returns: 200 with the updated todo, or 404 if not found
app.patch("/todos/:id", (req: Request, res: Response) => {
  // TODO: implement
  res.status(501).json({ error: "Not implemented" });
});

// DELETE /todos/:id — delete a todo
// Returns: 204 (no content), or 404 if not found
app.delete("/todos/:id", (req: Request, res: Response) => {
  // TODO: implement
  res.status(501).json({ error: "Not implemented" });
});

// --- Error Handling Middleware ---
// This catches any unhandled errors and returns a 500 response.
// Express error handlers have 4 parameters: (err, req, res, next)

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Unhandled error:", err.message);
  res.status(500).json({ error: "Internal server error" });
});

// --- Start Server ---

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Todo API running at http://localhost:${PORT}`);
  console.log("\nTest with curl:");
  console.log('  curl http://localhost:3000/todos');
  console.log('  curl -X POST http://localhost:3000/todos -H "Content-Type: application/json" -d \'{"title":"Buy milk"}\'');
  console.log('  curl http://localhost:3000/todos/1');
  console.log('  curl -X PATCH http://localhost:3000/todos/1 -H "Content-Type: application/json" -d \'{"completed":true}\'');
  console.log('  curl -X DELETE http://localhost:3000/todos/1');
  console.log('  curl "http://localhost:3000/todos?completed=false"');
});
