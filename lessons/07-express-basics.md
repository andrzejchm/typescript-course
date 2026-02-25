# 07 - Express Basics

Express is a thin HTTP framework. In production, that is a strength: you keep control over architecture, middleware, and operational behavior.

This lesson moves from a basic app to a maintainable API service with clear boundaries, consistent errors, validation, and safe shutdown.

---

## 1. Production-Ready Service Shape

Use a small module layout early so the app can grow without rewrites.

```text
src/
  app.ts                 # express app wiring (no network listen)
  server.ts              # process startup and shutdown
  config/env.ts          # environment parsing/validation
  routes/v1/index.ts     # API v1 router
  routes/v1/users.ts     # resource routes
  middleware/
    request-id.ts
    error-handler.ts
    not-found.ts
  lib/
    logger.ts
    db.ts
```

Keep `app.ts` pure (build app only). Keep `server.ts` operational (listen, signals, shutdown).

---

## 2. App Bootstrap and Middleware Order

Middleware order is architecture. The wrong order creates bugs, security gaps, or inconsistent responses.

```typescript
import express from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { v4 as uuidv4 } from "uuid";
import { apiV1Router } from "./routes/v1/index";
import { notFound } from "./middleware/not-found";
import { errorHandler } from "./middleware/error-handler";

export function createApp() {
  const app = express();

  // 1) Cross-cutting request context
  app.use((req, res, next) => {
    req.id = req.header("x-request-id") ?? uuidv4();
    res.setHeader("x-request-id", req.id);
    next();
  });

  // 2) Security and transport controls
  app.use(helmet());
  app.use(cors({ origin: ["https://app.example.com"] }));
  app.use(
    rateLimit({
      windowMs: 60_000,
      max: 120,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );

  // 3) Body parsing and payload limits
  app.use(express.json({ limit: "1mb" }));

  // 4) Health endpoints
  app.get("/health", (_req, res) => res.status(200).json({ ok: true }));

  // 5) Versioned API
  app.use("/api/v1", apiV1Router);

  // 6) Fallback + centralized errors (must be last)
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
```

---

## 3. Versioned Routing and Validation at Boundaries

Validate all untrusted input (params, query, body) before business logic.

```typescript
import { Router } from "express";
import { z } from "zod";

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(120),
});

export const usersRouter = Router();

usersRouter.post("/", async (req, res, next) => {
  try {
    const input = createUserSchema.parse(req.body);

    const user = await createUser(input); // domain/service layer
    res.status(201).json({ data: user });
  } catch (error) {
    next(error);
  }
});
```

Add new behavior with non-breaking changes under `/api/v1`. Introduce `/api/v2` only for breaking contract changes.

---

## 4. Consistent Error Contract

Clients should not guess error shapes. Return one structure for all failures.

```typescript
import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

type ApiErrorResponse = {
  error: {
    code: string;
    message: string;
    details?: unknown;
    requestId?: string;
  };
};

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response<ApiErrorResponse>,
  _next: NextFunction,
) {
  if (err instanceof ZodError) {
    return res.status(422).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Request validation failed",
        details: err.flatten(),
        requestId: req.id,
      },
    });
  }

  return res.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message: "Unexpected server error",
      requestId: req.id,
    },
  });
}
```

Recommended status usage:

- `200`/`201`/`204` for success
- `400` for malformed request
- `401`/`403` for auth/authz
- `404` for missing resources
- `409` for conflicts (duplicates, state mismatch)
- `422` for semantic validation errors
- `429` for rate-limited requests
- `500`/`503` for server or dependency failures

---

## 5. Idempotency and Retries for Write APIs

External clients retry on timeouts. Protect write endpoints from duplicate side effects.

Pattern:

- Accept `Idempotency-Key` header on critical `POST` operations.
- Store key + request fingerprint + response for a short TTL.
- Return cached response when the same key is reused.
- Reject same key with different payload (`409 Conflict`).

Use this for payments, order creation, and workflow start endpoints.

---

## 6. Graceful Shutdown

A production service must stop accepting traffic, finish in-flight requests, and close dependencies.

```typescript
import { createServer } from "node:http";
import { createApp } from "./app";
import { closeDbPool } from "./lib/db";

const app = createApp();
const server = createServer(app);

server.listen(3000, () => {
  console.log("API listening on :3000");
});

async function shutdown(signal: string) {
  console.log(`${signal} received, starting graceful shutdown`);

  server.close(async () => {
    try {
      await closeDbPool();
      process.exit(0);
    } catch (error) {
      console.error("Shutdown failed", error);
      process.exit(1);
    }
  });

  setTimeout(() => {
    console.error("Forcing shutdown after timeout");
    process.exit(1);
  }, 10_000).unref();
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
```

---

## 7. Minimal Production Checklist

- Version your public API (`/api/v1`)
- Validate all inputs at the HTTP boundary
- Standardize error responses across the whole service
- Add security middleware (`helmet`, CORS policy, payload limits)
- Enforce rate limits on public endpoints
- Emit request IDs and include them in logs/errors
- Implement health checks (`/health`, optionally `/ready`)
- Gracefully shut down HTTP server and DB pools

---

**Previous:** [06-error-handling.md](./06-error-handling.md) - Error Handling & Validation  
**Next:** [08-postgresql-basics.md](./08-postgresql-basics.md) - PostgreSQL Basics
