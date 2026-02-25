# Production TypeScript Engineering — For Flutter Developers

A practical TypeScript curriculum for Dart/Flutter developers who want to build production-ready backend and platform systems.

## Prerequisites

- **Node.js 20+** — [download](https://nodejs.org/) or use `nvm`
- **VS Code** — [download](https://code.visualstudio.com/)
- **npm** — comes with Node.js

## Quick Start

```bash
npm install
npm run dev    # opens a watch-mode playground
```

## What you will be able to build

- API services with clear type boundaries and safe contracts
- Resilient workflows with retries, cancellation, and recovery paths
- Observable systems with logs, metrics, traces, and alerts
- Deployable backend services with practical DevOps and reliability foundations

## Production principles

- **Type safety first**: model domain data explicitly and use the compiler as a design partner
- **Explicit error handling**: treat failures as part of the contract, not edge cases
- **Idempotency by default**: design handlers and jobs to be safe on retries
- **Observability built in**: instrument behavior so issues are diagnosable in production
- **Simplicity over abstraction**: choose clear, maintainable solutions before clever patterns

## How to study

Use this loop for each lesson:

1. **Learn** the concept from the lesson notes.
2. **Code** the examples in your own playground/project.
3. **Test** success and failure paths with realistic inputs.
4. **Operate** it: add logs/metrics, think through retries, and deployment behavior.

## Study Order (~8h25m+)

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
| 08 | [PostgreSQL Basics](lessons/08-postgresql-basics.md) | 25 min | SQL CRUD, `pg` driver, tables, relationships |
| 09 | [Backend Concepts](lessons/09-backend-concepts.md) | 30 min | N+1, CORS, REST, auth, caching, streaming, workflows |
| 10 | [GraphQL Basics](lessons/10-graphql-basics.md) | 20 min | Schema, queries, mutations, resolvers |
| 11 | [Observability Basics](lessons/11-observability-basics.md) | 25 min | Logs, metrics, traces, Sentry, OpenTelemetry, alerts |
| 12 | [Workflow Orchestration](lessons/12-workflow-orchestration.md) | 30 min | Durable workflows, retries, cancellation/resume, resilience patterns |
| 13 | [Redis & BullMQ](lessons/13-redis-bullmq.md) | 30 min | In-memory caching, job queues, pub/sub, rate limiting, workflow chaining |
| 14 | [Microservices and DevOps](lessons/14-microservices-devops.md) | 30 min | Monolith vs microservices, resilience, CI/CD, platforms, SLOs, security |
| 15 | [Essential Libraries](lessons/15-essential-libraries.md) | 25 min | React, Tailwind, Prisma, OpenAI, and more |
| 16 | [NestJS](lessons/16-nestjs.md) | 35 min | Structured framework with DI, modules, decorators — Flutter patterns on the backend |
| 17 | [Exercises](lessons/17-exercises.md) | 60+ min | End-to-end drills to combine typing, reliability, and operations thinking |
