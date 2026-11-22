# Target repository layout

```text
apps/github-app/          # TypeScript GitHub App edge
apps/web/                 # TypeScript setup/config UI
services/control-plane/   # FastAPI application
services/worker/          # Python command workers
packages/contracts/       # OpenAPI/JSON Schema and generated clients
packages/policy/          # deterministic policy packs
infra/                    # Bicep modules and environment parameters
schemas/                  # customer configuration/task schemas
templates/                # generated repository/workflow templates
tests/unit/
tests/contract/
tests/integration/
tests/security/
tests/e2e/                # complete suite executed in Phase 9
```

Use root task runner commands with stable names: `format`, `lint`, `typecheck`, `test-unit`, `test-contract`, `test-integration`, `test-security`, `coverage`, `build`, and `validate-all`. Implementation may choose `uv` and `pnpm`, but commits lockfiles and never requires global mutable packages beyond documented bootstrapping tools.
