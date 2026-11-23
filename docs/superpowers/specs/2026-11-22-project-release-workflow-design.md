# GitHub project and release workflow design

## Purpose and scope

Provide a developer-friendly issue intake and project board for a Foundry
release platform, with manager-facing progress reporting and as much safe
automation as the platform supports. The workflow must remain useful when
individual environments are disabled, while preserving production security,
approval, testing, evaluation, and immutable-release requirements.

This design covers three related increments:

1. Issue forms, a GitHub Project, views, fields, and reporting.
2. Trusted status synchronization and scoped remediation requests.
3. Release deployment and promotion integration once the platform supports
   authenticated users, tenant isolation, immutable releases, and deployments.

The current repository has only a local foundation. Project configuration and
issue forms must not pretend that the later increments already exist. In
particular, the existing fail-closed deployment template remains blocked
until real release and environment protections are implemented and verified.

## Intake and project

Retain the existing autonomous-task form. Add forms for features, bugs, and
deployment requests; the deployment form selects Stage or Production and
identifies an existing release rather than accepting arbitrary executable
commands. Forms collect acceptance criteria or reproduction evidence and
relevant impact. Deployment requests do not themselves authorize deployment.

Create a GitHub Project under the repository owner, link the repository, and
provide a board grouped by the single-select `Status` field:

`Backlog`, `Doing`, `Ready`, `Dev`, `Stage`, `Prod`, `Flagged`, `Canceled`,
`Done`.

The built-in auto-add workflow adds new repository issues to the project; the
item-added workflow sets their initial status to Backlog. Existing issues
require an explicit one-time import; enabling auto-add does not import them.
Drafts and pull requests must not silently become deployment requests.

Use `Investigate` and `Up Next` as optional, manually editable triage labels,
not mutually exclusive authoritative states. Users may change them freely.
Project fields provide phase, latest result, environment, retry count, and
iteration. Labels such as `eval-Pass` and `eval-Fail`, if synchronized for
convenience, are projections only; edited labels are never proof of a result.
Detailed evidence belongs to the underlying check, deployment, and evaluation
records, linked from the issue.

Provide a developer board and a manager view showing environment, result,
flagged items, iteration, and next action. Use GitHub's built-in burn-up and
create a remaining-work-over-time view where supported. Verify whether its
filters and historical semantics provide the requested burndown before
describing it as one; otherwise document a separate reporting approach.
Archived or deleted items are not retained in Project insights.

## State and transitions

The normal progress path is:

`Backlog -> Doing -> Ready -> Dev -> Stage -> Prod -> Done`

Enabled environments determine which environment stages appear in the actual
release path. Skipped environments are recorded as not applicable, never as
passed. `Canceled` can be requested at any point; `Flagged` represents a
blocked item needing human intervention.

Within Doing, distinguish coding, tests running, failed, and passed via fields
and check evidence rather than separate columns. A trusted CI run moves an
eligible item into testing. Passing the required checks for the current
commit makes it Ready; failing checks create a remediation request. Editing
the issue, moving a card, or adding a label must not create passing evidence.
Fix-and-retest cycles stay inside Doing; a manual move to Backlog does not
undo the trusted lifecycle.

Release stages expose deployment, evaluation, pass, fail, and approval
substates without multiplying board columns. Each stage requires successful
deployment and the configured evaluations before the next stage is eligible.
An authorized human explicitly requests the next enabled stage. Once
Production deployment and evaluations pass, an authorized human may move the
item to Done. A manual project-field change is not by itself evidence that a
transition was permitted or completed.

Project fields are editable by project users and cannot enforce these rules.
The eventual authenticated, durable release service is authoritative; project
fields are a reconciled view. Invalid or stale changes must not trigger
deployment and should be corrected or clearly flagged. Until this service
exists, do not claim that backward transitions are technically prevented.

## Developer quality automation

Preserve the existing CI and `npm run check` quality gates: Python lint,
format and type checks, Node type checks, unit and local PostgreSQL integration
tests, coverage thresholds, schema validation, and OpenAPI snapshot checks.
CI also runs a dependency audit. Report the existing Node coverage accurately:
it combines unit and integration tests and is not unit-only coverage.

