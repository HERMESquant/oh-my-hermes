# Continue Last Session

Resume from the most recent saved session.

## Instructions

When the user invokes `/continue` or says "continue", perform the following steps:

### 1. Find Latest Session

Read `.omh/sessions/index.json` and find the most recent session entry for the current tool:
- If running in Claude Code: look for the latest `"tool": "claude"` entry
- If running in Codex CLI: look for the latest `"tool": "codex"` entry
- If no sessions exist, also check for handoff documents in `.omh/sessions/handoff/`

### 2. Load Session Data

Read the session JSON file referenced in the index entry. Extract:
- `tasksCompleted` - what was already done
- `tasksPending` - what still needs to be done
- `filesModified` - files that were changed (verify they still exist)
- `decisions` - architectural decisions to maintain consistency
- `agentsUsed` - which agents were active
- `workflow` - which workflow was in progress
- `nextSteps` - recommended next actions
- `errors` - any unresolved issues

### 3. Check for Handoff Documents

Also check `.omh/sessions/handoff/` for any handoff documents from the other tool:
- `codex-to-claude.md` if running in Claude Code
- `claude-to-codex.md` if running in Codex CLI

If a handoff document exists and is newer than the last session, prioritize it.

### 4. Load Shared Memory

Read `.omh/shared-memory/` for cross-tool context:
- `decisions.json` - latest architectural decisions
- `progress.json` - overall task completion status
- `context.md` - current project context

### 5. Restore Context

Present the user with a summary:
- What was completed in the last session
- What is pending / next steps
- Any relevant handoff notes from the other tool
- Active workflow and complexity level

### 6. Resume Work

Ask the user which pending task they want to continue with, or if they want to start something new. If the previous session had a workflow in progress (ralplan, autopilot, ultrawork, ralph, team), offer to resume that workflow from where it left off.

### 7. Re-activate Agents

If the previous session had active agents, offer to re-activate them:
- "Last session used: architect (opus), test-engineer (sonnet), verifier (haiku)"
- "Would you like to continue with the same team?"
