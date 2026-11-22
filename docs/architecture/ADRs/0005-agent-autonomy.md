# ADR-0005: fully autonomous coding agents with deterministic gates

Status: Accepted

The orchestrator and specialists may implement and merge successful PRs without routine human intervention. Autonomy is bounded by task contracts, file scope, architecture, required checks, branch/ruleset protections, environment protections and two repair attempts. Agents cannot bypass controls or weaken tests. Architecture/permission/dependency changes require machine-verifiable evidence and an ADR where applicable; repository policy may still require designated review for regulated deployments.
