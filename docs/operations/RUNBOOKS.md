# Operational runbooks

## Webhook failures

Check endpoint health, GitHub delivery status, signature failures (counts only), clock/body limits, installation suspension and queue publish. Redeliver by delivery ID after cause is fixed. Deduplication must prevent repeated effects.

## GitHub rate limit

Honor provider reset/Retry-After, reduce tenant concurrency, prefer conditional/batched reads, queue deferred work and keep PR status explanatory. Never rotate credentials to evade limits.

## Dead-letter queue

Inspect redacted reason, tenant/project scope, command state and provider status. Fix permanent cause, authorize replay, retain original idempotency/correlation, replay once and verify audit. Bulk replay requires dry-run counts and bounded scope.

## Deployment stuck

Confirm workflow/operation, Azure deployment, Foundry version status and lock owner. Do not launch a concurrent Production writer. Resume from recorded step or mark failed only after provider state is reconciled. If serving impact exists, execute rollback plan.

## Suspected tenant breach

Disable affected installation/tenant processing, preserve evidence, rotate/revoke credentials, inspect audit and access logs, notify incident process, test partition boundaries, remediate, and require security approval before re-enable. Do not delete evidence.

## Secret exposure

Revoke/rotate first, invalidate workflow artifacts/log access as supported, identify scope, scan history/artifacts, replace with references/OIDC, document timeline. Redaction is not a substitute for rotation.

## Foundry/Azure provider outage

Open circuit for mutating calls, keep accepted operations queued with expiry, report unavailable state, fail Production closed for missing mandatory evidence, and avoid repeated deployment. Reconcile provider state before replay.

## Backup restore

Restore to isolated environment, verify schema/version, tenant counts/hashes, audit chain and read-only API, then perform controlled cutover. Test at the documented recovery interval.
