# Implementation backlog

This is an ordered seed backlog. Create one Epic per phase and one Issue per item; do not combine items that cross component ownership without a stable contract.

## P0 foundation
- P0-01 monorepo/toolchain and lockfiles
- P0-02 OpenAPI/JSON Schema generation and breaking-change check
- P0-03 CI lint/type/test/coverage/security/SBOM skeleton
- P0-04 Bicep module structure and environment parameter validation
- P0-05 PostgreSQL migration and tenant partition conventions
- P0-06 webhook fixture corpus and provider fake servers
- P0-07 agent routing/task contract validation

## P1 platform
- P1-01 raw-body webhook signature validator
- P1-02 delivery inbox/deduplication
- P1-03 normalized GitHub event contract
- P1-04 operation state machine/outbox
- P1-05 GitHub Check adapter
- P1-06 FastAPI authorization/problem details
- P1-07 OpenTelemetry correlation/redaction

## P2 onboarding
- P2-01 App registration manifests/guides for public/private
- P2-02 installation/suspension/deletion lifecycle
- P2-03 permission-to-module planner
- P2-04 Azure OIDC/RBAC plan and diagnostic
- P2-05 new-project wizard/API
- P2-06 setup plan + setup PR
- P2-07 idempotent rerun/uninstall behavior

## P3–P8
Follow vertical slices in `ROADMAP.md`; each slice must include provider contract, negative tests, docs, observability, security review and upgrade impact as separate subtasks.
