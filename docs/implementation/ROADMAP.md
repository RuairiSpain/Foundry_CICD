# Vertical-slice implementation roadmap

Each phase produces a deployable increment. Unit, schema, contract, integration and security tests run throughout. The complete real-GitHub headless-browser suite is Phase 9 only.

## Phase 0 — contracts and repository foundation

Deliver PRD, ADRs, schemas, OpenAPI skeleton, monorepo layout, threat model, permission map, agent profiles, task schema, CI quality gates and dependency policy.

Exit: canonical documents accepted; local deterministic validation works; agent task routing can be simulated.

## Phase 1 / VS-01 — local happy path

Create TypeScript App gateway skeleton, Python FastAPI/worker skeleton, generated contract client, PostgreSQL migrations, event inbox/outbox, test fixtures, Bicep modules and dev container/tooling.

Demo: signed fixture webhook -> normalized event -> persisted operation -> mock GitHub check.<br>
Exit: >=95% unit line coverage; types/lint/contracts/migrations/security checks green.

## Phase 2 / VS-02 — install and new-project setup

Public/private App registration guide, installation callback, selected-repository scope, module/permission preview, Azure OIDC/RBAC validation, new-project wizard, setup plan and setup PR.

Demo: install in test org, choose a repository, configure a new project, receive a validated setup PR.<br>
Exit: real GitHub sandbox integration passes; rerun is idempotent; V1 existing-project import is rejected clearly.

## Phase 3 / VS-03 — PR golden path

Configuration schema, PR validation workflow, Check Runs, deduplicated findings/Issues, GitHub Projects automation, policy pack advisory/learning modes, developer explanations.

Demo: a config change generates checks and one tracked remediation item.<br>
Exit: webhook redelivery, rate-limit, missing-permission and stale-PR scenarios pass.

## Phase 4 / VS-04 — Dev deployment of one hosted/code-based agent

Bicep, GitHub OIDC, Foundry provider, `azd`/supported deployment adapter, release/provenance record, Dev deployment, smoke invocation and evaluation evidence.

Demo: merge creates release and deploys a new agent version to Dev.<br>
Exit: actual Azure/Foundry test subscription smoke passes; preview status disclosed and gated.

## Phase 5 / VS-05 — Test/Production promotion

Immutable promotion, GitHub Environments, configurable Test tier, hardened Production, evaluation thresholds, approved/expiring exceptions, serialized deployments, rollback.

Demo: same release digest moves Dev -> Test -> Production and rolls back.<br>
Exit: unauthorized promotion, concurrent deployment, failed evaluation, expired exception and rollback tests pass.

## Phase 6 / VS-06 — branch strategies

Generate trunk or Gitflow workflows/rulesets; preflight/preview/apply/verify trunk-to-Gitflow migration state machine; prohibit reverse transition.

Demo: project migrates one way with complete audit.<br>
Exit: transition and partial-failure tests pass; no reverse endpoint/UI action exists.

## Phase 7 / VS-07 — modular governance

Enforced policy packs, compatibility matrix, change-impact preview, secrets/permission assistant, cost module, drift scans and remediation PRs.

Demo: enable modules with explicit dependency/permission plan; detect and remediate drift.<br>
Exit: no silent module activation; pack/version and tenant isolation tests pass.

## Phase 8 / VS-08 — enterprise and installation hardening

Progressive rollout/rollback planner, audit export, generated docs/runbooks, multi-project internal model, central/customer-hosted Bicep variants, upgrade/migration/backup/diagnostics, signed open-source release, operator documentation.

Demo: clean customer-hosted install and upgrade; central edition tenant isolation and recovery exercise.<br>
Exit: fresh install reproducible; backup restore and dead-letter replay tested; accessibility acceptance complete.

## Phase 9 — final E2E acceptance (last phase)

Run Playwright headless Chromium against a dedicated GitHub organization and disposable Azure test subscriptions. Combine browser actions with GitHub API state, workflow result, Azure resource, and Foundry deployment assertions.

Exit: all mandatory journeys in `E2E-SCENARIOS.md` pass for central and customer-hosted editions; evidence bundle published; no critical/open high defects.

## Parallel work rules

Only tasks with disjoint write scopes and stable contracts run in parallel. API producer and consumer may parallelize only after schema is merged. Security and testing review each vertical slice. E2E expert designs scenarios early but executes the full suite only in Phase 9.
