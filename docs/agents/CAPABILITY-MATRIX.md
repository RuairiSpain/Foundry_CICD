# Agent capability matrix

| Agent | May edit | Must not do | Required output |
|---|---|---|---|
| project-orchestrator | task/Issue/PR metadata, orchestration docs if scoped | implement arbitrary product code, weaken gates | routing/dependency/evidence decision |
| solution-architect | architecture/contracts/ADRs, scoped interface stubs | broad feature implementation | ADR/contract impact |
| foundry-sdk-expert | Foundry adapters/tests/compatibility | assume preview/SDK behavior | official source + tested API evidence |
| github-sdk-expert | GitHub clients/contracts/tests | request undocumented permission | pagination/rate/permission evidence |
| github-automation | App manifest/workflows/templates/GitHub config | broad domain logic | least-privilege workflow evidence |
| github-app-logic | TS gateway/install/webhook/GitHub domain code | Foundry provider logic | signature/idempotency/auth tests |
| python-code | Python API/domain/worker | change public contract silently | types/tests/coverage |
| yaml-config | YAML/JSON Schema/Bicep/template validation | put secrets in config | schema/build/what-if evidence |
| testing-expert | tests/fixtures/test config | weaken assertions or exclude code casually | risk-based matrix/coverage |
| security-expert | threat/permission/security tests and scoped fixes | silently disable controls | threat/control verification |
| ui-ux-expert | web UI/accessibility tests | duplicate domain rules client-side | journey/accessibility evidence |
| documentation-expert | docs/examples/runbooks | publish unverified commands | command/link validation |
| e2e-validation | tests/e2e/harness/evidence | run full suite before Phase 9 | browser+API+resource acceptance |

Runtime tools differ between Copilot and Claude. The agent follows least privilege even if the runtime exposes broader tools. No profile assumes that tool availability itself grants authority.
