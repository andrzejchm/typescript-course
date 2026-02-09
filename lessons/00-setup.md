# 00 — Environment Setup

Get your TypeScript dev environment running. ~15 minutes.

## 1. Install Node.js

**Option A — nvm (recommended):**

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
nvm install 20
nvm use 20
```

**Option B — Direct download:**

Go to [nodejs.org](https://nodejs.org/) and grab the LTS version (20+).

**Verify it works:**

```bash
node -v   # should print v20.x.x or higher
npm -v    # should print 10.x.x or higher
```

## 2. Project Setup

```bash
git clone <this-repo>
cd typescript-course
npm install
```

## 3. VS Code Extensions

Install these for a smooth experience:

| Extension | Why |
|-----------|-----|
| **ESLint** | Linting (like `dart analyze`) |
| **Prettier** | Auto-formatting (like `dart format`) |
| **Pretty TypeScript Errors** | Makes TS errors human-readable |
| **Error Lens** | Shows errors inline, right next to your code |

## 4. Running Code

Three ways to run TypeScript in this project:

```bash
# Watch mode — auto-reruns on save (your playground)
npm run dev

# Run once
npm run run

# Run a specific exercise file
npx tsx exercises/01-types.ts
```

## 5. Key Concepts — What Are These Files?

### `tsx` — The Runner

Like `dart run` but for TypeScript. It runs `.ts` files directly without a separate compile step. Under the hood it transpiles on the fly.

```bash
# Dart equivalent
dart run lib/main.dart

# TypeScript equivalent
npx tsx src/playground.ts
```

### `tsconfig.json` — Compiler Settings

Like `analysis_options.yaml` in Dart. Controls how strict the type checker is, what JS version to target, and where to find source files.

```jsonc
// Key settings in this project:
{
  "strict": true,              // enable all strict checks (like Dart's sound null safety)
  "noUncheckedIndexedAccess": true  // array/map access returns T | undefined
}
```

### `package.json` — Dependencies & Scripts

Like `pubspec.yaml`. Defines your project name, dependencies, and runnable scripts.

```jsonc
{
  "scripts": {       // like custom commands in Makefile
    "dev": "tsx watch src/playground.ts",
    "test": "vitest run"
  },
  "dependencies": {},     // like pubspec dependencies
  "devDependencies": {}   // like pubspec dev_dependencies
}
```

## 6. Flutter ↔ TypeScript Tooling Cheat Sheet

| Flutter / Dart | TypeScript / Node | Purpose |
|----------------|-------------------|---------|
| `dart run` | `npx tsx file.ts` | Run a file |
| `dart pub get` | `npm install` | Install dependencies |
| `pubspec.yaml` | `package.json` | Project config & deps |
| `analysis_options.yaml` | `tsconfig.json` | Linter / compiler settings |
| `dart test` | `npm test` (vitest) | Run tests |
| `dart pub add pkg` | `npm install pkg` | Add a dependency |

## Next Up

You're ready. Open `src/playground.ts`, type some code, and run `npm run dev` to see it execute.

Head to [01-dart-to-ts.md](./01-dart-to-ts.md) to start learning the syntax.
