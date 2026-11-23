# Foundry GitHub App — implementation blueprint

Status: **approved design baseline**<br>
Specification version: **1.0.0**<br>
Validated: **2026-11-21**

This repository package is the canonical implementation specification for an open-source, GitHub-native application that creates and manages new Microsoft Foundry projects and promotes code-based and hosted agents through Development, Test, and Production.

## Implementation status

The project is at the foundation stage, not a deployable release platform.
A local-only webhook gateway validates signed push deliveries and stores their
metadata in a PostgreSQL inbox and transactional outbox. A local-only dispatcher
can send one normalized event to a Python worker, which records an accepted
demo operation and a queued **mock** check in PostgreSQL. These records do not
authorize a deployment or create a GitHub Check. Onboarding, authorization,
production operation processing, release management, deployment and promotion
are not implemented.

The Python control plane has an internal, immutable release-input manifest that
calculates a deterministic SHA-256 digest from project, repository, source,
artifact, configuration and dependency-lock digests. It is not a release ID:
workflow, agent version, SBOM, attestations and policy evidence are not included.
It is not a sealed release: inputs and provenance are not verified, persisted,
or authorized, and no deployment consumes it. The model can compare a seekable
artifact stream with its supplied digest; it does not prevent the artifact from
changing after that comparison.

The control plane can classify an already-triggered rule in advisory, learning
or enforced mode, rejecting attempts to downgrade baseline or Production
high/critical rules. It does not evaluate policy packs, validate exceptions,
inspect resources, or gate a deployment.

An internal permission comparison reports repository- and organization-scoped
expansions and reductions from supplied snapshots. It does not retrieve the
effective GitHub permissions, resolve module dependencies, or authorize changes;
an empty snapshot must not be used when the current permissions are unknown.

The gateway also contains App JWT signing, repository-scoped installation
token and read-only installation inspection primitives, plus a GitHub Checks
REST adapter and read-only GitHub Environment inspection. They are not wired
into the local worker or onboarding, and have not yet been validated against a
real GitHub App installation. Environment inspection does not verify branch
patterns, admin bypass, plan eligibility, or approval of a particular deployment
and cannot authorize promotion. Installation
inspection is a snapshot, not user authorization or repository selection
verification. Check creation does not retry automatically: an
ambiguous result requires reconciliation before another attempt. The adapter
can list matching checks, but an empty result does not prove a retry is safe
because GitHub's listing may be incomplete or change concurrently. It does not
enforce installation authorization.
The deployment workflow template intentionally fails before acquiring Azure
credentials until release and environment protections are implemented.

With Node.js 24 or newer, run:

```shell
npm ci --ignore-scripts
npm test
npm run typecheck
npm run validate -- project examples/project.yaml
npm run validate -- task examples/task.yaml
```

For integration tests, set `TEST_DATABASE_URL` to an isolated local PostgreSQL
database, install the Python dependencies below, then run `npm run test:integration`.
Use a URL without query parameters or fragments; tests reject non-loopback hosts
and connection-string overrides before connecting. The database must be disposable:
tests create and drop schemas in it.
Set `FOUNDRY_PYTHON` to the Python executable if it is not `python` on your PATH.
Tests create and remove their own
schemas. To run the local gateway, set `DATABASE_URL` to a local PostgreSQL
database and `WEBHOOK_SECRET` to a nonempty secret, run `npm run dev:migrate`,
then `npm run dev:gateway`. The gateway listens on loopback only; `PORT` defaults
to 3000. To process one accepted delivery for an installation, run
`npm run dev:dispatch -- <installation-id>`. This produces only a local mock
check and uses a local subprocess instead of a message broker. These development
tools reject remote database hosts.

`npm run test:coverage` runs the Node unit and integration suites together and
checks gateway line coverage, including otherwise unvisited gateway source files.
This combined figure is not a unit-only coverage measure.

For the Python control-plane unit tests, use Python 3.13 and install
`requirements.lock` with pip's `--require-hashes`, then set `PYTHONPATH` to
`services/control-plane/src` and run `python -m pytest tests/python`.
With `TEST_DATABASE_URL` set, run `python -m pytest tests/python tests/python_integration`
to include database integration tests.
With both Node and Python dependencies installed and `TEST_DATABASE_URL` set,
`npm run check` runs the Node coverage and type checks, example validation,
Python lint, formatting, type checks, OpenAPI snapshot check and Python coverage.
It stops at the first failure and chooses Python from `FOUNDRY_PYTHON`, the
project's `.venv`, or PATH, in that order. It does not create or destroy the
PostgreSQL database. The separate CI dependency audit is not run by this command.
The checked-in OpenAPI contract currently describes only health endpoints; after
changing those endpoints, regenerate it with `python scripts/export-openapi.py`.

### Developer quality feedback

The existing Foundation checks workflow runs automatically on pull requests and
pushes to `main`. It installs the hashed Python lock and npm lock, runs
`npm audit --audit-level=high`, Node combined unit/integration coverage and
type checks, example schema validation, Python lint, format and strict type
checks, the OpenAPI snapshot check, and Python unit/integration coverage.
Both coverage gates require 95% lines; the Node figure is combined coverage.
Open the failing PR check and its Actions run for the failing step and logs.
These are existing checks; this change adds no custom annotations or agents.

