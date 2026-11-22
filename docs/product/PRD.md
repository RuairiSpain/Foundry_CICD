# Product requirements document

## 1. Product statement

The Foundry GitHub App provides a GitHub-native golden path for creating, developing, governing, deploying, promoting, operating, and auditing new Microsoft Foundry agent projects. Developers work through repositories, pull requests, checks, Issues, Actions, Environments, and Projects. Platform managers apply modular guardrails without forcing every team into the same maturity level.

## 2. Goals

1. Create a new V1 Foundry project and repository through a guided GitHub flow.
2. Deploy code-based and hosted agents reproducibly to Dev, Test, and Production.
3. Promote an immutable release rather than rebuilding per environment.
4. Make evaluations, security, policy, cost, provenance, and rollback first-class gates.
5. Support central-hosted and customer-hosted control planes with customer-owned Azure data-plane resources and identities.
6. Let teams opt into modules independently while resolving prerequisites explicitly.
7. Support trunk-based development with feature branches and Gitflow.
8. Permit a guided, one-way migration from trunk-based to Gitflow.
9. Provide advisory, learning, and enforced best-practice packs mapped to official Microsoft guidance and the Well-Architected Framework.
10. Automate work using GitHub Actions and coding agents while preserving deterministic controls and audit evidence.

## 3. Non-goals

### V1
- Importing existing Foundry Toolkit projects.
- Managing every Foundry component type.
- Supporting Terraform as an infrastructure provider.
- Replacing GitHub Actions, GitHub Projects, Azure Policy, Azure Monitor, or Foundry evaluation services.
- Storing customer prompts, conversation payloads, model inputs, or business data in the central control plane.
- Guaranteeing that preview Foundry capabilities carry a production SLA.

### V2 candidates
- Existing-project discovery/import and Foundry Toolkit migration adapters.
- Prompt agents, workflows, connections, tools, model lifecycle, knowledge resources, and wider evaluation assets.
- Optional Terraform provider.
- Cross-repository dependency graphs and portfolio analytics.

## 4. Users

| Persona | Needs |
|---|---|
| Developer | Fast project creation, local/VS Code compatibility, actionable PR checks, safe deployment |
| Tech lead | Branch strategy, release readiness, compatibility and impact views |
| Platform engineer | Templates, policy packs, shared modules, drift remediation, tenant isolation |
| Security engineer | Least privilege, hardening tiers, expiring exceptions, complete audit trail |
| Project manager | Project status, risks, blocked work, promotion readiness, compliance exports |
| App operator | Health, queues, retries, rate limits, backups, upgrades, tenant-safe diagnostics |

## 5. Product modules

The `core` module is mandatory. Others are opt-in and declare dependencies in the configuration schema.

| Module | Purpose | V1 default |
|---|---|---|
| core | Installation, project registry, configuration, webhooks, checks, audit | On |
| deployment | Bicep/azd deployment, release records, Dev/Test/Prod promotion | On |
| evaluations | Quality, safety, performance and smoke gates | On |
| branching | Trunk/Gitflow setup, rulesets, one-way migration | On |
| best-practices | Advisory/learning/enforced golden-path packs | Advisory |
| security | Environment tiers, exceptions, identity and permission checks | On |
| projects | Issues and GitHub Projects automation | On |
| cost | Cost metadata, budgets, impact estimates and alerts | Off |
| drift | GitHub/Azure/Foundry desired-versus-actual reconciliation | Off |
| rollout | Canary/blue-green plans and rollback | Off |
| provenance | Build, evaluation, approval and deployment attestations | On |
| docs | Generated architecture and runbooks | On |
| audit-export | Exportable evidence bundles | Off |

Enabling a module presents required permissions, resources, and dependent modules. The system never silently enables a dependency. The user confirms the computed plan.

## 6. Functional requirements

### FR-01 Installation and onboarding
- Support public Marketplace-style and private GitHub App registration.
- Support one central service and customer-hosted instances from one codebase.
- Install at organization or repository scope with selected repositories.
- Connect Azure by workload identity/OIDC; do not require long-lived client secrets for deployment.
- Create environment mappings and optionally separate subscription/resource group per environment.
- Generate a setup PR containing validated configuration, Bicep, workflows, ownership files, and instructions.
- Rerunning setup is idempotent. Uninstalling the App does not delete customer Azure resources.

### FR-02 New project creation
- V1 creates new projects only.
- Collect region, naming, Foundry agent type, environments, modules, branch strategy, ownership, and governance choices.
- Validate regional/service compatibility before change creation.
- Produce an explicit plan before making repository or Azure changes.

### FR-03 GitHub-native developer experience
- PR checks show schema, tests, evaluations, policy, security, compatibility, cost impact, and deployment preview.
- Check details are concise, actionable, and link to evidence and learning material.
- Findings may create/update deduplicated Issues with labels, severity, owner suggestion, and remediation.
- GitHub Projects reflects backlog, blocked status, policy failures, and release readiness.
- A small App UI is allowed for multi-step setup, permission review, configuration visualization, and audit exploration.

