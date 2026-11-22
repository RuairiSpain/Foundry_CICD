# User stories and acceptance criteria

IDs are stable. Implementation issues must reference at least one story and copy its applicable Given/When/Then criteria.

## Epic A — install and create

### US-A01 Install a public or private App
**As an organization owner, I want to install the App only on selected repositories so that access is minimized.**

- Given a registered public or private GitHub App, when I select repositories, then the installation is stored by GitHub installation ID and only selected repositories are usable.
- The permission page explains each requested permission and module dependency.
- A redelivery or duplicate installation webhook has no duplicate effect.

### US-A02 Connect customer-owned Azure
**As a platform engineer, I want GitHub Actions and the App to use federated/customer identities so that no long-lived Azure deployment secret is stored.**

- The wizard creates or validates the OIDC/federated setup and scoped RBAC plan.
- Credentials and role assignments are environment scoped where feasible.
- Validation reports missing roles without echoing tokens.

### US-A03 Create a new Foundry project
- Wizard collects project path, environments, region, agent type, modules, policy modes, branch strategy, and owners.
- Preview lists files, GitHub settings, permissions, and Azure resources.
- Confirm creates a setup PR; cancellation changes nothing.
- V1 rejects existing-project import with a clear V2 message.

## Epic B — develop and validate

### US-B01 Work through pull requests
- A PR changing agent/config/infra receives schema, lint, type, unit, contract, security, policy, compatibility, impact, and evaluation checks as applicable.
- A failure identifies rule/test, evidence, remediation, and whether it blocks merge.
- Re-run does not create duplicate Issues or comments.

### US-B02 Learn from best-practice packs
- `advisory` never blocks; `learning` reports what would block; `enforced` blocks at configured severity.
- Every finding links to versioned rule rationale and official guidance.
- Pack updates show additions, removals, and severity changes before acceptance.

### US-B03 Track remediation
- Blocking or configured findings create/update one Issue keyed by project + rule ID + resource.
- The Issue is added to the configured GitHub Project and closes automatically only after verified remediation.

## Epic C — deploy and promote

### US-C01 Deploy to Dev
- Merge/release creates immutable release identity and provenance.
- Deployment is serialized and idempotent.
- Smoke and configured evaluation gates record evidence.

### US-C02 Promote to Test/Production
- Promotion references the existing release; it does not rebuild source.
- Environment-specific values are applied without changing the release payload.
- Required environment rules, evaluation thresholds, and exceptions are enforced.
- Failure leaves the prior healthy version addressable for rollback.

### US-C03 Roll back
- Operator selects a known deployment/release and sees impact before execution.
- Rollback action is authorized, audited, idempotent, and post-validated.
- Mutable external dependencies are listed when exact state restoration is impossible.

## Epic D — branch strategy

### US-D01 Choose strategy
- New project supports `trunk` or `gitflow` and generates compatible rulesets/workflows.
- Both produce the same release and promotion contract.

### US-D02 Migrate trunk to Gitflow
- Preflight detects open/conflicting work, dirty release state, missing permission, and noncompliant branch names.
- Preview lists branch, workflow, ruleset, and documentation changes.
- Success changes lifecycle state to `gitflow`; reverse migration controls disappear and API returns conflict.
- Failure resumes safely or rolls back reversible steps and records manual recovery for irreversible steps.

## Epic E — layered security

### US-E01 Flexible Dev
- Dev may relax declared controls, but webhook verification, tenant isolation, secret protection, audit, and deployment authorization are never optional.

### US-E02 Configure Test
- Test can use advisory, preview, or enforced hardening.
- A preview lists delta from current configuration and Production baseline.

### US-E03 Production exception
- Exception has rule IDs, scope, justification, owner, approval evidence if configured, start/end, and compensating controls.
- Expiry automatically restores enforcement and opens an Issue before expiration.
- Exception history is immutable.

## Epic F — management and enterprise controls

### US-F01 Change-impact preview
- Before merge/promotion, show create/update/delete/unknown resources, permission deltas, policy deltas, compatibility risk, and cost direction.
- Uncertain estimates are labelled; no fabricated monetary precision.

### US-F02 Drift
- Scheduled/on-demand scan compares desired Git/repository config with GitHub, Azure, Foundry and deployed versions.
- Result distinguishes benign, actionable, dangerous, and unknown drift.
- Remediation is a PR by default; direct reconcile requires authorization and preview.

### US-F03 Audit export
- Export is scoped by tenant/project/time and includes hashes/references for source, release, workflow, evaluations, checks, deployments, approvals, and exceptions.
- Export never includes tokens or inference payloads.

### US-F04 Multi-project readiness
- Repository/project/path identifiers are explicit in APIs and events.
- Tenant partition tests demonstrate that one installation cannot read or mutate another.

## Epic G — operation and lifecycle

### US-G01 Diagnose installation
- Diagnostic checks App permissions, webhook status, OIDC/RBAC, environment config, queue, Foundry endpoint and workflow readiness.
- Output redacts secrets and provides next actions.

### US-G02 Upgrade safely
- Configuration schema and database migrations are versioned, resumable and backward-compatible across the documented window.
- Upgrade preview and rollback/restore procedure exist.

### US-G03 Uninstall
- App stops processing, revokes local credentials/references, and marks installation inactive.
- Customer Azure resources remain unless a separate, explicit teardown is run.

## Epic H — autonomous delivery

### US-H01 Route bounded work
- Orchestrator validates a task contract, assigns one primary specialist and optional reviewers, and supplies only relevant context.
- No agent changes out-of-scope files without a revised contract.

### US-H02 Autonomous merge
- Agent PR merges only when acceptance checks, coverage, code review policy, required status checks, merge queue/rulesets, and security gates pass.
- Architecture changes include accepted ADRs; dependency/permission changes include evidence.
- Two failed repair loops stop automation and open/update a blocked Issue.
