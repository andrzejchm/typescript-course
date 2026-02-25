# 00 - Setup for Production TypeScript

Get to a repeatable local workflow before writing features. This is the baseline used by healthy TS teams.

## Why this matters in production

- Most outages come from weak feedback loops, not weak syntax knowledge.
- Strict compiler settings catch bugs before runtime.
- A predictable run/test/check loop makes refactors safer and faster.

## Core concepts with code

### 1) Install and verify toolchain

```bash
# Use current LTS (20+ is fine for this course)
node -v
npm -v
```

```bash
git clone <this-repo>
cd typescript-course
npm install
```

### 2) Use a strict compiler baseline

`tsconfig.json` should stay strict:

```jsonc
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "target": "ES2022",
    "module": "ESNext"
  }
}
```

Why this is useful:
- `strict`: catches nullability and unsafe assumptions.
- `noUncheckedIndexedAccess`: forces you to handle missing array/object entries.

### 3) Run loop you will use every day

```bash
# Fast iteration
npm run dev

# One-off run
npm run run

# Tests
npm test

# Test watch mode
npm run test:watch
```

### 4) Optional single-command quality gate

Many teams add a single check script (similar to `dart analyze` + `dart test`):

```jsonc
{
  "scripts": {
    "typecheck": "tsc --noEmit",
    "verify": "npm run typecheck && npm test"
  }
}
```

Run `npm run verify` before every commit.

### 5) Flutter/Dart mapping (tooling)

| Dart / Flutter | TypeScript / Node |
|---|---|
| `dart run` | `npm run run` or `npx tsx file.ts` |
| `dart test` | `npm test` |
| `dart analyze` | `tsc --noEmit` (+ optional ESLint) |
| `pubspec.yaml` | `package.json` |
| `analysis_options.yaml` | `tsconfig.json` |

## Best practices

- Keep `strict` enabled; do not lower type safety to make errors go away.
- Prefer small scripts that everyone can run (`dev`, `test`, `typecheck`, `verify`).
- Run tests locally before pushing.
- Treat editor diagnostics as first-class signals, not noise.

## Common anti-patterns / pitfalls

- Turning off strict flags to "move faster".
- Depending only on manual app runs with no tests.
- Skipping local checks and relying only on CI.
- Using `any` to silence compiler errors in setup code.

## Short practice tasks

1. Run `npm run dev` and confirm edits in `src/playground.ts` execute immediately.
2. Run `npm test` and inspect at least one test failure message.
3. Add a temporary out-of-bounds array read in `src/playground.ts` and observe `noUncheckedIndexedAccess` behavior.
4. Create a personal pre-commit habit: `npm run verify` (or equivalent) before every commit.

Next: [01-dart-to-ts.md](./01-dart-to-ts.md)
