# 09 — GraphQL Basics

GraphQL is a query language for APIs. With REST, you hit multiple endpoints (`/users`, `/posts`, `/users/123/posts`) and the server decides what data to return. With GraphQL, there's a single endpoint (`/graphql`) and the **client** asks for exactly the fields it needs — nothing more, nothing less. Think of it like writing a typed query that looks like the shape of the response you want. If you've used Dart's `json_serializable` to define model classes, GraphQL's type system will feel familiar — except it lives on the API layer and both client and server share it.

---

## 1. Core Concepts

| Concept | What It Is | Dart/REST Analogy |
|---------|-----------|-------------------|
| **Schema** | Defines all available data and operations | API contract (like OpenAPI/Swagger, but required) |
| **Types** | Shape of your data | Dart classes / TS interfaces |
| **Queries** | Read data | GET requests |
| **Mutations** | Write/modify data | POST / PUT / DELETE requests |
| **Resolvers** | Functions that fetch/compute the data | Route handlers in Express |
| **Subscriptions** | Real-time updates via WebSocket | Dart `Stream`s — won't deep dive here |

---

## 2. Schema Definition Language (SDL)

The schema is the heart of GraphQL. It defines **what data exists** and **what operations are available**.

```graphql
# Define types (like TypeScript interfaces or Dart classes)
type User {
  id: ID!           # ! means non-null (like Dart's non-nullable types)
  name: String!
  email: String!
  age: Int          # nullable (like Dart's int?)
  posts: [Post!]!   # non-null array of non-null Posts
}

type Post {
  id: ID!
  title: String!
  content: String!
  author: User!
  createdAt: String!
}

# Define what you can query (read)
type Query {
  users: [User!]!
  user(id: ID!): User        # nullable — might not find the user
  posts: [Post!]!
  post(id: ID!): Post
}

# Define what you can mutate (write)
type Mutation {
  createUser(name: String!, email: String!): User!
  updateUser(id: ID!, name: String, email: String): User
  deleteUser(id: ID!): Boolean!
  createPost(title: String!, content: String!, authorId: ID!): Post!
}
```

### SDL ↔ TypeScript ↔ Dart

```
// GraphQL SDL                  // TypeScript                    // Dart
type User {                     interface User {                 class User {
  id: ID!                         id: string;                      final String id;
  name: String!                   name: string;                    final String name;
  email: String!                  email: string;                   final String email;
  age: Int                        age?: number;                    final int? age;
  posts: [Post!]!                 posts: Post[];                   final List<Post> posts;
}                               }                                }
```

> **Key:** `!` in GraphQL = non-nullable (the default in Dart). No `!` = nullable (like `?` in Dart/TS).

---

## 3. Writing Queries (Client Side)

Queries are how the client asks for data. You specify exactly which fields you want.

```graphql
# Simple query — get all users, but only their id, name, and email
query {
  users {
    id
    name
    email
  }
}
```

Response:

```json
{
  "data": {
    "users": [
      { "id": "1", "name": "Alice", "email": "alice@example.com" },
      { "id": "2", "name": "Bob", "email": "bob@example.com" }
    ]
  }
}
```

Notice: no `age`, no `posts` — you only get what you ask for. **No over-fetching.**

### Query with Arguments

```graphql
query {
  user(id: "1") {
    name
    email
    posts {
      title
    }
  }
}
```

One request, nested data. **No under-fetching** — no need for separate `/users/1` then `/users/1/posts`.

### Query with Variables (the proper way)

```graphql
query GetUser($id: ID!) {
  user(id: $id) {
    name
    email
    posts {
      title
      createdAt
    }
  }
}
```

Variables (sent as JSON alongside the query):

```json
{ "id": "1" }
```

> **Why variables?** They keep queries reusable and prevent injection attacks. Always use them in real code.

---

## 4. Writing Mutations

Mutations modify data. Same syntax as queries, but they start with `mutation`.

```graphql
mutation CreateUser($name: String!, $email: String!) {
  createUser(name: $name, email: $email) {
    id
    name
    email
  }
}
# Variables: { "name": "Alice", "email": "alice@example.com" }
```

The fields after `createUser { ... }` are what you want **returned** after the mutation. This is powerful — create a user and get back exactly the fields you need in one round trip.

```graphql
mutation UpdateUser($id: ID!, $name: String) {
  updateUser(id: $id, name: $name) {
    id
    name
  }
}
# Variables: { "id": "1", "name": "Alice Updated" }
```

---

## 5. Resolvers (Server Side)

Resolvers are the functions that actually fetch or compute data. **This is what you'd write in an interview.**

Every field in your schema can have a resolver. In practice, you only write resolvers for root queries/mutations and fields that need custom logic (like relationships).

```typescript
// Types for our in-memory data
interface User {
  id: string;
  name: string;
  email: string;
}

interface Post {
  id: string;
  title: string;
  content: string;
  authorId: string; // FK — not exposed directly in schema
  createdAt: string;
}

// In-memory data
const users: User[] = [
  { id: "1", name: "Alice", email: "alice@example.com" },
  { id: "2", name: "Bob", email: "bob@example.com" },
];

const posts: Post[] = [
  { id: "1", title: "GraphQL 101", content: "...", authorId: "1", createdAt: "2024-01-01" },
  { id: "2", title: "TypeScript Tips", content: "...", authorId: "1", createdAt: "2024-01-02" },
];

// Resolvers map schema fields to functions
const resolvers = {
  Query: {
    users: () => users,
    user: (_: unknown, { id }: { id: string }) => users.find((u) => u.id === id),
    posts: () => posts,
    post: (_: unknown, { id }: { id: string }) => posts.find((p) => p.id === id),
  },

  Mutation: {
    createUser: (_: unknown, { name, email }: { name: string; email: string }) => {
      const user: User = { id: crypto.randomUUID(), name, email };
      users.push(user);
      return user;
    },
    deleteUser: (_: unknown, { id }: { id: string }) => {
      const index = users.findIndex((u) => u.id === id);
      if (index === -1) return false;
      users.splice(index, 1);
      return true;
    },
  },

  // Field resolvers — resolve nested relationships
  User: {
    posts: (parent: User) => posts.filter((p) => p.authorId === parent.id),
  },
  Post: {
    author: (parent: Post) => users.find((u) => u.id === parent.authorId),
  },
};
```

