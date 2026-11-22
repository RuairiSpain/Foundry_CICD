# ADR-0001: language and service boundaries

Status: Accepted

Use Python 3.13+, FastAPI and Pydantic v2 for control-plane, Foundry, governance, policy and workers. Use TypeScript for GitHub App edge logic and UI. Exchange versioned OpenAPI/JSON Schema contracts; generated clients are outputs, not hand-edited sources.

Rationale: Python aligns with Foundry/governance SDK work; TypeScript aligns with GitHub App/UI ecosystems. The contract boundary prevents duplicated domain rules. A vertical slice may co-deploy components but cannot collapse ownership.
