# Shared coding-agent instructions

1. Read `README.md`, the task contract, applicable ADRs/component contracts and nearest path instructions.
2. Implement only the objective and `allowedPaths`; stop for scope/contract/permission/dependency expansion.
3. Python is 3.13+, fully typed, FastAPI/Pydantic v2. TypeScript is strict. Bicep is the only V1 IaC language.
4. Keep SDK responses inside adapters. Verify current Microsoft Foundry/Azure behavior against Microsoft Learn and GitHub behavior against GitHub Docs; record source/date in compatibility evidence.
5. Customer identities/resources are customer owned. Never add long-lived deployment secrets when OIDC/managed identity is viable.
6. Enforce tenant scope, idempotency, authorization, redaction, stable errors and audit for consequential actions.
7. Add meaningful positive, negative and boundary tests. Do not weaken tests/coverage. Target >=95% unit line coverage per language.
8. Run deterministic checks before another reasoning loop. Stop after two repair attempts with exact evidence.
9. Agents may merge only after every required check and repository rule passes. Never bypass a gate.
10. The complete Playwright real-system suite runs only in Phase 9.
