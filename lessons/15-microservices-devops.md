# 15 - Microservices and DevOps for TypeScript Production Systems

This lesson focuses on operating real services: architecture decisions, delivery safety, runtime operations, and cost control.

---

## 1) Decision model: modular monolith vs microservices

Default to a modular monolith until clear pressure exists.

### Start with modular monolith when

- one team owns most backend domains
- release cadence can be shared
- data model is still changing quickly
- platform operations capacity is limited

### Split into microservices when

- domains have stable boundaries and separate ownership
- teams need independent deploy/release windows
- scaling profile differs by domain (for example, search vs checkout)
- blast-radius isolation is worth added complexity

### Scorecard

Give each item a 0-2 score. `>= 8` usually justifies service split.

1. bounded contexts are clear
2. teams require independent deployments
3. one domain has distinct scaling needs
4. observability and on-call are mature
5. CI/CD and security controls are standardized

If score is low, improve monolith boundaries first.

---

## 2) Reference runtime architecture

```text
Clients -> Edge (Gateway/BFF)
          -> Domain services (auth, orders, billing, catalog)
          -> Async workers (emails, reconciliations, exports)

Shared platform components:
- queue/broker
- cache (Redis)
- object storage
- metrics/log/trace pipeline
- secrets manager
```

Guidelines:

- service boundaries align with business capabilities
- each service owns its data schema and migrations
- synchronous calls for user-critical paths; async messaging for side effects

Flutter analogy: Gateway/BFF is like shaping backend responses to match UI screen needs instead of exposing raw domain internals.

---

## 3) Deployment and runtime strategies

Choose the simplest strategy that meets risk and traffic requirements.

### Deployment strategies

- `rolling`: default for low-risk changes
- `blue-green`: safer cutover for high-risk releases
- `canary`: gradual traffic shift with SLO guardrails

### Runtime platform choices

| Platform | Good fit | Tradeoff |
|---|---|---|
| Kubernetes | many services/teams, advanced routing | highest ops complexity |
| ECS/Fargate | AWS teams wanting managed containers | platform-specific constraints |
| Serverless | bursty/event workloads, small teams | cold starts and runtime limits |

### Safe rollout rules

- ship backward-compatible DB changes first
- then deploy code that uses the new schema
- gate progressive rollout on error-rate and latency SLOs
- auto-stop rollout on SLO burn

---

## 4) CI/CD pipeline for production safety

Minimum pipeline stages:

1. format/lint/type-check
2. unit + integration tests
3. build immutable artifact/container image
4. dependency and image vulnerability scan
5. deploy to staging
6. smoke + contract tests
7. progressive production deployment
8. post-deploy verification (SLIs + key journeys)

Policy gates:

- block deploy if critical vulnerabilities are open
- block deploy if migration is not backward-compatible
- block deploy if error budget is already exhausted

Example release metadata to attach to each deploy:

- commit SHA
- changelog summary
- schema migration version
- feature-flag toggles
- rollback command/runbook link

---

## 5) Security and secrets management

Security controls should be built into delivery, not added later.

Required controls:

- TLS for all external and internal traffic
- strong service-to-service authentication (JWT/mTLS/identity-based auth)
- least-privilege IAM per service
- webhook signature verification + replay protection
- audit logging for admin and auth actions

Secrets practices:

- secrets in dedicated manager (not git, not plain env files in repos)
- short-lived credentials where possible
- automated rotation with monitoring
- access scoped to service identity and environment

Never put secrets in application logs, traces, or error payloads.

---

## 6) Rollback and failure handling

Rollback is a first-class production path.

Rollback playbook:

1. detect SLO regression during rollout
2. stop traffic progression
3. rollback to last known good artifact
4. verify recovery via dashboards and synthetic checks
5. capture timeline and follow-up actions

DB migration safety:

- prefer expand/contract migrations
- keep old and new code paths compatible during transition
- avoid destructive schema changes in same release as app changes

Runtime resilience baseline:

- timeouts on all outbound calls
- retries with exponential backoff + jitter for transient failures
- circuit breaker on unstable dependencies
- DLQ for retry-exhausted async jobs
- graceful shutdown for deploy/scale events

---

## 7) Cost controls for microservice environments

Service growth without cost discipline becomes an outage risk.

Cost levers:

- right-size CPU/memory requests and limits
- autoscale by latency/queue depth, not CPU alone
- reduce cross-service chatty calls (aggregate or cache)
- enforce data-retention tiers for logs and traces
- use queue buffering to smooth spikes instead of overprovisioning

FinOps checks per service:

- cost per request/job
- top expensive dependencies
- idle resource percentage
- logging volume and high-cardinality metric waste

Tie cost changes to release metadata so regressions are traceable.

---

## 8) Production checklists

### Service readiness checklist

- health endpoints (`/livez`, `/readyz`) implemented
- structured logs with correlation IDs
- metrics for latency/traffic/errors/saturation
- distributed tracing enabled for critical paths
- SLOs and alert policies documented
- runbooks for incident, rollback, and dependency outage
- secrets loaded only from secure secret store
- idempotency strategy for external side effects

### Delivery readiness checklist

- CI checks required and green
- vulnerability scans pass policy
- staged rollout configured with auto-abort
- rollback command tested recently
- migration reviewed for backward compatibility
- ownership and on-call escalation path confirmed

---

## 9) Anti-patterns to avoid

- splitting into many services without ownership model
- sharing one database schema across "independent" services
- synchronous service call chains in hot request paths
- no idempotency keys for payment/webhook-style side effects
- shipping canary without SLO guardrails
- treating rollback as manual improvisation

---

## 10) Flutter/Dart mental mapping

| Backend ops concept | Flutter/Dart analogy |
|---|---|
| bounded context service | feature module ownership |
| gateway/BFF shaping responses | repository adapting data for screen flows |
| staged canary release | gradual feature rollout cohorts |
| idempotency key for side effects | duplicate-tap protection semantics |

Useful for communication across teams, but production architecture should always be justified by backend reliability and operational constraints.

---

**Previous:** [14-workflow-orchestration.md](./14-workflow-orchestration.md) - Workflow Orchestration  
**Next:** [10-essential-libraries.md](./10-essential-libraries.md) - Essential Libraries
