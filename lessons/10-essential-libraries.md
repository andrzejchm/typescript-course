# 10 — Essential Libraries

This lesson covers the libraries you'll actually use in the interview and in real TS/Node projects. Organized by category, interview-critical stuff first.

---

## 1. Package Manager Quick Note

| Manager | Notes |
|---------|-------|
| **npm** | Default, comes with Node. Use this in the interview. |
| **pnpm** | Faster, saves disk space. Motion likely uses this or npm. |
| **yarn** | Alternative, less common now. |

For the interview: **just use `npm`**. Don't waste time configuring a package manager.

---

## 2. Frontend — React Essentials

### React (with Vite)

```bash
npm create vite@latest my-app -- --template react-ts
```

This gives you: React + TypeScript + Vite dev server + hot reload — all wired up and ready to go.

**Vite** is like Flutter's hot reload but for web. The dev server starts instantly regardless of project size, and changes appear in the browser in milliseconds.

### Key React Concepts (60-second crash course)

```tsx
// Component = a function that returns JSX (like a Widget's build method)
function UserCard({ name, email }: { name: string; email: string }) {
  return (
    <div className="card">
      <h2>{name}</h2>
      <p>{email}</p>
    </div>
  );
}

// useState = like ValueNotifier / setState
const [count, setCount] = useState(0);

// useEffect = like initState + didChangeDependencies
useEffect(() => {
  fetchData();
}, [dependency]); // runs when dependency changes

// Fetching data pattern
const [data, setData] = useState<User[]>([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  fetch("/api/users")
    .then(res => res.json())
    .then(data => setData(data))
    .finally(() => setLoading(false));
}, []);
```

### React ↔ Flutter Comparison

| React | Flutter | Notes |
|-------|---------|-------|
| Component (function) | Widget | Both return UI trees |
| JSX `<div>` | `Container()` / `Column()` | JSX is HTML-like, Flutter is constructor-based |
| `useState` | `setState` / `ValueNotifier` | Local state management |
| `useEffect` | `initState` + `didChangeDependencies` | Side effects on mount/change |
| `useContext` | `InheritedWidget` / `Provider` | Shared state down the tree |
| `useMemo` | `const` widgets / caching | Avoid recomputation |
| Props | Constructor parameters | Data flows parent → child |
| `children` prop | `child` / `children` parameter | Composition pattern |
| Conditional rendering `{show && <X/>}` | `if (show) X()` in build | Show/hide UI |
| `map()` in JSX | `ListView.builder` | Rendering lists |

### TailwindCSS

```bash
npm install -D tailwindcss @tailwindcss/vite
```

Utility-first CSS framework — you style with class names directly. No separate CSS files needed.

```tsx
// Instead of writing CSS files:
<div className="flex items-center gap-4 p-4 bg-white rounded-lg shadow">
  <h2 className="text-xl font-bold text-gray-900">{title}</h2>
  <p className="text-sm text-gray-500">{description}</p>
</div>
```

**Key classes to know**: `flex`, `grid`, `p-*`, `m-*`, `text-*`, `bg-*`, `rounded-*`, `shadow`, `border`, `w-full`, `h-screen`, `gap-*`, `items-center`, `justify-between`

Compare to Flutter: like using `Padding`, `Row`, `Column`, `Container` but as CSS class names. `flex items-center gap-4` ≈ `Row(children: [...])` with spacing.

### UI Component Libraries (pick ONE for the interview)

**shadcn/ui** — copy-paste components built on Radix. Best for interviews because components live in YOUR code, not hidden in `node_modules`. Pre-styled with Tailwind.

```bash
npx shadcn@latest init
npx shadcn@latest add button card input
```

Other options (just know they exist):
- **Radix UI** — unstyled, accessible primitives (Dialog, Dropdown, Tabs)
- **Headless UI** — similar to Radix, from the Tailwind team

**Recommendation for interview: shadcn/ui** — looks professional with zero effort.