For local feedback, install the locked dependencies and use the isolated
PostgreSQL setup above. `npm run check` runs the full local quality sequence
but does not run the audit; run `npm audit --audit-level=high` separately.
Individual commands include:

```shell
npm test
npm run test:integration
npm run test:coverage
npm run typecheck
python -m ruff check services/control-plane/src scripts/export-openapi.py tests/python tests/python_integration
python -m ruff format --check services/control-plane/src scripts/export-openapi.py tests/python tests/python_integration
python -m mypy --strict services/control-plane/src scripts/export-openapi.py
python scripts/export-openapi.py --check
python -m pytest tests/python
python -m pytest tests/python tests/python_integration
```

Set `PYTHONPATH` and `TEST_DATABASE_URL` as described above; integration and
combined coverage commands require the disposable local database.

The new `.github/dependabot.yml` schedules weekly version-update PRs for the
root npm package and GitHub Actions workflows. Dependabot must be available
and permitted to create PRs in repository settings, and the configuration
must be on the default branch. Review each PR and its normal checks; action
updates must retain reviewed full-SHA pins. This does not enable auto-merge or
configure security/code scanning. Python updates are intentionally omitted:
`requirements.lock` is a hash-pinned uv export, and consistent regeneration
alongside `pyproject.toml` has not been verified for Dependabot pip updates.
Review and regenerate the Python lock separately until that is established.

Validation checks the JSON Schema only; it does not confirm permissions,
environment protection, Azure resources, module dependencies or deployment
readiness. Production configuration must use the hardened tier; per-rule
exceptions are not implemented. Deduplication uses the delivery ID; because GitHub signs the body
rather than delivery headers, this is not complete replay protection. Do not
expose the development gateway publicly or use it for production.

## Approved decisions

| Topic | Decision |
|---|---|
| Runtime | Python 3.13+, FastAPI, Pydantic v2; TypeScript for the GitHub App and UI |
| Hosting | Azure; both centrally hosted and customer-hosted distributions |
| GitHub distribution | Public and private GitHub Apps |
| Tenant/resource ownership | Customer-owned Azure resources and identities |
| V1 Foundry scope | New projects; code-based and hosted agents |
| V2 scope | Existing-project import and other Foundry components |
| Infrastructure | Bicep, with Azure Developer CLI integration where supported |
| Environments | Dev/Test/Production; separate subscriptions optional |
| Security | Flexible Dev, configurable Test, hardened Production with audited exceptions |
| User experience | GitHub UI first; small web UI only where GitHub cannot provide a good flow |
| Delivery | Open source, vertical slices |
| Coding agents | Fully autonomous within task contracts; may merge PRs after required checks and repository rules pass |
| Quality | 95% aggregate unit-test line coverage; stricter critical-path tests; full browser E2E in final phase |

## How to use this package

1. Read `docs/product/PRD.md` and `docs/product/USER-STORIES.md`.
2. Treat `docs/architecture/*` and accepted ADRs as binding contracts.
3. Implement in the order in `docs/implementation/ROADMAP.md`.
4. Create every coding task from `docs/implementation/TASK-CONTRACT.md`.
5. Use the specialist profiles in `.github/agents/` or `.claude/agents/`.
6. Enforce `docs/testing/TEST-STRATEGY.md` on every PR.
7. Do not run the complete browser acceptance suite until Phase 9.

## Canonical-document rule

Product and architecture documents under `docs/` are authoritative. `AGENTS.md`, `CLAUDE.md`, Copilot instructions, agent profiles, schemas, and examples may summarize but must not contradict them. Resolve ambiguity by opening an ADR; do not silently invent architecture.

## Package map

- `docs/product/` — scope, requirements, stories, acceptance criteria.
- `docs/architecture/` — topology, component contracts, data and APIs, ADRs.
- `docs/implementation/` — roadmap, task contracts, backlog, dependency policy.
- `docs/testing/` — coverage, test layers, final E2E journeys.
- `docs/security/` — threats, permissions, environment policy tiers.
- `docs/operations/` — installation, upgrades, and runbooks.
- `docs/agents/` — routing, authority, and capability matrix.
- `.github/` — GitHub Copilot/VS Code profiles, instructions, and prompts.
- `.claude/` and `CLAUDE.md` — Claude Code entry points and subagents.
- `schemas/` and `examples/` — machine-readable project and task contracts.

## Current platform constraints

Microsoft Foundry hosted-agent deployment and some related CI/CD capabilities are preview features and may lack an SLA. Isolate them behind adapters, maintain a compatibility matrix, and require a production risk acceptance until the dependency reaches a support level approved by the customer.

## Definition of done

A change is complete only when its acceptance criteria pass, public contracts are preserved or versioned, tests and coverage pass, security scans pass, documentation is updated, and the orchestrator records evidence. A green build alone is not completion.
