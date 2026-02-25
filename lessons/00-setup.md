# 00 - Setup for Production TypeScript

Before learning syntax, set up a feedback loop you can trust every day.

## 1) Beginner foundation

### Install and verify

```bash
node -v
npm -v
```

Use a current Node LTS (20+ is fine for this course).

```bash
git clone <this-repo>
cd typescript-course
npm install
```

### Understand the two core config files

- `package.json`: project metadata + scripts + dependencies. Think of it as `pubspec.yaml` plus runnable commands.
- `tsconfig.json`: TypeScript compiler rules. Think of it as `analysis_options.yaml` plus compiler output settings.

Typical strict baseline:

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

- `strict`: catches nullability and unsafe assumptions early.
- `noUncheckedIndexedAccess`: forces handling missing keys/indexes (`value | undefined`).

### Daily loop you will run repeatedly

```bash
npm run dev
npm run run
npm test
npm run typecheck
```

What each command tells you:

- `npm run dev`: fast local iteration; good for trying small changes quickly.
- `npm run run`: one clean execution of your program entrypoint.
- `npm test`: behavior checks; "does the code do what we expect?"
- `npm run typecheck`: compile-time safety checks; "are types and contracts consistent?"

Many teams also add:

```jsonc
{
  "scripts": {
    "verify": "npm run typecheck && npm test"
  }
}
```

`npm run verify` is the pre-commit confidence check.

## 2) Flutter mapping

| Dart / Flutter | TypeScript / Node |
|---|---|
| `dart run` | `npm run run` or `npx tsx file.ts` |
| `dart test` | `npm test` |
| `dart analyze` | `npm run typecheck` (`tsc --noEmit`) |
| `pubspec.yaml` | `package.json` |
| `analysis_options.yaml` | `tsconfig.json` |

Mental shift: in TS projects, scripts in `package.json` become your team workflow API.

## 3) Production patterns

- Keep a small standard command set: `dev`, `run`, `test`, `typecheck`, `verify`.
- Keep `strict` enabled from day 1; fixing types later is expensive.
- Make local checks cheap and routine; CI should confirm, not surprise.
- Treat editor diagnostics like failing tests: resolve them instead of ignoring.

## 4) Pitfalls

- Turning off strict flags to "unblock" temporary errors.
- Only running the app manually and skipping tests/typecheck.
- Adding dependencies without adding a script or usage path.
- Using `any` in setup code and spreading unsafety into later lessons.

## 5) Practice tasks

1. Run `npm run dev`, edit `src/playground.ts`, and confirm quick feedback.
2. Run `npm run run` and compare its output with the dev loop behavior.
3. Run `npm test` and read one failing assertion message end-to-end.
4. Run `npm run typecheck`, then introduce and fix one intentional type error.
5. Create your pre-commit habit: `npm run verify`.

---

**Next:** [01-dart-to-ts.md](./01-dart-to-ts.md) - Dart to TypeScript
