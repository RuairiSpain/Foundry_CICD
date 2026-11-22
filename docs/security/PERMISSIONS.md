# Permission design

Request the minimum permission set for enabled modules. GitHub permission names/endpoints must be revalidated against current GitHub documentation during implementation and before each release.

## GitHub repository/organization permissions (planned)

| Capability | Planned access | Notes |
|---|---|---|
| Metadata | Read | GitHub-required baseline |
| Contents | Read; write only for setup/remediation branches/PR files | Prefer PRs, never direct protected-branch writes |
| Pull requests | Read/write | Setup/remediation PRs, comments, merge readiness |
| Checks | Read/write | Validation/evaluation/policy presentation |
| Issues | Read/write | Deduplicated remediation and lifecycle |
| Actions/workflows | Read; write only when module installs/updates workflows | Keep workflow modification separately visible |
| Deployments/environments | Read/write for deployment module | Environment settings may require elevated administration capability |
| Administration/rulesets | Optional read/write for branching module | High-impact, explicit opt-in and reauthorization |
| Organization Projects | Optional read/write for projects module | Organization-level permission and owner setup may be required |
| Members | Optional read | Resolve team/role/ownership; avoid broad member data storage |
| Secrets/variables | Write metadata/value only when explicitly configured | Never read secret values; prefer customer entry/OIDC |

Subscribe only to needed events: installation lifecycle, repository selection, pull request, push/check/workflow/deployment/issue events required by enabled modules. Ignore unknown events safely.

## Azure identities

- App runtime managed identity: access its Key Vault references, Service Bus, database auth, telemetry and required internal resources only.
- GitHub Actions environment identity: federated per repo/environment where practical; least-privilege resource-group scope; `id-token: write` only in the job requiring login.
- Production deployment identity is distinct from Dev when customer policy requires; separate subscriptions are optional.
- Reader/diagnostic identity cannot mutate.
- Role assignment creation is a separate privileged bootstrap path, not granted to ordinary deployment workflows.

## Permission changes

Compute old/new delta, map each permission to module and API operations, show risk, require GitHub reauthorization where applicable, record audit, and do not enable the module until the effective permission snapshot matches.
