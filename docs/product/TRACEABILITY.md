# Requirements traceability

| Requirement group | Architecture | Delivery slice | Verification |
|---|---|---|---|
| Installation/project creation | ARCHITECTURE §§2–4; API-CONTRACTS | VS-01, VS-02 | Contract + integration + E2E E01–E03 |
| GitHub-native checks/issues/projects | COMPONENT-CONTRACTS | VS-03 | Contract + sandbox GitHub tests + E2E E04 |
| Foundry deployment/promotion | ADR-0002; API-CONTRACTS | VS-04, VS-05 | Provider contract + smoke + E2E E05–E07 |
| Branching/migration | ADR-0004 | VS-06 | State-machine tests + E2E E08 |
| Best-practice/security tiers | POLICY-TIERS; THREAT-MODEL | VS-07 | Rule fixtures + negative security + E2E E09 |
| Enterprise modules | PRD FR-08 | VS-08+ | Module contract tests and targeted journeys |
| Autonomous agents | ORCHESTRATION; TASK-CONTRACT | all | Task schema, scope check, merge-gate simulation |
| 95% unit coverage | TEST-STRATEGY | all | CI coverage gate |
| Full browser acceptance last | E2E-SCENARIOS | Phase 9 | Playwright + GitHub API + Azure/Foundry assertions |