---

## 3. Backend — Node.js Essentials

### Express (quick recap from lesson 07)

```typescript
import express from "express";
import cors from "cors";

const app = express();
app.use(cors());           // allow frontend to call backend
app.use(express.json());   // parse JSON bodies
```

### cors

```bash
npm install cors @types/cors
```

**Critical for full-stack**: without this, your React frontend can't call your Express backend. The browser blocks cross-origin requests by default.

In Flutter you never deal with this because mobile apps don't have CORS restrictions. Web apps do.

### dotenv

```bash
npm install dotenv
```

```typescript
import "dotenv/config";
// or
import dotenv from "dotenv";
dotenv.config();

const apiKey = process.env.OPENAI_API_KEY;
```

Loads a `.env` file into `process.env`. Like Flutter's `--dart-define` or the `flutter_dotenv` package.

### Zod (quick recap from lesson 06)

```typescript
import { z } from "zod";

const CreateTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
});

app.post("/api/tasks", (req, res) => {
  const result = CreateTaskSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error.issues });
  }
  // result.data is fully typed — { title: string; description?: string }
});
```

---

## 4. Database — PostgreSQL with Prisma

Prisma is the recommended ORM for the interview — fastest to set up, great DX, auto-generated types.

### Setup

```bash
npm install prisma @prisma/client
npx prisma init
```

