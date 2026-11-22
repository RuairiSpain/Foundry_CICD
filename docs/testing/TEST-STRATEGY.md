# Test strategy

## Quality gates

- Aggregate first-party business-logic unit-test **line coverage >=95%** for Python and TypeScript separately.
- Changed-code coverage >=95%; critical authorization, tenant isolation, signature, policy exception and promotion state machines have 100% named scenario coverage and branch targets defined by maintainers.
- Generated code, migrations' generated boilerplate and trivial framework bootstrap may be excluded only in checked-in coverage config with rationale.
- Coverage is necessary, not sufficient: assertions, negative tests, property tests and selected mutation tests are required.

## Layers

| Layer | Runs | Scope |
|---|---|---|
| Static/schema | every change | formatting, lint, strict types, OpenAPI/JSON Schema, Bicep build/lint, YAML validation |
| Unit | every PR | pure domain logic, state machines, policy, serialization, adapters with fakes |
| Contract | every relevant PR | GitHub/Azure/Foundry recorded contracts, generated clients, provider normalization |
| Component | every relevant PR | API+DB, gateway+fake GitHub, worker+queue/provider fakes |
| Integration | merge/nightly or labelled PR | GitHub sandbox, Azure test RG, Foundry test project, OIDC |
| Security | PR/nightly | signature, authz, tenant isolation, injection, secret redaction, dependency/IaC scans |
| Deployment smoke | before promotion | health, identity, one safe operation, agent invocation/evaluation |
| Full E2E | Phase 9 only | real user journeys in headless browser plus API/resource assertions |

## Test design

- Use builders with explicit tenant/project; no implicit global tenant.
- Fake clocks and deterministic UUID/random sources.
- Property-test idempotency, state transitions, configuration merges, finding fingerprints and policy exception boundaries.
- Consumer-driven or snapshot contracts may detect provider drift; sanitize recordings and review before commit.
- Test GitHub webhook duplicate, reordering and redelivery.
- Test retry/rate limit with `Retry-After`, secondary-rate-limit behavior and max-age expiry.
- Test partial Azure deployment, Foundry timeout, stale token, suspended installation, revoked permission and expired exception.
- Assert logs/traces/audit never contain seeded canary secrets or prompt payloads.

## Test pyramid and environment

PRs use fakes/containers for speed. A dedicated GitHub organization and Azure subscriptions/resource groups host integration tests with strict budgets and scheduled cleanup. Production-like networking runs nightly/pre-release. Test data is synthetic.

## Mutation testing

Run mutation testing on webhook verification, tenant predicates, authorization, branch migration, policy mode/severity, promotion eligibility and exception expiry. Establish a baseline in Phase 1 and ratchet; surviving security-relevant mutations block release.

## Flake policy

No blind retry to hide flakes. Quarantine requires Issue, owner, expiry and proof it is non-product. Mandatory E2E journeys cannot be released while quarantined.

## Evidence

Each PR publishes test summary, coverage XML/HTML, contract diff, security scan summary and relevant integration evidence. Phase 9 publishes traces/screenshots/video only on failure by default, workflow/API/resource assertions, and an overall signed acceptance report.