### Resolver Signature: `(parent, args, context, info)`

| Param | What It Is | Example |
|-------|-----------|---------|
| `parent` | The parent object (for nested resolvers) | In `User.posts`, `parent` is the `User` |
| `args` | Arguments passed to the field | `{ id: "123" }` for `user(id: "123")` |
| `context` | Shared across all resolvers per request | DB connection, auth info, DataLoader |
| `info` | Query AST metadata | Rarely used — ignore for interviews |

> **Dart comparison:** Resolvers are like repository methods. `Query.users` is like `UserRepository.getAll()`. `User.posts` is like a lazy-loaded relationship.

---

## 6. Full Working Example

A complete GraphQL server using `graphql-yoga` (simplest setup — no boilerplate):

```typescript
import { createServer } from "node:http";
import { createSchema, createYoga } from "graphql-yoga";

// In-memory data
interface User { id: string; name: string; email: string }
interface Post { id: string; title: string; content: string; authorId: string }

const users: User[] = [
  { id: "1", name: "Alice", email: "alice@example.com" },
];
const posts: Post[] = [
  { id: "1", title: "Hello GraphQL", content: "...", authorId: "1" },
];

const yoga = createYoga({
  schema: createSchema({
    typeDefs: /* GraphQL */ `
      type User {
        id: ID!
        name: String!
        email: String!
        posts: [Post!]!
      }
      type Post {
        id: ID!
        title: String!
        content: String!
        author: User!
      }
      type Query {
        users: [User!]!
        user(id: ID!): User
      }
      type Mutation {
        createUser(name: String!, email: String!): User!
      }
    `,
    resolvers: {
      Query: {
        users: () => users,
        user: (_: unknown, { id }: { id: string }) => users.find((u) => u.id === id),
      },
      Mutation: {
        createUser: (_: unknown, { name, email }: { name: string; email: string }) => {
          const user: User = { id: String(users.length + 1), name, email };
          users.push(user);
          return user;
        },
      },
      User: {
        posts: (parent: User) => posts.filter((p) => p.authorId === parent.id),
      },
      Post: {
        author: (parent: Post) => users.find((u) => u.id === parent.authorId)!,
      },
    },
  }),
});

const server = createServer(yoga);
server.listen(4000, () => {
  console.log("GraphQL server running on http://localhost:4000/graphql");
});
```

Run it:

```bash
npm install graphql-yoga graphql
npx tsx server.ts
```

Open `http://localhost:4000/graphql` in your browser — you get **GraphiQL**, a built-in playground where you can write and test queries interactively. Try pasting:

```graphql
query {
  users {
    name
    posts {
      title
    }
  }
}
```

---

## 7. GraphQL vs REST Cheat Sheet

| Concept | REST | GraphQL |
|---------|------|---------|
| Endpoint | Multiple (`/users`, `/posts`) | Single (`/graphql`) |
| Data fetching | Server decides what to return | Client decides what to return |
| Over-fetching | Common | Impossible — you pick the fields |
| Under-fetching | Common (need multiple requests) | Impossible — nest what you need |
| Typing | Optional (OpenAPI/Swagger) | Built-in (schema is the contract) |
| Real-time | WebSockets / SSE | Subscriptions |
| Caching | HTTP caching (easy, built-in) | More complex (no URL-based caching) |
| File upload | Native multipart | Needs extra setup |
| Learning curve | Low | Medium |

---

## 8. Interview Tips

- **Ask "REST or GraphQL?"** when told to build an API — shows you know both and think about trade-offs.
- **Resolvers are just functions that return data.** Don't overthink them. If you can write an Express route handler, you can write a resolver.
- **The schema IS the documentation.** Mention this as a key benefit — clients can introspect the schema to discover the API.
- **N+1 problem:** If `users` returns 100 users and each triggers a `User.posts` resolver, that's 1 + 100 queries. Solution: **DataLoader** batches those into a single query. You don't need to implement it — just know the concept and mention it.
- **GraphQL + TypeScript = great pair.** Both are about types. Tools like `graphql-codegen` auto-generate TS types from your schema, so your resolvers are fully type-safe.
- **Error handling:** GraphQL always returns HTTP 200. Errors go in the response body under `"errors"`. This is different from REST where you use status codes.

---

## 9. Dart/Flutter Comparison

| GraphQL Concept | Dart/Flutter Equivalent |
|----------------|------------------------|
| Schema types | Model classes (`@JsonSerializable`) |
| Resolvers | Repository methods |
| Query variables | Method parameters |
| `graphql-yoga` server | `shelf` + custom handler |
| GraphiQL playground | Postman / Insomnia |
| Apollo Client (React) | `graphql_flutter` package |
| Schema-first typing | `build_runner` + code generation |

GraphQL queries are like writing a "select" for your API — you describe the shape of data you want, and you get exactly that back.

---

**Previous:** [07-express-basics.md](./07-express-basics.md) — Express Basics
**Next:** [08-exercises.md](./08-exercises.md) — Practice Exercises
