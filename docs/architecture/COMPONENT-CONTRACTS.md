# Component contracts

## GitHub App gateway

**Owns:** App JWT/installation token flow, webhook validation, GitHub user callback, GitHub API client, permission inspection, Check/PR/Issue/Project presentation.<br>
**Does not own:** Foundry business rules, Azure deployment, policy semantics, persistent domain decisions.

Input: raw GitHub HTTP event or authenticated UI call. Output: normalized event/command or a rendered view. It must acknowledge accepted webhooks without waiting for deployment.

## Control-plane API

**Owns:** domain authorization, tenants/installations/projects, configuration plans, module dependency resolution, releases/deployments, exceptions, audit query/export.<br>
**Does not own:** raw webhook parsing, long-running execution, browser automation.

All endpoints use versioned Pydantic request/response models, reject extra fields for security-sensitive commands, and return RFC 9457-style problem details with stable application error codes.

## Worker

**Owns:** long-running command state machine, idempotency, provider calls, retries, evidence collection, reconciliation.<br>
**Does not own:** ad hoc HTTP responses or unversioned provider data leaking into domain models.

Each handler implements `validate -> authorize -> plan -> execute -> verify -> record`. A resumed handler reads prior steps and never repeats a completed non-idempotent mutation.

## Provider ports

```text
GitHubProvider
  get_installation_permissions()
  create_setup_pull_request(plan)
  upsert_check(result)
  upsert_issue(finding)
  configure_repository(plan)
  read_actual_state(scope)

AzureProvider
  validate_identity(scope)
  plan_bicep(environment, release)
  deploy_bicep(environment, release, idempotency_key)
  read_actual_state(scope)

FoundryProvider
  validate_compatibility(spec)
  deploy_agent(environment, release, idempotency_key)
  invoke_smoke_test(deployment)
  get_deployment_state(scope)

EvaluationProvider
  run_suite(release, environment, suite)
  normalize_results(raw)
```

Ports return domain DTOs; SDK response objects do not cross adapter boundaries.

## Policy engine

Input is a typed `PolicyInput` snapshot and pinned pack versions. Output is deterministic `Finding[]` with rule ID, resource, severity, mode, evidence, remediation and source. External AI may explain a finding but cannot determine pass/fail for an enforced deterministic rule.

## UI

The UI calls only documented control-plane/gateway APIs. It must present a plan before consequential setup, migration, permission, reconcile, exception, production deployment or teardown actions. Accessibility testing is part of the component definition of done.

## Contract versioning

- OpenAPI and JSON Schema are source controlled.
- Additive response fields are allowed within a major version; consumers ignore unknown response fields.
- Request models reject unknown fields for commands.
- Breaking changes require a new API/schema major version, migration note and contract tests.
- Provider adapter compatibility is maintained in `docs/implementation/DEPENDENCIES.md`.
