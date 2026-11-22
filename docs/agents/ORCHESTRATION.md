# Agent orchestration protocol

## Routing

| Work signal | Primary | Required reviewers/consults |
|---|---|---|
| cross-component contract/ADR | solution-architect | security, testing, affected SDK experts |
| Foundry API/SDK/deployment | foundry-sdk-expert | testing; security if identity/permissions |
| GitHub API/auth/rate limits | github-sdk-expert | github-app-logic, security |
| App webhooks/installations/domain edge | github-app-logic | github-sdk, security, testing |
| Actions/environments/projects/rulesets/CI | github-automation | yaml-config, security, testing |
| Python/FastAPI/domain worker | python-code | testing; architect if contract changes |
| YAML/JSON Schema/Bicep | yaml-config | security and provider expert as relevant |
| test design/coverage | testing-expert | owning implementer |
| threat/identity/permission | security-expert | relevant SDK/automation expert |
| UI/wizard/accessibility | ui-ux-expert | github-app-logic, testing |
| docs/install/runbook | documentation-expert | command owner + testing |
| final browser acceptance | e2e-validation | all owners for failures; Phase 9 only |

## Orchestrator algorithm

1. Read Issue and validate `schemas/task.schema.json`.
2. Resolve story, phase, dependencies, accepted ADRs and write scope.
3. Reject/split a task with multiple independent objectives or conflicting file ownership.
4. Select one primary agent and bounded reviewers from the table.
5. Provide only relevant documents/interfaces/files; include exact acceptance and commands.
6. Run independent tasks in parallel only when write scopes are disjoint.
7. Require handoff format from `TASK-CONTRACT.md`.
8. Route deterministic failures to original owner; route contract conflict to architect; permission/security risk to security.
9. Stop after two repair attempts and create/update a blocked Issue.
10. Merge only through repository rules after all evidence is present; close only after acceptance verification.

## Context budget

Do not send every document to every specialist. Always include task contract, applicable ADR/contract, touched source, failing evidence and relevant path instructions. Summaries never override canonical files. Large research/logging work belongs in isolated subagents and returns a compact evidence summary.

## Authority

Orchestrator coordinates but does not invent product requirements, alter acceptance, weaken gates, grant permissions or modify architecture without an ADR. Specialists own implementation evidence, not overall status. Only the orchestrator marks a task complete after checking acceptance.
