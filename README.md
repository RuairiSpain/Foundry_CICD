# Foundry GitHub App — implementation blueprint

Status: **approved design baseline**<br>
Specification version: **1.0.0**<br>
Validated: **2026-11-21**

This repository package is the canonical implementation specification for an open-source, GitHub-native application that creates and manages new Microsoft Foundry projects and promotes code-based and hosted agents through Development, Test, and Production.

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
