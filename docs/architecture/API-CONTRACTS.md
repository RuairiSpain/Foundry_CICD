# API contracts

The implementation must publish OpenAPI 3.1 generated from FastAPI and validate it in CI. Prefix all public control APIs with `/api/v1`. Exact external GitHub IDs remain strings where JavaScript integer precision could be unsafe.

## Core endpoints

| Method/path | Purpose | Idempotency |
|---|---|---|
| `POST /github/webhooks` | Raw signed webhook ingress (gateway-owned) | GitHub delivery ID |
| `GET /api/v1/installations/{id}` | Permission/state diagnostic | n/a |
| `POST /api/v1/installations/{id}/plans` | Compute setup/update plan | content hash |
| `POST /api/v1/installations/{id}/plans/{planId}:apply` | Create setup PR/configuration operations | required key/header |
| `GET /api/v1/repositories/{repoId}/projects` | Enumerate project paths | n/a |
| `POST /api/v1/repositories/{repoId}/projects` | Define new project and plan | request ID |
| `GET /api/v1/projects/{projectId}` | Project/status/modules | n/a |
| `PATCH /api/v1/projects/{projectId}/modules/{module}` | Plan a module change | ETag + request ID |
| `POST /api/v1/projects/{projectId}/branch-migrations` | Start trunk-to-Gitflow plan | request ID |
| `POST /api/v1/projects/{projectId}/releases` | Seal release from validated source | source SHA + config hash |
| `POST /api/v1/releases/{releaseId}/deployments` | Deploy/promote to environment | release + environment |
| `POST /api/v1/deployments/{id}:rollback` | Roll back by deploying known release | request ID |
| `POST /api/v1/projects/{id}/evaluations` | Run configured evaluation suite | release + suite + env |
| `POST /api/v1/projects/{id}/drift-scans` | Queue desired/actual comparison | request ID |
| `POST /api/v1/projects/{id}/exceptions` | Request time-bound exception | request ID |
| `GET /api/v1/projects/{id}/audit` | Query audit events | n/a |
| `POST /api/v1/projects/{id}/audit-exports` | Create evidence export | filter hash |
| `GET /api/v1/operations/{id}` | Poll async operation | n/a |

## Command envelope

```json
{
  "requestId": "018f...",
  "actor": {"provider": "github", "subjectId": "123456"},
  "scope": {"tenantId": "...", "repositoryId": "...", "projectId": "..."},
  "expectedVersion": 7,
  "reason": "Promote release after Test gates"
}
```

Server derives trusted actor/scope from the authenticated context and rejects a body that conflicts with it.

## Async response

Use `202 Accepted` with `{operationId, statusUrl, correlationId}`. Terminal operation contains state, timestamps, plan/evidence references, normalized errors, and retryability. Never expose raw provider tokens or unredacted provider exceptions.

## Errors

`application/problem+json` fields: `type`, `title`, `status`, `detail`, `instance`, `code`, `correlationId`, `errors[]`. Stable codes include `permission_missing`, `configuration_invalid`, `module_dependency_missing`, `incompatible_provider`, `policy_blocked`, `evaluation_failed`, `branch_transition_invalid`, `concurrency_conflict`, `provider_rate_limited`, and `preview_risk_not_accepted`.
