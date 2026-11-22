# Final Phase 9 E2E acceptance

## Harness

Use Playwright with headless Chromium and trace-on-first-retry, a dedicated GitHub test organization, disposable repositories, central-hosted test deployment, customer-hosted test deployment, and disposable Azure test environment mappings. Browser actions validate the UI; direct GitHub API, workflow conclusions, Azure resource queries and Foundry invocation validate state.

The full suite is executed only after Phases 0–8 exit. Scenario design and fixtures may be built earlier; complete acceptance execution remains the last phase.

## Mandatory journeys

### E01 Public App central-hosted install
Install on selected repository; verify requested permissions, installation record, signed webhook, no access to unselected repository.

### E02 Private App customer-hosted install
Deploy Bicep, register private App, connect callback/webhook, run diagnostics and verify managed identity/Key Vault references.

### E03 New project
Choose code-based or hosted agent, branch strategy, modules and Dev/Test/Prod mapping; preview; create setup PR; merge; validate files/workflows/environments. Attempt existing-project import and confirm V1 rejection.

### E04 Pull-request golden path
Change agent/config, observe required checks/evaluations/advisory guidance, create deduplicated remediation Issue, add to Project, fix and close after verification.

### E05 Deploy Dev
Merge, seal release/provenance, deploy, invoke smoke test, record evaluation and confirm release/artifact digest.

### E06 Promote and harden
Promote same release to configurable Test and hardened Production. Confirm no rebuild, environment policy and audit. Exercise a valid time-bound exception and expiry behavior.

### E07 Failure and rollback
Fail evaluation/deployment, verify no invalid promotion, repair/retry idempotently, deploy healthy version, then rollback and verify application/API/resource state.

### E08 One-way branch migration
Start trunk, preflight/preview/apply Gitflow, verify branches/rulesets/workflows, and confirm UI/API cannot migrate back.

### E09 Modules and governance
Enable learning then enforced best-practices, cost, drift and audit-export modules. Confirm prerequisites/permissions preview, drift remediation PR and export without secrets.

### E10 Upgrade/uninstall
Upgrade customer-hosted instance/config schema, verify state, uninstall App, verify processing stops and customer Azure resources remain.

## Mandatory negative matrix

- Invalid webhook signature and replayed delivery.
- Missing/withdrawn GitHub permission.
- Suspended installation.
- Revoked/expired Azure identity or missing RBAC.
- Incompatible SDK/region/agent type.
- Concurrent duplicate deployment.
- Unauthorized/expired Production exception.
- Cross-tenant/project identifier substitution.
- Provider throttling and dead-letter replay.
- Secret canary in input; verify no output/log/artifact leakage.

## Pass criteria

Every journey passes on supported hosting/App distributions, no critical/high security defect is open, evidence is correlated to scenario and release, cleanup is verified, and rerun from a clean organization/repository is reproducible.
