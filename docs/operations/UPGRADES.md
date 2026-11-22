# Upgrade and migration

## Release contents

Each signed release includes images by digest, Bicep modules, migration manifest, database migrations, configuration schema migration, compatibility matrix, SBOM/provenance, release notes, known preview changes and rollback boundary.

## Procedure

1. Export/verify audit evidence and database backup/PITR.
2. Run preflight: current version, target path, provider compatibility, App permissions, capacity, pending operations.
3. Run Bicep `what-if` and configuration migration dry run.
4. Drain/serialize writers; complete or pause deployments.
5. Apply expand-compatible DB migration.
6. Deploy backward-compatible services by image digest.
7. Migrate configuration through a generated PR.
8. Verify health, queue, webhook, API, GitHub check and one non-production Foundry smoke operation.
9. Enable new behavior by feature flag/module version.
10. Contract only after the documented compatibility window.

Rollback reverts services/flags while the expand schema remains compatible. If migration is irreversible, release notes state the restore requirement and upgrade requires explicit acknowledgement.
