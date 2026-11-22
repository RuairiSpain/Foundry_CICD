# Customer installation specification

## Supported paths

1. **Central hosted + public App** — install published App, choose repositories, then complete Azure/project setup.
2. **Central hosted + private App** — operator registers private App against central endpoint for controlled distribution.
3. **Customer hosted + private App** — deploy Azure stack, register App with generated URLs, place secrets in Key Vault, run diagnostics.
4. Customer-hosted public-App routing is supported only when the distribution/control-plane trust model is explicitly configured and documented.

## GitHub-first setup journey

1. Install App and select repositories.
2. App checks effective permissions and installation state.
3. Open setup wizard from GitHub App configuration/check link.
4. Choose repository/path and **new project** (V1).
5. Choose code-based or hosted agent template.
6. Choose `trunk` or `gitflow`.
7. Configure Dev/Test/Production subscription/resource group/region; separate subscriptions optional.
8. Select modules and modes.
9. Configure GitHub Environments/Project and owners.
10. Generate Azure OIDC/RBAC and Bicep plan.
11. Review permission, resources, files, policy, cost direction and preview-risk summary.
12. Apply by creating a setup PR; workflows perform approved provisioning/deployment.
13. Diagnostics verify App, webhook, workflows, OIDC/RBAC, Azure and Foundry state.

## Customer-hosted bootstrap

Prerequisites: Azure subscription, permission to deploy Bicep and create scoped role assignments/identities, GitHub organization owner or App manager, DNS/TLS plan if custom domain, supported GitHub plan/features.

Reference commands are supplied by the implementation release and must be verified against its pinned CLI versions. Expected flow:

```bash
az login
az account set --subscription <subscription-id>
az deployment sub what-if --location <region> --template-file infra/main.bicep --parameters @infra/parameters/customer.bicepparam
az deployment sub create --location <region> --template-file infra/main.bicep --parameters @infra/parameters/customer.bicepparam
```

The deployment outputs non-secret callback/webhook URLs and Key Vault secret names. The operator registers the GitHub App, stores private key/webhook secret directly in Key Vault, and runs the diagnostic command/UI. Never print secret values or put them in parameter files.

## Idempotency and teardown

Setup can be safely rerun and creates a plan from actual versus desired state. Uninstall marks the installation inactive and revokes local references. Azure workload teardown is a distinct explicit operation with retention/export preview. Default uninstall leaves customer resources and data intact.

## Production readiness checklist

- Required App permissions match enabled modules.
- Webhook signature and redelivery tests pass.
- OIDC subjects/audience and RBAC are environment scoped.
- Production hardened policy and exception policy configured.
- Backup/restore and dead-letter replay tested.
- Monitoring/alerts and support ownership configured.
- Preview dependencies accepted with owner/review date.
- Upgrade and break-glass runbooks available.
