# Autonomous agent task contract

Every coding assignment is a YAML document validated by `schemas/task.schema.json` and attached to a GitHub Issue.

The task schema is version 2. Tasks written for version 1 must explicitly add
`forbiddenPaths` (an empty list if no additional paths are forbidden) and at
least one nonblank security consideration, replace blank scope/evidence entries,
and use recognized agent names for reviewers. The validator uses version 2;
schema validation alone does not enforce filesystem scope or execute checks.

## Required fields

- `id`, `story`, `objective`, `phase`, `primaryAgent`.
- `allowedPaths` and `forbiddenPaths`.
- `inputs`: exact specs, schemas, ADRs and dependent PR/commit.
- `acceptanceCriteria`: observable statements.
- `requiredChecks`: commands and expected gates.
- `security`: threat/permission/secret considerations.
- `completionEvidence`: tests, coverage, diff summary, contract impact.
- `maxRepairAttempts` (default 2).

## Execution protocol

1. Orchestrator validates dependencies, scope and architecture.
2. Primary agent restates objective, expected files and tests; it does not redesign the system.
3. Agent reads only relevant canonical documents and source paths.
4. Agent writes the smallest vertical change, adds tests first or concurrently, and runs focused checks.
5. Before PR, run formatting, lint, type, unit, contract/schema, relevant integration and security checks.
6. PR body links task/story, lists changed contracts, test evidence, coverage, security impact, unresolved risk and rollback.
7. Automated reviewers inspect architecture, security and tests as required by routing.
8. Agent repairs deterministic failures at most twice. It does not change assertions/thresholds to obtain green.
9. Required checks and repository rules pass; merge queue/automerge may merge.
10. Orchestrator verifies acceptance and closes or blocks the Issue.

## Scope change

If implementation requires an unlisted file, dependency, permission, public contract or ADR, stop and request a revised task contract. The orchestrator may split work. No specialist grants itself scope.

## Merge prohibition

Do not merge when any required check is missing/skipped, coverage is below threshold, a contract diff is unreviewed, an action is unpinned contrary to policy, a security high/critical is open, test evidence is fabricated/incomplete, or the branch is stale against protected target.

## Handoff format

```text
Task: <id>
Outcome: complete | blocked
Changed: <paths>
Contracts: none | list
Checks: <command=result; coverage>
Security: <impact/findings>
Evidence: <links/artifacts>
Unresolved: <specific blocker>
Next: <single recommended action>
```
