# Data model

PostgreSQL is the reference store. IDs are UUIDv7 or equivalent sortable opaque IDs; external provider IDs are stored separately and exactly.

| Aggregate/table | Key fields and invariants |
|---|---|
| tenant | GitHub account ID, edition, state; one logical isolation boundary |
| installation | exact GitHub installation ID, tenant, permission snapshot, suspended/deleted timestamps |
| repository | exact GitHub repository ID, installation, owner/name display, selected state |
| project | repository + path, config schema version, branch lifecycle; unique by repo/path |
| environment | project, logical name, Azure subscription/RG, Foundry target, security tier |
| module_assignment | scope, module, version, mode, config hash; dependencies resolved in plans |
| policy_pack/rule | immutable versioned rules and official source references |
| exception | rule/scope, justification, control, owner, approval evidence, start/end; append-only history |
| release | project, source SHA, artifact digest, SBOM, config hash, provenance; immutable after sealing |
| deployment | release + environment, provider IDs, state, timestamps, previous healthy deployment |
| evaluation_run | deployment/release, suite version, thresholds, normalized result, evidence URI/hash |
| finding | stable fingerprint, rule/resource, status, Issue mapping; idempotent upsert |
| command_execution | type, actor, authorization reference, state machine step, idempotency key |
| webhook_inbox | installation + GitHub delivery ID unique, event, received/processed state |
| outbox | transaction-bound event and publish status |
| audit_event | append-only actor/action/target/outcome/evidence/correlation; tamper-evident export chain |
| drift_snapshot | desired/actual hashes and normalized differences |

## State machines

### Branch strategy
`trunk -> migrating_to_gitflow -> gitflow`. Failure returns to `trunk` only if no irreversible step completed; otherwise `migration_attention_required`. No `gitflow -> trunk` transition exists.

### Deployment
`planned -> queued -> deploying -> verifying -> healthy | failed | cancelled`. Rollback creates a new deployment operation referencing a prior release; it does not rewrite history.

### Command
`accepted -> validating -> authorized -> planned -> executing -> verifying -> succeeded | failed | blocked | expired`.

## Retention

Retention is configurable by edition and policy. Audit/provenance defaults longer than operational logs. Deletion pseudonymizes user display data where legal requirements permit but preserves required deployment evidence. Never store access tokens beyond their active operation; central service stores encrypted App private-key material only where the hosting edition requires it, preferably by Key Vault reference.