### Schema (`prisma/schema.prisma`)

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model Task {
  id          String   @id @default(uuid())
  title       String
  description String?
  status      String   @default("pending")
  result      String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

### Migrations & Tools

```bash
npx prisma migrate dev --name init    # create tables from schema
npx prisma generate                    # generate typed client
npx prisma studio                      # visual DB browser (nice for demo!)
```

### CRUD Operations

```typescript
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// Create
const task = await prisma.task.create({
  data: { title: "Process data", description: "..." },
});

// Read all (with filter)
const tasks = await prisma.task.findMany({
  where: { status: "pending" },
  orderBy: { createdAt: "desc" },
});

// Read one
const task = await prisma.task.findUnique({ where: { id: "..." } });

// Update
const updated = await prisma.task.update({
  where: { id: "..." },
  data: { status: "completed", result: "..." },
});

// Delete
await prisma.task.delete({ where: { id: "..." } });
```

Compare to Dart: Prisma is like `drift` or `floor` but with a schema file instead of annotations. The query API is similar to Firestore's fluent API.

**Alternative**: Drizzle ORM is lighter and more SQL-like. Just know it exists — stick with Prisma for the interview.

---

## 5. LLM Integration — OpenAI SDK

```bash
npm install openai
```

### Basic Completion

```typescript
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const response = await openai.chat.completions.create({
  model: "gpt-4o-mini",  // cheap and fast, good for interview
  messages: [
    { role: "system", content: "You are a helpful assistant." },
    { role: "user", content: "Summarize this article: ..." },
  ],
});

const answer = response.choices[0].message.content;
```

### Streaming (for better UX — shows text appearing)

```typescript
const stream = await openai.chat.completions.create({
  model: "gpt-4o-mini",
  messages: [...],
  stream: true,
});

for await (const chunk of stream) {
  const content = chunk.choices[0]?.delta?.content || "";
  process.stdout.write(content);
}
```

### Structured Output (get JSON back)

```typescript
const response = await openai.chat.completions.create({
  model: "gpt-4o-mini",
  messages: [
    { role: "system", content: "Extract entities from text. Respond in JSON." },
    { role: "user", content: text },
  ],
  response_format: { type: "json_object" },
});

const data = JSON.parse(response.choices[0].message.content!);
```

### Using Other Providers

The interview says "OpenAI SDK compatible API" — this means you can use providers like Anthropic, Groq, Together AI, etc. that expose OpenAI-compatible endpoints. Just change the `baseURL`:

```typescript
const client = new OpenAI({
  apiKey: process.env.API_KEY,
  baseURL: "https://api.together.xyz/v1", // or any compatible provider
});
// Everything else stays the same — same .chat.completions.create() API
```

---

## 6. HTTP Client — fetch vs axios

### Built-in fetch (Node 18+, recommended)

```typescript
const response = await fetch("https://api.example.com/data", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ query: "..." }),
});
const data = await response.json();
```

Built into Node.js 18+ — no install needed. Like Dart's `http` package but built-in.

### axios (alternative, more features)

```bash
npm install axios
```

```typescript
import axios from "axios";
const { data } = await axios.get("https://api.example.com/data");
const { data: result } = await axios.post("/api/tasks", { title: "..." });
```

Auto JSON parsing, interceptors, better error handling. Like Dart's `dio` package.

**Recommendation**: use `fetch` for the interview (no install needed). Switch to axios if you need interceptors or retries.

---

## 7. Utility Libraries (nice to have)

### uuid

```bash
npm install uuid @types/uuid
```

```typescript
import { v4 as uuidv4 } from "uuid";
const id = uuidv4(); // "550e8400-e29b-41d4-a716-446655440000"
```

Note: `crypto.randomUUID()` is built into Node 19+ — you might not need this package.

### date-fns (or dayjs)

```bash
npm install date-fns
```

```typescript
import { format, formatDistanceToNow } from "date-fns";
format(new Date(), "yyyy-MM-dd"); // "2026-02-10"
formatDistanceToNow(createdAt);    // "5 minutes ago"
```

Like Dart's `intl` package for date formatting.

### lodash (use sparingly)

```bash
npm install lodash-es @types/lodash-es
```

```typescript
import { debounce, groupBy, uniqBy } from "lodash-es";
```

Most lodash functions can be replaced with native JS (`Array.map`, `Object.entries`, etc.). Only reach for it when you need something complex like `debounce` or `groupBy`.

---

## 8. Development Tools

### tsx (already set up in this course)

- `tsx` — run TypeScript directly, like `dart run`
- `tsx watch` — auto-restart on changes, like Flutter hot reload

### concurrently (run frontend + backend together)

```bash
npm install -D concurrently
```

```json
{
  "scripts": {
    "dev": "concurrently \"npm run dev:frontend\" \"npm run dev:backend\"",
    "dev:frontend": "cd frontend && npm run dev",
    "dev:backend": "tsx watch src/server.ts"
  }
}
```

Runs multiple processes in one terminal. Essential for full-stack dev where you need both the Vite dev server and the Express backend running simultaneously.

---

## 9. Interview-Specific Library Cheat Sheet

| Need | Library | Install | One-liner |
|------|---------|---------|-----------|
| React app | Vite | `npm create vite@latest` | Scaffold + dev server |
| Styling | TailwindCSS | `npm i -D tailwindcss` | Utility CSS classes |
| UI components | shadcn/ui | `npx shadcn@latest init` | Pre-built components |
| Backend | Express | `npm i express` | HTTP server |
| CORS | cors | `npm i cors` | Allow cross-origin |
| Env vars | dotenv | `npm i dotenv` | Load .env file |
| Validation | Zod | `npm i zod` | Runtime type checking |
| Database | Prisma | `npm i prisma @prisma/client` | ORM + migrations |
| LLM | OpenAI SDK | `npm i openai` | Chat completions |
| HTTP client | fetch | built-in | External API calls |

---

## 10. What NOT to Bother With (for this interview)

- **Next.js** — too much magic, Vite is simpler and faster to set up
- **tRPC** — cool but overkill for 90 minutes
- **GraphQL** — they said REST API, keep it simple
- **Docker** — no time, just run locally
- **Testing** — no time in 90 minutes, but mention you'd add tests
- **Auth** — unless specifically asked, skip it

---

[← 09 — GraphQL Basics](09-graphql-basics.md) · [08 — Exercises →](08-exercises.md)
