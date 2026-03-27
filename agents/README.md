# oh-my-hermes Agent Catalog

Complete reference for all 28 agents available in the oh-my-hermes expert team system.

---

## Overview

The agent catalog defines specialized AI personas, each with a specific domain expertise, model tier, and tool mapping. Agents are organized into 9 teams that can be assembled dynamically based on the task at hand.

### Model Tiers

| Tier | Use Case | Agents |
|------|----------|--------|
| **opus** | Deep reasoning, architecture, security analysis, critical review | 11 agents |
| **sonnet** | Balanced implementation, testing, optimization, documentation | 14 agents |
| **haiku** | Fast verification, simple testing, build checks | 3 agents |

### Tool Mapping

| Tool | Best For | Agents Run As |
|------|----------|---------------|
| **Claude Code** | Deep reasoning, architecture design, code review, bug analysis | Sequential, opus-powered |
| **Codex CLI** | Parallel implementation, multi-file changes, test execution | Parallel, sandboxed |

---

## Teams

### 1. Architecture Team

Design scalable systems with fault tolerance and deployment automation.

| Agent | Model | Claude (omc) | Codex (omx) | When to Use |
|-------|-------|-------------|-------------|-------------|
| architect | opus | architect | architect | System design, component boundaries, data flow |
| ha-specialist | sonnet | ha-specialist | ha-specialist | Redundancy, failover, disaster recovery |
| devops | sonnet | devops | devops | CI/CD, Docker, K8s, IaC, deployment |

**Trigger**: "design architecture", "system design", "설계"
**Tool**: Claude (opus reasoning for design)

### 2. Backend Team

Build APIs, optimize performance, integrate exchange/trading systems.

| Agent | Model | Claude (omc) | Codex (omx) | When to Use |
|-------|-------|-------------|-------------|-------------|
| api-architect | opus | api-architect | api-architect | REST/GraphQL API design, validation, error handling |
| perf-engineer | sonnet | perf-engineer | perf-engineer | Profiling, benchmarks, speed optimization |
| exchange-specialist | sonnet | exchange-specialist | exchange-specialist | Exchange APIs, WebSocket feeds, order management |

**Trigger**: "api", "backend", "server", "백엔드"
**Tool**: Claude for design, Codex for implementation

### 3. Frontend Team

Create user interfaces, dashboards, and data visualizations.

| Agent | Model | Claude (omc) | Codex (omx) | When to Use |
|-------|-------|-------------|-------------|-------------|
| ux-designer | opus | ux-designer | ux-designer | UI/UX design, interaction flows, component hierarchy |
| react-dev | sonnet | react-dev | react-dev | React/Next.js components, hooks, state management |
| dashboard-specialist | sonnet | dashboard-specialist | dashboard-specialist | Charts, real-time displays, monitoring UIs |

**Trigger**: "frontend", "ui", "dashboard", "프론트엔드"
**Tool**: Claude for design, Codex for component implementation

### 4. Integration Team

Connect systems, secure data, design database schemas.

| Agent | Model | Claude (omc) | Codex (omx) | When to Use |
|-------|-------|-------------|-------------|-------------|
| saas | sonnet | saas | saas | Multi-tenant, billing, onboarding, rate limiting |
| security | opus | security | security | Auth/authz, encryption, vulnerability audits |
| db-architect | sonnet | db-architect | db-architect | Schemas, migrations, query optimization, indexing |

**Trigger**: "integrate", "database", "auth", "통합"
**Tool**: Claude for security/design, Codex for implementation

### 5. QA Team

Write tests, execute test suites, verify builds.

| Agent | Model | Claude (omc) | Codex (omx) | When to Use |
|-------|-------|-------------|-------------|-------------|
| test-engineer | sonnet | test-engineer | test-engineer | Unit/integration/e2e tests, coverage strategy |
| qa-tester | haiku | qa-tester | qa-tester | Test execution, bug reports, edge cases |
| verifier | haiku | verifier | verifier | Build validation, compilation checks |

**Trigger**: "test", "qa", "coverage", "테스트"
**Tool**: Codex (parallel test execution)

