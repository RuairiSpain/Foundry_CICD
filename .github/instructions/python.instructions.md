---
applyTo: "**/*.py"
---
Use Python 3.13+, Pydantic v2 and strict typing. Prefer immutable Pydantic/domain values at boundaries. Reject unexpected command fields. Keep provider SDK objects in adapters. Use explicit async cancellation/timeouts, structured errors and dependency injection. Test tenant scope, authorization, idempotency, retries and redaction. Do not use broad `except Exception` without normalized handling and telemetry.
