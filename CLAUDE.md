# Claude Code project instructions

Use `AGENTS.md` and `.github/copilot-instructions.md` as shared rules. Product/architecture truth lives in `docs/`; this file does not duplicate it.

For multi-step work, delegate to the project subagents in `.claude/agents/` according to `docs/agents/ORCHESTRATION.md`. The `project-orchestrator` is the entry point for backlog work. Give subagents a validated task contract and only relevant paths. Parallelize only disjoint write scopes.

Do not bypass repository permissions, test/coverage/security gates or task scope. Autonomous merge is allowed only through the configured protected process after all evidence passes. Full real-system browser E2E runs in Phase 9 only.