### FR-04 Branching
- `trunk` means `main` plus short-lived feature branches and required PR checks.
- `gitflow` means `develop`, `release/*`, `hotfix/*`, and protected `main`.
- Promotion is release/version based under either model.
- A guided trunk-to-Gitflow migration performs preflight, preview, branch/ruleset/workflow changes, verification, and audit.
- The UI and API reject Gitflow-to-trunk migration. Exceptional reversal is an out-of-band administrator procedure and is not a product feature.

### FR-05 Deployment and promotion
- Build one immutable releasable artifact and provenance record per release.
- Deploy to Dev, evaluate, then promote the same artifact/reference to Test and Production.
- Serialize deployments per project/environment; retries are idempotent.
- GitHub Environments provide configurable approvals and protection rules.
- Use Bicep for Azure resources and supported Foundry/azd deployment paths behind provider adapters.
- Provide dry-run/change-impact output before production.

### FR-06 Security tiers
- Dev defaults to flexible with warnings and a small mandatory baseline.
- Test is configurable: flexible, hardening-preview, or enforced.
- Production defaults to hardened.
- Production exceptions require scope, business justification, approver policy, expiry, compensating control, and audit event. Expired exceptions fail closed.

### FR-07 Best-practice packs
- Packs cover agents, models, tools/connections, identity, network, data, evaluations, cost, operations, and software supply chain.
- Modes: `off`, `advisory`, `learning` (simulate enforcement), `enforced`.
- Each rule has stable ID, severity, rationale, official source, applicability, test, remediation, and version.
- Pack versions are pinned per project. Upgrades show changed rules before adoption.

### FR-08 Enterprise quality and insight
- Dependency/compatibility checker validates SDK, API, model, region, tool, and preview/GA constraints.
- Change-impact preview covers resources, permissions, policy, likely cost direction, rollout, and irreversible changes.
- Secrets/permissions assistant recommends least privilege and rotation without reading secret values.
- Rollout/rollback planner records prerequisites, health gates, abort rules, and recovery point.
- Documentation generator derives environment diagrams, settings, and runbooks from configuration.
- Audit export includes configuration, provenance, evaluations, exceptions, approvals, and deployments.
- Drift detection proposes a remediation PR or an explicitly authorized reconcile operation.

### FR-09 Multi-project readiness
- Data model supports organizations, installations, repositories, many projects, monorepo paths, teams, shared policy packs, and delegated administration.
- V1 UI may expose one project per repository, but APIs and storage must not encode that limitation.

### FR-10 Autonomous engineering agents
- The project orchestrator converts approved backlog items into bounded task contracts.
- Specialists implement, test, open PRs, respond to deterministic failures, and may merge when all required checks and repository rules succeed.
- Retry limit is two autonomous repair loops by default; unresolved work becomes a blocked Issue with evidence.
- Agents cannot bypass branch rules, weaken tests, grant themselves permissions, expose secrets, or self-approve an environment gate where GitHub policy requires a distinct reviewer.

## 7. Non-functional requirements

| Area | Requirement |
|---|---|
| Availability | Central service target 99.9% after GA; customer-hosted target documented by selected Azure tier |
| Performance | Webhook acknowledgement within 10 seconds; asynchronous processing for slow work |
| Reliability | Idempotency keys, durable queue, exponential backoff with jitter, dead-letter recovery |
| Scale | Tenant-partitioned work; GitHub secondary-rate-limit aware; configurable worker concurrency |
| Security | Verify webhook signatures before parsing; encryption in transit/at rest; managed identities; no cross-tenant access |
| Privacy | Control plane stores metadata and evidence references, not customer inference payloads |
| Observability | Structured logs, metrics, distributed traces, correlation ID, tenant-safe diagnostics |
| Accessibility | UI targets WCAG 2.2 AA |
| Localization | External strings resource-ready; English first |
| Compatibility | Supported-version matrix and preview feature flags; fail with actionable incompatibility |
| Quality | >=95% aggregate unit-test line coverage for first-party business logic; 100% named security scenarios |
| Supply chain | Lockfiles, SBOM, secret scanning, dependency review, signed/attested release artifacts |

## 8. Success measures

- Median new-project setup under 20 minutes excluding Azure provisioning time.
- At least 90% of pilot projects complete setup without operator intervention.
- Every Production deployment has source, artifact, evaluation, policy, approval/exception, and deployment provenance.
- Zero silent permission or module expansion.
- No cross-tenant data-access findings in security testing.
- 95% unit coverage gate remains green; critical mutation score target is defined after baseline.
- Final Phase 9 acceptance passes all mandatory journeys on both central- and customer-hosted editions.

## 9. Release acceptance

V1 is releasable only when vertical slices VS-01 through VS-08 in `ROADMAP.md` pass, public/private App installation is documented, both hosting models are reproducible, preview dependencies are disclosed, and the Phase 9 browser/API/resource acceptance suite is green.
