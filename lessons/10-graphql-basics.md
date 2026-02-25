# 10 - GraphQL Basics

GraphQL is a contract-first API layer where clients request exactly the fields they need from a single endpoint. In production, GraphQL succeeds when the schema is governed carefully and resolver performance is managed deliberately.

---

## 1. Core Model

GraphQL has five core building blocks:

- **Schema**: the source of truth for API capabilities
- **Types**: object, scalar, enum, interface, union, input
- **Queries**: read operations
- **Mutations**: write operations
- **Resolvers**: runtime functions that fulfill fields

The schema is your API contract. Treat it like a public interface with compatibility rules.

---

## 2. Schema First, Explicitly Typed

```graphql
scalar DateTime

type User {
  id: ID!
  email: String!
  name: String!
  createdAt: DateTime!
  posts(limit: Int = 20, after: String): PostConnection!
}

type Post {
  id: ID!
  title: String!
  body: String!
  author: User!
  createdAt: DateTime!
}

type PostConnection {
  edges: [PostEdge!]!
  pageInfo: PageInfo!
}

type PostEdge {
  cursor: String!
  node: Post!
}

type PageInfo {
  hasNextPage: Boolean!
  endCursor: String
}

type Query {
  user(id: ID!): User
  users(limit: Int = 50): [User!]!
}

input CreatePostInput {
  title: String!
  body: String!
}

type Mutation {
  createPost(input: CreatePostInput!): Post!
}
```

Production defaults:

- Make nullability decisions intentionally (`!` only when guaranteed)
- Prefer explicit input objects over long argument lists
- Prefer cursor-based pagination for high-scale collections

---

## 3. Resolver Structure and Context

Resolver signature: `(parent, args, context, info)`.

Use `context` for request-scoped dependencies (auth identity, DB handle, DataLoader instances).

```typescript
type GraphqlContext = {
  requestId: string;
  userId: string | null;
  db: DbClient;
  loaders: {
    userById: DataLoader<string, User | null>;
  };
};

const resolvers = {
  Query: {
    user: async (_: unknown, args: { id: string }, ctx: GraphqlContext) => {
      return ctx.loaders.userById.load(args.id);
    },
  },
  Post: {
    author: async (post: { authorId: string }, _: unknown, ctx: GraphqlContext) => {
      return ctx.loaders.userById.load(post.authorId);
    },
  },
};
```

Keep resolver logic thin. Put business rules in services/use-cases so they are testable outside GraphQL transport.

---

## 4. N+1 and DataLoader

N+1 appears when each parent field triggers a separate query for related data.

Example failure mode:

- `users` returns 200 users
- `User.posts` runs one SQL query per user
- Total queries: `1 + 200`

Use DataLoader to batch and cache during a request.

```typescript
import DataLoader from "dataloader";

function createUserByIdLoader(db: DbClient) {
  return new DataLoader<string, User | null>(async (userIds) => {
    const rows = await db.queryUsersByIds([...userIds]);
    const map = new Map(rows.map((user) => [user.id, user]));
    return userIds.map((id) => map.get(id) ?? null);
  });
}
```

DataLoader scope must be per request, not global. Global loaders leak data between users and break auth boundaries.

---

## 5. Error Model and Client Contracts

GraphQL responses may include both `data` and `errors`.

Recommendations:

- Map domain errors to stable codes (`extensions.code`)
- Hide internal stack traces from clients
- Log with request ID and resolver path
- Return partial data only when it is acceptable for your client flow

Example error shape:

```json
{
  "errors": [
    {
      "message": "User not found",
      "extensions": {
        "code": "NOT_FOUND",
        "requestId": "req_123"
      }
    }
  ],
  "data": {
    "user": null
  }
}
```

---

## 6. Schema Governance and Evolution

A GraphQL API usually evolves in one graph rather than versioned endpoints. Governance prevents breaking clients.

Rules that keep schema evolution safe:

- Additive changes are generally safe (new fields, new types)
- Breaking changes require migration windows (not immediate removal)
- Deprecate fields with `@deprecated(reason: "...")`
- Track field usage before removal
- Publish schema diffs in CI and block breaking merges

Example deprecation:

```graphql
type User {
  id: ID!
  fullName: String! @deprecated(reason: "Use name")
  name: String!
}
```

For large teams, establish a schema review process the same way you review database migrations.

---

## 7. Operational Controls for Production GraphQL

GraphQL needs guardrails to avoid expensive or abusive queries:

- Depth limit: prevent deeply nested payload bombs
- Complexity/cost analysis: cap expensive operations
- Timeouts and cancellation: fail fast on long-running resolvers
- Persisted queries: only allow known query hashes in public clients
- Rate limiting: apply per identity/API key
- Introspection policy: disable or restrict in production if required by security posture

These controls are often more important than schema syntax.

---

## 8. Where GraphQL Fits

GraphQL works best when:

- multiple clients need different slices of the same domain graph
- frontend iteration speed is high and over-fetching hurts latency
- you can invest in schema governance and resolver observability

REST may be simpler when endpoints are coarse-grained, cache-friendly, and stable.

Choose the transport that matches client needs and operational maturity.

---

**Previous:** [09-backend-concepts.md](./09-backend-concepts.md) - Backend Concepts  
**Next:** [11-observability-basics.md](./11-observability-basics.md) - Observability Basics
