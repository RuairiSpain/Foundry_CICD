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

## Compatibility matrix record

Maintain machine-readable `compatibility.yaml` with SDK package/version, API version, feature, Foundry agent type, deployment mode, Azure region constraints, preview/GA state, validation date, source URL and test fixture. A stale/unknown entry produces an actionable block for Production when the feature is mandatory.

## Preview policy

Preview capabilities are disabled for Production unless the project explicitly records risk acceptance, support expectation, owner and expiry/review date. Adapter and feature flag must allow replacement without changing the domain contract.

## Context7 note

The documentation workflow should query Context7 for FastAPI, Pydantic, TypeScript, Playwright and other third-party library APIs. During creation of this blueprint, Context7 required sign-in and could not be queried; therefore this package intentionally avoids hard-coded third-party versions and requires implementation-time validation.