Add fast, actionable PR feedback with annotations and links to failing runs;
avoid copying secrets, inference data, or sensitive provider responses into
issues. Where practical, identify affected checks and changed-code coverage
without skipping required full gates or mistaking skipped checks for passes.
Preserve exact commit and workflow identity when synchronizing results.

Offer automated dependency-update PRs and supported secret and code scanning
when repository permissions and plan permit. Surface flaky tests separately;
do not silently retry them into a passing security or production gate.
Remediation agents may propose focused fixes and run checks, but changes still
require normal review and cannot bypass branch or environment protections.
Local hooks are optional and must not replace CI or modify a developer's
environment without consent.

## Deployment and immutable evidence

For Dev, support a feature-branch preview in an isolated non-production
environment. Preview code and its artifacts are untrusted: they must not
receive production credentials or alter protected environments.

After merge, create a sealed release from the final merged commit. Run the
required checks and evaluations against that exact release in a safe
non-production environment before promotion; preview evidence from a
different artifact does not satisfy this requirement. Stage and Production
use the same artifact digest and release identity; promotion does not rebuild
source.
Changing the commit, artifact, policy, environment configuration, or
evaluation suite invalidates affected prior evidence and requires the
relevant checks to run again.

Repository configuration selects enabled environments and evaluation
thresholds through a reviewed change. Skipping Stage must not waive
Production requirements: a sealed release, current unit-test evidence,
required security and governance checks, approved environment protection, and
passing evaluation evidence for the same release remain mandatory. A
production-only configuration must still provide a safe non-production
evaluation path before a production promotion is allowed.

For the current personal-account-owned repository, use an explicit
Deploy/Promote workflow action as the human request and synchronize the
project from trusted results. GitHub documents the Projects v2 item webhook
for organization-level projects; do not assume a personal project card move
can trigger equivalent automation. An organization-owned project may later
use a GitHub App webhook to request the same protected operation, without
changing the authorization rules.

Deployment must use a trusted workflow definition and exact, verified release
identity. It must not execute arbitrary issue content or untrusted branch
workflow code with privileged credentials. Required GitHub Environment
protections and any release policy are checked before credentials are issued;
missing protections or ambiguous authorization fail closed. Serialize
conflicting deployments and deduplicate repeated requests and webhook events.
The Project and issue labels never grant privileges.

## Failure, remediation, and cancellation

Track failed authorized attempts per issue, environment, and phase across
corrective commits until a human explicitly resets the counter. Count actual
failed test, deployment, or evaluation runs once each; do not count duplicate
notifications or canceled runs. After three failures in a phase, flag the
issue, stop automated retries, and expose evidence and the next required
action. A human may inspect, reset, or cancel it; reset must be auditable.

Before that limit, request a scoped agent investigation and code fix through
a linked pull request when an authorized agent integration is configured.
Agents do not receive production secrets, bypass checks, directly change
production, or automatically approve their own release. If an agent is
unavailable, record the failure and require human intervention rather than
claiming a fix occurred. A failed stage remains visible in that stage while
its linked remediation work is underway.

Cancellation prevents new attempts and requests cancellation of in-flight
work. Cancellation cannot guarantee an already-running external deployment
stopped and does not automatically roll back an already deployed release;
operators must be shown its actual state and use a separately authorized
rollback if necessary.

## Verification and delivery

Validate issue form syntax and required fields, project setup idempotency,
auto-add behavior, state projection, permitted and rejected transitions,
optional environments, stale evidence, retry counts, cancellation,
duplicate/out-of-order events, and authorization failure. Test deployment
requests against untrusted issue input, missing approvals and missing
protections. Integration with a real GitHub Project and GitHub/Azure/Foundry
requires appropriate accounts and dedicated test resources; simulated checks
must be labeled as such.

Do not claim real issue-to-production automation or a completed burndown chart
until the relevant live integration has been configured and verified. Keep
platform limitations, administrator setup, permissions, and recovery steps
visible in developer documentation.
