# Handoff to Another Tool

Transfer current work context to the other AI coding tool (Claude Code <-> Codex CLI).

## Instructions

When the user invokes `/handoff <target>` or says "handoff claude" / "handoff codex", perform the following steps:

### 1. Determine Handoff Direction

- If target is `codex`: preparing handoff FROM Claude Code TO Codex CLI
- If target is `claude`: preparing handoff FROM Codex CLI TO Claude Code
- If no target specified, ask the user which tool they want to hand off to

### 2. Save Current Session First

Before generating the handoff, save the current session (follow the `/save` procedure):
- Collect all work done
- Save session JSON to `.omh/sessions/<current-tool>/`
- Update session index

### 3. Generate Handoff Document

Create a comprehensive handoff document using the handoff template. Include:

**Context Summary**: A clear description of what was being worked on and why.

**Completed Work**: Everything that was finished in this session, with enough detail for the receiving tool to understand what was done.

**Pending Work**: All remaining tasks, ordered by priority. Each task should have enough context to be actionable without reading the full history.

**Key Decisions**: Any architectural or design decisions made during this session that the receiving tool must respect.

**Key Files**: List the most important files with a brief note about why they matter for the pending work.

**Architecture Notes**: Any system design context that is not obvious from the code alone.

**Recommended Agents**: Based on the pending work, suggest which agents the receiving tool should activate.

**Recommended Workflow**: Suggest the best workflow (ralplan, autopilot, ultrawork, ralph, team) for the receiving tool.

**Environment Notes**: Git branch, last commit, build status, test status.

**Warnings / Blockers**: Anything that might trip up the receiving tool.

### 4. Save Handoff Document

Write the handoff document to:
- `.omh/sessions/handoff/claude-to-codex.md` (when handing off to Codex)
- `.omh/sessions/handoff/codex-to-claude.md` (when handing off to Claude)

### 5. Update Shared Memory

Update `.omh/shared-memory/`:
- Append any new decisions to `decisions.json`
- Update task progress in `progress.json`
- Refresh `context.md` with the current state

### 6. Prepare Target Tool Context

If handing off to Codex:
- Ensure `AGENTS.md` in the project root references the handoff document
- Note any Codex-specific considerations (parallel execution, sandboxing)

If handing off to Claude:
- Ensure `CLAUDE.md` in the project root references the handoff document
- Note any Claude-specific considerations (opus reasoning, deep analysis)

### 7. Confirm Handoff

Tell the user:
- Handoff document saved at `<path>`
- Number of completed tasks being passed along
- Number of pending tasks for the receiving tool
- Recommended workflow for the receiving tool
- How to start the receiving tool:
  - For Codex: `codex` (it will read AGENTS.md and the handoff document)
  - For Claude: `claude` (it will read CLAUDE.md and the handoff document)
- Remind them to say "continue" in the receiving tool to pick up the work
