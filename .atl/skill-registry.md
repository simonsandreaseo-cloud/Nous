# Skill Registry — nous_2.0

## Project Conventions
- **AGENTS.md**: Persona (Senior Architect), Workflow Protocol (Memory, Skills, SDD), and Project Standards (Rich Aesthetics, Next.js 16 + React 19, Clean Code).
- **openspec/config.yaml**: SDD V3.0 configuration with Strict TDD Mode enabled.

## Active Skills

| Skill | Description | Trigger |
|-------|-------------|---------|
| `issue-creation` | Issue creation workflow for Agent Teams Lite following the issue-first enforcement system. | When creating a GitHub issue, reporting a bug, or requesting a feature. |
| `branch-pr` | PR creation workflow for Agent Teams Lite following the issue-first enforcement system. | When creating a pull request, opening a PR, or preparing changes for review. |
| `skill-creator` | Creates new AI agent skills following the Agent Skills spec. | When user asks to create a new skill, add agent instructions, or document patterns for AI. |
| `go-testing` | Go testing patterns for Gentleman.Dots, including Bubbletea TUI testing. | When writing Go tests, using teatest, or adding test coverage. |
| `judgment-day` | Parallel adversarial review protocol. | When user says "judgment day", "review adversarial", etc. |
| `sdd-init` | Initialize SDD context. | SDD initialization. |
| `sdd-explore` | Investigation phase. | Exploration topic. |
| `sdd-propose` | Proposal phase. | Change proposal. |
| `sdd-spec` | Specification phase. | Delta specs. |
| `sdd-design` | Design phase. | Technical design. |
| `sdd-tasks` | Task breakdown. | Task checklist. |
| `sdd-apply` | Implementation phase. | Implement changes. |
| `sdd-verify` | Verification phase. | Validate against spec. |
| `sdd-archive` | Archive phase. | Close change. |

## Testing Infrastructure
- **Runner**: Vitest
- **E2E**: Playwright
- **Strict TDD**: Enabled ✅
