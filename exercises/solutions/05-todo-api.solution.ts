// ============================================================================
// SOLUTION 05: Todo REST API
// Run: npx tsx exercises/solutions/05-todo-api.solution.ts
// Test: curl http://localhost:3000/todos
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

// Zod schemas for input validation
const createTodoSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title too long"),
});

const updateTodoSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  completed: z.boolean().optional(),
});

// --- In-Memory Store ---

const todos: Todo[] = [];
let nextId = 1;

// --- Helper ---

function findTodoIndex(id: string): number {
  return todos.findIndex((t) => t.id === id);
}

// --- Routes ---

// GET /todos — list all, with optional ?completed=true/false filter
app.get("/todos", (req: Request, res: Response) => {
  const { completed } = req.query;

  if (completed === "true") {
    res.json(todos.filter((t) => t.completed));
  } else if (completed === "false") {
    res.json(todos.filter((t) => !t.completed));
  } else {
    res.json(todos);
  }
});

// POST /todos — create a new todo
app.post("/todos", (req: Request, res: Response) => {
  const result = createTodoSchema.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({
      error: "Validation failed",
      details: result.error.flatten().fieldErrors,
    });
    return;
  }

  const todo: Todo = {
    id: String(nextId++),
    title: result.data.title,
    completed: false,
    createdAt: new Date(),
  };

  todos.push(todo);
  res.status(201).json(todo);
});

// GET /todos/:id — get a single todo
app.get("/todos/:id", (req: Request, res: Response) => {
  const index = findTodoIndex(req.params.id);

  if (index === -1) {
    res.status(404).json({ error: "Todo not found" });
    return;
  }

  res.json(todos[index]);
});

// PATCH /todos/:id — partial update
app.patch("/todos/:id", (req: Request, res: Response) => {
  const index = findTodoIndex(req.params.id);

  if (index === -1) {
    res.status(404).json({ error: "Todo not found" });
    return;
  }

  const result = updateTodoSchema.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({
      error: "Validation failed",
      details: result.error.flatten().fieldErrors,
    });
    return;
  }

  const existing = todos[index]!;
  const updated: Todo = { ...existing, ...result.data };
  todos[index] = updated;

  res.json(updated);
});

// DELETE /todos/:id — delete a todo
app.delete("/todos/:id", (req: Request, res: Response) => {
  const index = findTodoIndex(req.params.id);

  if (index === -1) {
    res.status(404).json({ error: "Todo not found" });
    return;
  }

  todos.splice(index, 1);
  res.status(204).send();
});

// --- Error Handling Middleware ---

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
