# TypeScript in 1 Day — For Flutter Developers

A crash course to get you interview-ready in TypeScript. Built for Dart developers who need to write TS fluently in a live coding interview.

## Prerequisites

- **Node.js 20+** — [download](https://nodejs.org/) or use `nvm`
- **VS Code** — [download](https://code.visualstudio.com/)
- **npm** — comes with Node.js

## Quick Start

```bash
npm install
npm run dev    # opens a watch-mode playground
```

## Study Order (~9.5–10 hours)

| #  | Lesson                  | Time   | What You'll Learn                        |
|----|-------------------------|--------|------------------------------------------|
| 00 | [Setup](lessons/00-setup.md) | 15 min | Node, npm, tooling — the Dart equivalents |
| 01 | [Dart → TS](lessons/01-dart-to-ts.md) | 20 min | Syntax side-by-side, key differences |
| 02 | [Types](lessons/02-types.md) | 30 min | Type system, unions, narrowing, `unknown` |
| 03 | [Functions & Async](lessons/03-functions-async.md) | 30 min | Arrow fns, closures, Promises, async/await |
| 04 | [Arrays & Objects](lessons/04-arrays-objects.md) | 25 min | Destructuring, spread, map/filter/reduce |
| 05 | [Interfaces & Generics](lessons/05-interfaces-generics.md) | 30 min | Interfaces, type aliases, generics |
| 06 | [Error Handling](lessons/06-error-handling.md) | 20 min | try/catch, custom errors, Result pattern |
| 07 | [Express Basics](lessons/07-express-basics.md) | 25 min | HTTP server, routes, middleware |
| 09 | [GraphQL Basics](lessons/09-graphql-basics.md) | 20 min | Schema, queries, mutations, resolvers |
| 10 | [Essential Libraries](lessons/10-essential-libraries.md) | 25 min | React, Tailwind, Prisma, OpenAI, and more |
| 11 | [PostgreSQL Basics](lessons/11-postgresql-basics.md) | 25 min | SQL CRUD, `pg` driver, tables, relationships |
| 12 | [Backend Concepts](lessons/12-backend-concepts.md) | 30 min | N+1, CORS, REST, auth, caching, streaming, workflows |
| 13 | [Observability Basics](lessons/13-observability-basics.md) | 25 min | Logs, metrics, traces, Sentry, OpenTelemetry, alerts |
| 14 | [Workflow Orchestration](lessons/14-workflow-orchestration.md) | 30 min | Durable workflows, retries, cancellation/resume, resilience patterns |
| 15 | [Microservices and DevOps](lessons/15-microservices-devops.md) | 30 min | Monolith vs microservices, resilience, CI/CD, platforms, SLOs, security |
| 08 | [Exercises](lessons/08-exercises.md) | 60+ min | Practice problems, interview-style |

## Interview Tips

- **Talk while you code.** Explain your approach before writing. Interviewers care about your thought process as much as the solution.
- **Start with types.** Define your data shapes first (`interface`, `type`). It shows you think before you code and catches bugs early.
- **Use `const` by default.** Only reach for `let` when you need reassignment. Never use `var`. This signals you know modern JS/TS.
- **Don't fight the type system.** If you're reaching for `any` or `as`, step back and think about the actual type. Interviewers notice.
- **Know your array methods.** `map`, `filter`, `reduce`, `find`, `some`, `every` — these replace most loops and show fluency.
