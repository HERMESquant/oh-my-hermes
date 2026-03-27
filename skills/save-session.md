# Save Session

Save the current session state to `.omh/sessions/` for later resumption or handoff.

## Instructions

When the user invokes `/save` or says "save", perform the following steps:

### 1. Collect Session Data

Gather all work done in this session:
- List all files modified or created during this session
- Summarize each task that was completed
- Note any pending tasks or unfinished work
- Record architectural decisions made
- List agents that were invoked and their contributions
- Note the workflow used (ralplan, autopilot, ultrawork, ralph, team)

### 2. Determine Tool and Session Path

- If running in Claude Code: save to `.omh/sessions/claude/`
- If running in Codex CLI: save to `.omh/sessions/codex/`
- Use timestamp format: `YYYY-MM-DD_HH-MM.json`

### 3. Create Session File

Write a JSON file with the following structure:

```json
{
  "sessionId": "<timestamp-based-id>",
  "tool": "claude|codex",
  "project": "<project-name>",
  "date": "<ISO-8601>",
  "duration": "<estimated-duration>",
  "tasksCompleted": ["<task-1>", "<task-2>"],
  "tasksPending": ["<pending-1>"],
  "filesModified": ["<file-1>", "<file-2>"],
  "filesCreated": ["<file-1>"],
  "decisions": ["<decision-1>"],
  "agentsUsed": [{"name": "<agent>", "model": "<model>", "contribution": "<what-they-did>"}],
  "workflow": "<workflow-name>",
  "complexity": "low|medium|high",
  "errors": [],
  "nextSteps": ["<next-1>"]
}
```

### 4. Update Session Index

Read `.omh/sessions/index.json` (create if it does not exist) and append a new entry:

```json
{
  "sessions": [
    {
      "id": "<session-id>",
      "tool": "claude|codex",
      "date": "<ISO-8601>",
      "summary": "<one-line-summary>",
      "file": "<relative-path-to-session-file>"
    }
  ]
}
```

### 5. Generate Summary

Also write a human-readable markdown summary using the session-summary template at `.omh/sessions/<tool>/YYYY-MM-DD_HH-MM.md`.

### 6. Confirm

Tell the user:
- Session saved successfully
- Session ID
- Number of tasks completed / pending
- Path to session file
- Remind them they can use `/continue` to resume or `/handoff` to transfer to another tool
