# GitHub Copilot repository instructions

This repository implements the approved Foundry GitHub App blueprint. Canonical sources are `docs/product`, `docs/architecture`, and accepted ADRs.

- Begin from a validated task contract; do not invent requirements.
- Use the specialist in `.github/agents/` matching the task and follow `docs/agents/ORCHESTRATION.md`.
- Keep edits within allowed paths. Propose an ADR for architecture changes and a revised contract for permission/dependency/public API changes.
- Python: 3.13+, FastAPI, Pydantic v2, strict typing, adapter boundaries. TypeScript: strict, generated contract clients, no duplicate server rules.
- Use customer-owned Azure identities/resources, OIDC and managed identity. Do not emit secrets.
- Validate GitHub/Foundry/Azure APIs against current official docs and test installed SDK signatures.
- Preserve idempotency, tenant isolation, least privilege, audit and immutable release promotion.
- Add tests with behavior. Maintain >=95% unit line coverage and named critical negative scenarios.
- Run format, lint, type, schema/contract, focused tests and security checks before PR.
- Never weaken a gate or merge with missing/skipped required evidence. Two autonomous repair attempts maximum.
