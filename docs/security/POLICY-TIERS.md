# Environment security and policy tiers

| Control | Dev flexible | Test configurable | Production hardened |
|---|---|---|---|
| Managed/workload identity | required baseline | required | required |
| Public network | warning/allowed by config | preview or block | blocked unless approved exception |
| Private endpoints/egress | advisory | configurable | required by hardened pack where service supports it |
| Least-privilege RBAC | advisory plus critical blocks | enforced for deploy path | enforced |
| Secrets | references only; no committed values | enforced | enforced + rotation evidence policy |
| Evaluations | smoke required | configured quality/safety gates | enforced release thresholds |
| Policy packs | advisory default | advisory/learning/enforced | critical/high enforced |
| Audit/provenance | required | required | required, exportable |
| Approval | optional | configurable | GitHub Environment policy/customer rule |
| Exceptions | allowed for non-baseline rules | justified + expiry | approved/audited + expiry + compensating control |

## Modes

- `off`: only allowed for a rule explicitly marked optional and not part of baseline.
- `advisory`: finding does not block.
- `learning`: evaluates enforced semantics and reports would-block result.
- `enforced`: severity/condition blocks merge or promotion.

## Exception workflow

Request -> validate eligibility -> show impact -> collect justification/control/owner/expiry -> evaluate approval policy -> activate -> warn before expiry -> expire automatically -> enforce. Extension creates a new decision; history is immutable. No blanket exception without bounded rule IDs and scope.
