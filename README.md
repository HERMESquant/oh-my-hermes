# OH-MY-HERMES (OMH)

> **Unified multi-agent orchestration for Claude Code + Codex CLI.**
> One setup. Both tools. Seamless handoff.

<p align="center">
  <strong>oh-my-claudecode (OMC)</strong> + <strong>oh-my-codex (OMX)</strong> = <strong>oh-my-hermes (OMH)</strong>
</p>

---

## Why OMH?

| Problem | OMH Solution |
|---------|-------------|
| OMC only works with Claude Code | OMH sets up **both** Claude Code and Codex CLI |
| OMX only works with Codex CLI | Unified config, shared context |
| No session continuity across tools | **Session save/restore/handoff** between tools |
| Manual expert assignment | **Smart team routing** - auto-assigns the right tool & agents |
| Duplicate setup work | **One command** configures everything |

## Quick Start

```bash
# Install
npm install -g oh-my-hermes

# Setup your project
cd your-project
omh setup

# Check health
omh doctor
```

## Features

### 1. Unified Setup

`omh setup` detects your project stack and creates:

| File | Purpose |
|------|---------|
| `CLAUDE.md` | Claude Code instructions (expert teams, magic keywords, agents) |
| `AGENTS.md` | Codex CLI instructions (equivalent config) |
| `.claude/settings.local.json` | Claude Code permissions & hooks |
| `.omh/config.json` | OMH unified configuration |
| `.omh/sessions/` | Cross-tool session storage |
| `.omh/shared-memory/` | Shared project context |

### 2. Session Management

```bash
omh save                  # Save current session
omh save --tool codex     # Save Codex session specifically
omh continue              # Resume last session (any tool)
omh sessions              # List all sessions
omh handoff codex         # Hand work from Claude to Codex
omh handoff claude        # Hand work from Codex to Claude
```

Sessions are stored separately per tool but indexed together:

```
.omh/sessions/
├── index.json              # Unified index
├── claude/                 # Claude Code sessions
│   ├── session_2026-03-27.json
│   └── session_2026-03-27_summary.md
├── codex/                  # Codex CLI sessions
│   └── ...
└── handoff/                # Cross-tool handoff documents
    └── 2026-03-27_claude-to-codex.md
```

### 3. Expert Team System

Say **"얘들아 부탁해"** (or use English triggers) to summon expert teams:

| Request Type | Teams Activated | Optimal Tool |
|-------------|----------------|-------------|
| Architecture/Design | Architecture + Planning | Claude (Opus) |
| Implementation | Backend + Execution | Codex (parallel) |
| Bug Analysis | Bug + Backend + QA | Claude (Opus) |
| Code Review | Review + Security | Claude (Opus) |
| Testing | QA + Optimization | Codex (parallel) |
| Refactoring | Optimization + Backend | Codex (multi-file) |

### 4. Magic Keywords

Works in **both** Claude Code and Codex CLI:

| Keyword | Action | Agents |
|---------|--------|--------|
| `ralplan` | Consensus planning | planner → architect → critic loop |
| `autopilot` | Autonomous build | planner → executor → verifier loop |
| `ultrawork` / `ulw` | Max parallelism | Multiple executors in parallel |
| `ralph` / `don't stop` | Run until done | executor → verifier infinite loop |
| `team N` | N-agent collaboration | N executors + verifier |

### 5. Smart Tool Routing

OMH automatically assigns work to the best tool:

| Task Type | Best Tool | Why |
|-----------|----------|-----|
| Complex reasoning, design | **Claude** (Opus) | Superior reasoning |
| Parallel file modifications | **Codex** | Parallel agent execution |
| Security/code review | **Claude** (Opus) | Deep analysis |
| Repetitive test execution | **Codex** | Fast parallel runners |
| Documentation | **Claude** | Natural language strength |
| Large refactoring | **Codex** | Multi-file simultaneous edits |

### 6. 28+ Agent Catalog

| Category | Agents | Models |
|----------|--------|--------|
| **Build/Analysis** | architect, planner, analyst, critic, explore | opus/haiku |
| **Execution** | executor, deep-executor, verifier, debugger, build-fixer | sonnet/opus |
| **Review** | code-reviewer, security-reviewer, quality-reviewer | opus/sonnet |
| **Domain** | test-engineer, designer, scientist, writer, qa-tester, git-master | sonnet/haiku |

## CLI Reference

```
Usage: omh [command] [options]

Commands:
  setup       Interactive project setup (detect tools, create configs)
  doctor      Check if omc/omx/claude/codex are installed
  status      Show project status (configured tools, last session)
  save        Save current session (--tool claude|codex)
  continue    Continue last session
  handoff     Handoff from one tool to another (claude|codex)
  sessions    List all sessions
  version     Show version

Options:
  -v, --version  Show version
  -h, --help     Show help
```

## How It Works

```
                    OMH (oh-my-hermes)
                         │
              ┌──────────┴──────────┐
              │                     │
        OMC (Claude)          OMX (Codex)
              │                     │
        .claude/              .codex/
        CLAUDE.md             AGENTS.md
        .omc/                 .omx/
              │                     │
              └──────────┬──────────┘
                         │
                    .omh/
                  ├── sessions/        (unified session index)
                  ├── shared-memory/   (cross-tool context)
                  └── config.json      (OMH settings)
```

### Handoff Flow

```
Claude Code session
    ↓
omh handoff codex
    ↓
Auto-save Claude session → Generate handoff doc → Inject into Codex context
    ↓
Codex continues seamlessly
```

## Requirements

- **Node.js** >= 20.0.0
- **Claude Code CLI** (for Claude features)
- **Codex CLI** (for Codex features)
- **oh-my-claudecode** >= 4.0.0 (optional, for advanced Claude orchestration)
- **oh-my-codex** >= 0.10.0 (optional, for advanced Codex orchestration)

## Compatibility

| Tool | Config Dir | Instruction File | State Dir | Conflict? |
|------|-----------|-----------------|----------|-----------|
| Claude Code | `.claude/` | `CLAUDE.md` | `.omc/` | None |
| Codex CLI | `.codex/` | `AGENTS.md` | `.omx/` | None |
| OMH | `.omh/` | Both | `.omh/` | None |

All three tools use completely separate directories. **Zero conflicts.**

## Project Structure

```
oh-my-hermes/
├── src/
│   ├── cli/omh.ts              # CLI entry point
│   ├── shared/
│   │   ├── constants.ts        # Shared constants
│   │   ├── detect.ts           # Tool/stack detection
│   │   └── utils.ts            # Utilities
│   ├── session/
│   │   ├── manager.ts          # Session CRUD + handoff
│   │   └── shared-memory.ts    # Cross-tool shared memory
│   ├── installer/
│   │   ├── setup.ts            # Setup wizard + doctor + status
│   │   └── template-engine.ts  # CLAUDE.md / AGENTS.md generation
│   └── team/
│       ├── router.ts           # Smart tool/team routing
│       └── agents.ts           # 28+ agent definitions
├── templates/
│   ├── claude/CLAUDE.md.template
│   ├── codex/AGENTS.md.template
│   └── shared/
│       ├── session-summary.md.template
│       └── handoff.md.template
├── skills/                     # Claude Code slash commands
│   ├── save-session.md
│   ├── continue-last.md
│   └── handoff.md
├── agents/README.md            # Agent catalog docs
└── docs/                       # Documentation
```

## Credits

- [oh-my-claudecode](https://github.com/yeachan-heo/oh-my-claudecode) by Yeachan Heo
- [oh-my-codex](https://github.com/Yeachan-Heo/oh-my-codex) by Yeachan Heo

## License

MIT
