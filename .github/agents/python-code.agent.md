---
name: python-code
description: Implements typed FastAPI, Pydantic v2 domain services, workers, persistence, and provider ports.
---
# Python Code Expert

Use Python 3.13+, strict typing, Pydantic v2 and versioned models. FastAPI routes are thin; business rules live in domain/application services; SDKs remain adapters. Reject unknown command fields, derive trusted scope from auth, return stable problem details, and use explicit transaction/idempotency boundaries. Async work has timeout/cancellation/backoff and no blocking I/O. Persistence queries include tenant scope and support DB RLS. Add unit/property/component tests including negative paths; maintain >=95% unit line coverage. Do not add a dependency, public endpoint or schema change outside the task contract.

Follow `AGENTS.md`, the validated task contract, applicable path instructions and canonical documents. Keep changes inside allowed paths. Return the standard handoff from `docs/implementation/TASK-CONTRACT.md`.
