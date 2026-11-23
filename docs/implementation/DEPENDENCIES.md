# Dependency and compatibility policy

## Rules

1. Use Python 3.13+ and Pydantic v2 APIs; reject Pydantic v1 compatibility patterns.
2. Use lockfiles with hashes for applications. Declare supported ranges in package metadata and resolve reviewed locks in CI.
3. Verify Azure/Foundry SDK calls against current Microsoft Learn and the installed package API before merging.
4. Verify GitHub API permissions, versions, preview headers and pagination against current GitHub Docs.
5. Generate TypeScript/Python clients from the canonical OpenAPI; do not duplicate DTOs manually.
6. Pin third-party GitHub Actions to full commit SHA in production templates; record the human-readable release in a comment and use an update bot with review gates.
7. Produce SBOM and dependency/provenance attestations for releases.
8. A new runtime dependency requires owner, purpose, license, maintenance/security assessment and alternatives.

## Initial technology families (versions resolved at implementation)

| Area | Preferred family | Verification source |
|---|---|---|
| Python API/models | FastAPI, Pydantic v2, pydantic-settings | official package docs + Context7 when available |
| Azure identity | `azure-identity` and `DefaultAzureCredential`/managed identity | Microsoft Learn |
| Foundry | current `azure-ai-projects` and supported Foundry/agent packages | Microsoft Learn SDK overview/API |
| GitHub | Octokit libraries or a thin tested REST/GraphQL client | GitHub Docs/OpenAPI |
| Persistence | SQLAlchemy 2 async + Alembic or approved equivalent | official docs |
| Tests | pytest, pytest-cov, Hypothesis, Playwright | official docs |
| TypeScript | Node LTS, strict TypeScript, chosen web framework | official docs |
| IaC | current Bicep CLI and Azure verified modules where appropriate | Microsoft Learn |

## Foundation-only dependencies

- The GitHub Environment inspection adapter uses the read-only REST endpoint:
  <https://docs.github.com/en/rest/deployments/environments#get-an-environment>.
  Rule availability depends on the repository's plan and visibility. The
  adapter does not prove deployment eligibility or verify branch patterns.
- The GitHub installation inspection adapter uses the App-authenticated REST
  endpoint documented at <https://docs.github.com/en/rest/apps/apps#get-an-installation-for-the-authenticated-app>.
  It does not cache, authorize users, or verify repository selection.
- The GitHub Checks adapter implements the create and update endpoints using
  the versioned REST API. GitHub requires a GitHub App with Checks write access:
  <https://docs.github.com/en/rest/checks/runs?apiVersion=2022-11-28>.
  The adapter is not connected to the worker or verified against a real App.
  A creation request with an uncertain result must be reconciled before retry.
  The read-only lookup returns all matching IDs it sees and rejects inconsistent
  pagination, but GitHub can omit older check suites and concurrent mutations
  can change the listing. An empty lookup does not prove a retry is safe; no
  automatic duplicate prevention is implemented.
- `pg8000` is used by the local demonstration worker and integration tests.
  Its pure-Python distribution supports the local Windows ARM development
  environment. Production persistence and its driver choice remain unapproved.
- `c8` measures the combined Node unit and integration test coverage. Its
  development-only `test-exclude` dependencies are overridden to patched
  `glob` and `minimatch` releases; re-evaluate these overrides when upstream
  supports the patched versions.

## Compatibility matrix record

Maintain machine-readable `compatibility.yaml` with SDK package/version, API version, feature, Foundry agent type, deployment mode, Azure region constraints, preview/GA state, validation date, source URL and test fixture. A stale/unknown entry produces an actionable block for Production when the feature is mandatory.

## Preview policy

Preview capabilities are disabled for Production unless the project explicitly records risk acceptance, support expectation, owner and expiry/review date. Adapter and feature flag must allow replacement without changing the domain contract.

## Context7 note

The documentation workflow should query Context7 for FastAPI, Pydantic, TypeScript, Playwright and other third-party library APIs. During creation of this blueprint, Context7 required sign-in and could not be queried; therefore this package intentionally avoids hard-coded third-party versions and requires implementation-time validation.
