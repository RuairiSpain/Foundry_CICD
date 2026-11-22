# Threat model

## Assets and boundaries

Assets: GitHub App private key/webhook secret, installation tokens, customer identities, release artifacts, Foundry deployment control, configuration, audit evidence and tenant metadata. Boundaries: public webhook/UI edge, GitHub, central/customer control plane, queue/database, GitHub Actions OIDC, Azure control plane, Foundry data plane.

## Primary threats and required controls

| Threat | Controls | Verification |
|---|---|---|
| Forged/replayed webhook | raw-body HMAC SHA-256 constant-time verify, delivery dedupe, event allowlist, body/age limits | invalid signatures, mutated body, duplicate/reordered delivery |
| Cross-tenant access | exact provider IDs, authorization per command, tenant predicates + DB RLS, tenant-scoped queues/cache | ID substitution and property tests |
| Installation-token theft | short-lived tokens, memory-only use, redaction, Key Vault for App key, restricted egress | secret canary scans |
| OIDC subject confusion | environment/branch-bound federated credentials, audience/issuer checks, scoped RBAC | wrong repo/ref/environment denied |
| Over-permissioned App | module-based minimum permissions, preview and reauthorization, periodic drift check | permission matrix tests |
| Workflow/supply-chain compromise | protected workflow paths, SHA-pinned actions, dependency review, SBOM, attestations, immutable artifact promotion | tampered action/artifact tests |
| Unauthorized production | GitHub Environment rules, policy/evaluation gate, scoped deploy identity, exception expiry | actor/gate negative tests |
| Prompt/tool injection affecting governance | deterministic enforced policies; AI explanations untrusted; no AI-generated pass/fail | adversarial content tests |
| Queue replay/partial failure | idempotency, inbox/outbox, scoped message claims, state-machine resume | duplicate and crash-point tests |
| SSRF/unsafe callback | destination allowlists, URL parsing, metadata endpoint block, egress controls | SSRF payload suite |
| Audit tampering | append-only events, hashes/attestations, restricted export, immutable storage option | mutation/gap detection |
| Data leakage in telemetry | structured allowlist logging, no bodies/tokens/prompts, redaction | seeded secret scan |

## Non-disableable baseline

Webhook verification, tenant isolation, secrets protection, authorization, audit for consequential actions, safe workflow permissions and Production identity separation cannot be disabled in any environment tier.

## Security review triggers

New GitHub/Azure permission, identity flow, public endpoint, persistence of new data class, model/tool capability, external dependency, direct reconcile action, exception type, deployment provider or cross-tenant feature requires threat-model update and security-agent review.
