# Production Hardening Checklist

Use this checklist for any exercise before considering it production-ready.

## 1) Types and API Contracts

- [ ] Function/class/module public contracts are explicitly typed.
- [ ] No `any` in implementation paths (unless documented and justified).
- [ ] Complex unions are exhaustively handled (`never` checks where relevant).
- [ ] Types are reused instead of duplicated.

## 2) Input Validation and Data Boundaries

- [ ] All external inputs are validated (HTTP body/query/params, env, task payloads).
- [ ] Validation failures produce stable, actionable messages.
- [ ] Invalid state is rejected early with guard clauses.

## 3) Error Handling and Resilience

- [ ] Expected errors are modeled and returned consistently.
- [ ] Unexpected errors are logged and mapped to safe responses.
- [ ] No swallowed exceptions.
- [ ] Retries/timeouts/cancellation behavior is explicit where needed.

## 4) Tests and Confidence

- [ ] Happy-path tests exist.
- [ ] Edge cases and failure-path tests exist.
- [ ] Concurrency/timing behavior is tested where applicable.
- [ ] Tests are deterministic (fake timers/mocks for unstable dependencies).

## 5) Logging and Observability

- [ ] Logs are structured and include enough context to debug incidents.
- [ ] Error logs include operation name and relevant identifiers.
- [ ] Sensitive data is not logged.
- [ ] Optional metrics/traces are added for high-risk flows.

## 6) Verification Before Done

- [ ] Exercise runs locally via `npm run exercise exercises/<file>.ts`.
- [ ] API behavior verified manually for request/response contracts (if applicable).
- [ ] `npm run test` passes for added/updated tests.
- [ ] Solution is simple, readable, and aligned with existing repository patterns.