### 6. Optimization Team

Improve performance, simplify code, design algorithms.

| Agent | Model | Claude (omc) | Codex (omx) | When to Use |
|-------|-------|-------------|-------------|-------------|
| perf-engineer | sonnet | perf-engineer | perf-engineer | Profiling, benchmarks (shared with Backend) |
| code-simplifier | sonnet | code-simplifier | code-simplifier | Complexity reduction, dead code elimination |
| scientist | opus | scientist | scientist | Algorithm design, complexity analysis |

**Trigger**: "optimize", "performance", "refactor", "최적화"
**Tool**: Claude for analysis, Codex for implementation

### 7. Bug Team

Diagnose issues, fix builds, analyze root causes.

| Agent | Model | Claude (omc) | Codex (omx) | When to Use |
|-------|-------|-------------|-------------|-------------|
| debugger | opus | debugger | debugger | Execution tracing, state inspection, isolation |
| build-fixer | sonnet | build-fixer | build-fixer | Compilation errors, dependency conflicts |
| root-cause-analyst | opus | root-cause-analyst | root-cause-analyst | Deep causal analysis of failures |

**Trigger**: "bug", "fix", "error", "debug", "버그"
**Tool**: Claude (opus deep reasoning for diagnosis)

### 8. Planning Team

Plan projects, analyze requirements, critique designs.

| Agent | Model | Claude (omc) | Codex (omx) | When to Use |
|-------|-------|-------------|-------------|-------------|
| planner | opus | planner | planner | Task breakdown, milestones, execution plans |
| analyst | sonnet | analyst | analyst | Requirements analysis, gap identification |
| critic | opus | critic | critic | Risk identification, design challenges |

**Trigger**: "plan", "roadmap", "requirements", "계획"
**Tool**: Claude (opus reasoning for planning)

### 9. Review Team

Review code quality, security posture, and standard compliance.

| Agent | Model | Claude (omc) | Codex (omx) | When to Use |
|-------|-------|-------------|-------------|-------------|
| code-reviewer | opus | code-reviewer | code-reviewer | Code quality, patterns, SOLID principles |
| security-reviewer | opus | security-reviewer | security-reviewer | Injection, auth bypasses, data leaks |
| quality-reviewer | sonnet | quality-reviewer | quality-reviewer | Test coverage, docs, coding standards |

**Trigger**: "review", "audit", "리뷰"
**Tool**: Claude (opus analysis for review)

---

## Specialist Agents

These agents operate independently of team structures and can be added to any team.

| Agent | Model | When to Use |
|-------|-------|-------------|
| doc-writer | sonnet | API docs, READMEs, architecture documentation |
| migrator | sonnet | Database migrations, dependency upgrades, API versioning |
| refactorer | sonnet | Code restructuring, modularity improvements |

---

## Quick Reference: When to Use Which Tool

### Use Claude Code When:
- Designing architecture (opus reasoning)
- Debugging complex issues (deep causal analysis)
- Reviewing code for security issues (pattern recognition)
- Planning projects (strategic thinking)
- Analyzing requirements (critical evaluation)

### Use Codex CLI When:
- Implementing features across multiple files (parallel agents)
- Writing test suites (parallel test creation)
- Performing large refactoring (multi-file parallel changes)
- Executing build/test verification (parallel execution)
- Applying repetitive changes across codebase (parallel processing)

### Use Both (Handoff) When:
- Complex features: Claude designs, Codex implements, Claude reviews
- Large migrations: Claude plans, Codex executes, Claude verifies
- Full-stack features: Claude architects, Codex builds frontend + backend in parallel

---

## Activation

In Claude Code (CLAUDE.md):
```
얘들아 부탁해          # Activate team system
team assemble         # English equivalent
@architect            # Invoke specific agent
team: a, b, c - task  # Explicit team assembly
```

In Codex CLI (AGENTS.md):
```
얘들아 부탁해          # Activate team system
$team                 # Shell alias
@architect            # Invoke specific agent
$tm: a, b, c - task   # Explicit team assembly
```
