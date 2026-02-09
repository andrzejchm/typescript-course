# 07 — Express Basics

Express is the most popular Node.js web framework. It's minimal and middleware-based — think of it as a simple HTTP server with a plugin system. Unlike Dart's `shelf` or Flutter's server-side options, Express is the de facto standard for Node.js APIs. Almost every TS backend interview will use it.

## 1. Hello World

```typescript
import express from "express";

const app = express();
app.use(express.json()); // parse JSON bodies (like shelf's bodyParser)

app.get("/", (req, res) => {
  res.json({ message: "Hello World" });
});

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
```

Run it: `npx ts-node server.ts` or `npx tsx server.ts`

---

## 2. Routes & HTTP Methods

```typescript
// GET — read
app.get("/users", (req, res) => {
  res.json(users);
});

app.get("/users/:id", (req, res) => {
  const { id } = req.params;
  res.json(users.find((u) => u.id === id));
});

// POST — create
app.post("/users", (req, res) => {
  const body = req.body;
  // ... create user
  res.status(201).json(newUser);
});

// PUT — update (full replacement)
app.put("/users/:id", (req, res) => {
  // ... replace entire user
  res.json(updatedUser);
});

// PATCH — update (partial)
app.patch("/users/:id", (req, res) => {
  // ... update specific fields
  res.json(updatedUser);
});

// DELETE — remove
app.delete("/users/:id", (req, res) => {
  // ... delete user
  res.status(204).send();
});
```

> **Dart comparison:** Similar to `shelf_router`'s `Router()..get()..post()` pattern, but Express uses `app.get()`, `app.post()`, etc.

---

## 3. Request & Response

```typescript
app.post("/users", (req, res) => {
  // === Request ===
  req.params;   // URL params — /users/:id → { id: "123" }
  req.query;    // Query string — /users?page=1 → { page: "1" }
  req.body;     // POST/PUT body (parsed JSON)
  req.headers;  // HTTP headers

  // === Response ===
  res.status(201).json({ id: "123", name: "Alice" }); // JSON response
  res.status(404).json({ error: "Not found" });        // error response
  res.status(204).send();                               // no content
});
```

Common status codes:

| Code | Meaning | When to Use |
|------|---------|-------------|
| `200` | OK | Successful GET, PUT, PATCH |
| `201` | Created | Successful POST |
| `204` | No Content | Successful DELETE |
| `400` | Bad Request | Invalid input |
| `404` | Not Found | Resource doesn't exist |
| `500` | Internal Server Error | Unhandled error |

---

## 4. Middleware

Middleware = function that runs before your route handler. Like Dart shelf's `Middleware` or `Pipeline`.

```typescript
import { Request, Response, NextFunction } from "express";

// Logging middleware
function logger(req: Request, res: Response, next: NextFunction) {
  console.log(`${req.method} ${req.path}`);
  next(); // pass to next middleware/handler — MUST call this!
}

// Auth middleware
function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization;
  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return; // don't call next() — stop the chain
  }
  next();
}

// Apply to all routes
app.use(logger);

// Apply to specific routes
app.get("/admin", requireAuth, (req, res) => {
  res.json({ secret: "data" });
});
```

### Error Middleware (4 params!)

```typescript
// Error handler — Express identifies it by the 4 parameters
function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction,
) {
  console.error(err.stack);
  res.status(500).json({ error: "Internal server error" });
}

// MUST be registered last, after all routes
app.use(errorHandler);
```

> **Key:** Express distinguishes error middleware from regular middleware by the **4-parameter signature**. All 4 params are required even if you don't use `next`.

---

## 5. Router (Organize Routes)

Split routes into separate files/modules:

```typescript
import express from "express";

const userRouter = express.Router();

userRouter.get("/", listUsers);       // GET /api/users
userRouter.post("/", createUser);     // POST /api/users
userRouter.get("/:id", getUser);      // GET /api/users/:id
userRouter.put("/:id", updateUser);   // PUT /api/users/:id
userRouter.delete("/:id", deleteUser); // DELETE /api/users/:id

// Mount the router with a prefix
app.use("/api/users", userRouter);
```

> **Dart comparison:** Like `shelf_router`'s `Router()` but mounted on a path prefix with `app.use()`.

---

## 6. Full Example — Todo API

A complete working API in ~50 lines:

```typescript
import express from "express";

const app = express();
app.use(express.json());

// In-memory "database"
interface Todo {
  id: string;
  title: string;
  done: boolean;
}

let todos: Todo[] = [];
let nextId = 1;

// GET /todos — list all
app.get("/todos", (req, res) => {
  res.json(todos);
});

// POST /todos — create one
app.post("/todos", (req, res) => {
  const { title } = req.body;
  if (!title) {
    res.status(400).json({ error: "title is required" });
    return;
  }
  const todo: Todo = { id: String(nextId++), title, done: false };
  todos.push(todo);
  res.status(201).json(todo);
});

// GET /todos/:id — get one
app.get("/todos/:id", (req, res) => {
  const todo = todos.find((t) => t.id === req.params.id);
  if (!todo) {
    res.status(404).json({ error: "Todo not found" });
    return;
  }
  res.json(todo);
});

// DELETE /todos/:id — delete one
app.delete("/todos/:id", (req, res) => {
  const index = todos.findIndex((t) => t.id === req.params.id);
  if (index === -1) {
    res.status(404).json({ error: "Todo not found" });
    return;
  }
  todos.splice(index, 1);
  res.status(204).send();
});

// Error handler (must be last)
app.use(
  (err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  },
);

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
```

Test it with curl:

```bash
# Create
curl -X POST http://localhost:3000/todos \
  -H "Content-Type: application/json" \
  -d '{"title": "Learn Express"}'

# List
curl http://localhost:3000/todos

# Get one
curl http://localhost:3000/todos/1

# Delete
curl -X DELETE http://localhost:3000/todos/1
```

---

## Quick Reference

| Express | Dart shelf equivalent | Purpose |
|---------|----------------------|---------|
| `express()` | `Pipeline()` | Create app |
| `app.use(middleware)` | `pipeline.addMiddleware()` | Add middleware |
| `app.get("/path", handler)` | `router.get("/path", handler)` | Route handler |
| `express.Router()` | `Router()` | Group routes |
| `req.params` | `request.params` | URL parameters |
| `req.body` | `request.readAsString()` + parse | Request body |
| `res.json(data)` | `Response.ok(jsonEncode(data))` | JSON response |
| `res.status(404)` | `Response(404)` | Set status code |
| `next()` | return `innerHandler(request)` | Pass to next handler |

---

**Previous:** [06-error-handling.md](./06-error-handling.md) — Error Handling & Validation
