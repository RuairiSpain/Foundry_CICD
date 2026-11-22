---
applyTo: "tests/**/*,**/*_test.py,**/test_*.py,**/*.spec.ts,**/*.test.ts"
---
Test behavior, negative paths and boundaries; do not mirror implementation. Explicitly seed tenant/project. Use fake clocks and deterministic IDs. Assert idempotency and no secret leakage. Do not delete/weaken assertions or add exclusions just to pass coverage. Full Playwright system suite is Phase 9 only.
