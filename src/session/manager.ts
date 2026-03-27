// ─── oh-my-hermes session manager ───────────────────────────────────────────
//
// Core session management that works across Claude Code and Codex CLI.
// Sessions are stored per-project under .omh/sessions/{tool}/{id}.json with
// a central index at .omh/sessions/index.json for fast look-ups.
// ─────────────────────────────────────────────────────────────────────────────

import { readdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { randomUUID } from 'node:crypto';

import {
  OMH_DIR,
  OMC_DIR,
  OMX_DIR,
  CLAUDE_DIR,
  SESSION_INDEX,
  TOOLS,
} from '../shared/constants.js';

import {
  ensureDir,
  readJsonSafe,
  writeJson,
  timestamp,
  shortTimestamp,
  resolveOmhDir,
} from '../shared/utils.js';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface Session {
  id: string;
  tool: 'claude' | 'codex';
  startedAt: string;
  endedAt?: string;
  project: string;
  summary?: string;
  filesModified: string[];
  tasksCompleted: string[];
  tasksPending: string[];
  decisions: string[];
  nextSteps: string[];
}

export interface SessionIndexEntry {
  tool: string;
  date: string;
  summary: string;
  path: string;
}

export interface SessionIndex {
  lastSession?: string;
  sessions: Record<string, SessionIndexEntry>;
}

export interface HandoffDocument {
  from: 'claude' | 'codex';
  to: 'claude' | 'codex';
  timestamp: string;
  context: string;
  filesModified: string[];
  tasksCompleted: string[];
  tasksPending: string[];
  decisions: string[];
  warnings: string[];
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function sessionsDir(projectDir: string, tool: 'claude' | 'codex'): string {
  return join(resolveOmhDir(projectDir), 'sessions', tool);
}

function sessionFilePath(projectDir: string, tool: 'claude' | 'codex', id: string): string {
  return join(sessionsDir(projectDir, tool), `${id}.json`);
}

function sessionMdPath(projectDir: string, tool: 'claude' | 'codex', id: string): string {
  return join(sessionsDir(projectDir, tool), `${id}.md`);
}

function indexPath(projectDir: string): string {
  return join(resolveOmhDir(projectDir), SESSION_INDEX);
}

// ─── Session Index ──────────────────────────────────────────────────────────

/**
 * Read the session index.  Returns an empty index when no file exists.
 */
export async function getSessionIndex(projectDir: string): Promise<SessionIndex> {
  const existing = await readJsonSafe<SessionIndex>(indexPath(projectDir));
  return existing ?? { sessions: {} };
}

/**
 * Persist the session index to disk.
 */
async function saveSessionIndex(projectDir: string, idx: SessionIndex): Promise<void> {
  await writeJson(indexPath(projectDir), idx);
}

/**
 * Register (or update) a session entry in the index.
 */
export async function updateSessionIndex(
  projectDir: string,
  session: Session,
): Promise<void> {
  const idx = await getSessionIndex(projectDir);
  idx.lastSession = session.id;
  idx.sessions[session.id] = {
    tool: session.tool,
    date: session.startedAt,
    summary: session.summary ?? '',
    path: sessionFilePath(projectDir, session.tool, session.id),
  };
  await saveSessionIndex(projectDir, idx);
}

// ─── CRUD ───────────────────────────────────────────────────────────────────

/**
 * Create a new session object (not yet persisted).
 */
export async function createSession(
  projectDir: string,
  tool: 'claude' | 'codex',
): Promise<Session> {
  const id = `${shortTimestamp()}_${randomUUID().slice(0, 8)}`;
  const session: Session = {
    id,
    tool,
    startedAt: timestamp(),
    project: projectDir,
    filesModified: [],
    tasksCompleted: [],
    tasksPending: [],
    decisions: [],
    nextSteps: [],
  };
  return session;
}

/**
 * Persist a session to its JSON file, generate a companion markdown summary,
 * and update the session index.
 */
export async function saveSession(
  projectDir: string,
  session: Session,
): Promise<void> {
  // Ensure target directory exists
  await ensureDir(sessionsDir(projectDir, session.tool));

  // Write JSON
  await writeJson(sessionFilePath(projectDir, session.tool, session.id), session);

  // Write human-readable markdown
  const md = generateSummaryMarkdown(session);
  await writeFile(sessionMdPath(projectDir, session.tool, session.id), md, 'utf-8');

  // Update the index
  await updateSessionIndex(projectDir, session);
}

/**
 * Load the most recent session, optionally filtered by tool.
 * Returns `null` when no matching session exists.
 */
export async function loadLastSession(
  projectDir: string,
  tool?: 'claude' | 'codex',
): Promise<Session | null> {
  const idx = await getSessionIndex(projectDir);
  if (!idx.lastSession && Object.keys(idx.sessions).length === 0) {
    return null;
  }

  // If a tool filter is provided, find the latest session for that tool.
  if (tool) {
    const entries = Object.entries(idx.sessions)
      .filter(([, v]) => v.tool === tool)
      .sort(([, a], [, b]) => b.date.localeCompare(a.date));

    if (entries.length === 0) return null;
    const [, entry] = entries[0];
    return readJsonSafe<Session>(entry.path);
  }

  // No filter: use the global lastSession pointer, or fall back to the most recent by date.
  if (idx.lastSession && idx.sessions[idx.lastSession]) {
    return readJsonSafe<Session>(idx.sessions[idx.lastSession].path);
  }

  const entries = Object.entries(idx.sessions)
    .sort(([, a], [, b]) => b.date.localeCompare(a.date));
  if (entries.length === 0) return null;
  return readJsonSafe<Session>(entries[0][1].path);
}

/**
 * List recent sessions, newest first.
 */
export async function listSessions(
  projectDir: string,
  limit: number = 20,
): Promise<SessionIndexEntry[]> {
  const idx = await getSessionIndex(projectDir);
  return Object.values(idx.sessions)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, limit);
}

// ─── Handoff ────────────────────────────────────────────────────────────────

/**
 * Create a handoff document that transfers context from one tool to another.
 *
 * The handoff is:
 *   1. Persisted as `.omh/handoffs/{from}-to-{to}_{timestamp}.md`
 *   2. Injected into the receiving tool's context directory:
 *      - Claude  -> `.claude-logs/summaries/`
 *      - Codex   -> `.omx/state/`
 */
export async function createHandoff(
  projectDir: string,
  from: 'claude' | 'codex',
  to: 'claude' | 'codex',
  context: string,
): Promise<HandoffDocument> {
  // Build the handoff from the latest sender session
  const lastSession = await loadLastSession(projectDir, from);

  const handoff: HandoffDocument = {
    from,
    to,
    timestamp: timestamp(),
    context,
    filesModified: lastSession?.filesModified ?? [],
    tasksCompleted: lastSession?.tasksCompleted ?? [],
    tasksPending: lastSession?.tasksPending ?? [],
    decisions: lastSession?.decisions ?? [],
    warnings: [],
  };

  // Persist canonical copy
  const ts = shortTimestamp();
  const handoffDir = join(resolveOmhDir(projectDir), 'handoffs');
  await ensureDir(handoffDir);
  const handoffFile = join(handoffDir, `${from}-to-${to}_${ts}.json`);
  await writeJson(handoffFile, handoff);

  // Generate markdown version
  const md = renderHandoffMarkdown(handoff);
  const handoffMdFile = join(handoffDir, `${from}-to-${to}_${ts}.md`);
  await writeFile(handoffMdFile, md, 'utf-8');

  // Inject into receiving tool's context
  if (to === TOOLS.CLAUDE) {
    const claudeLogsDir = join(projectDir, '.claude-logs', 'summaries');
    await ensureDir(claudeLogsDir);
    await writeFile(
      join(claudeLogsDir, `handoff-from-${from}_${ts}.md`),
      md,
      'utf-8',
    );
  } else if (to === TOOLS.CODEX) {
    const omxStateDir = join(projectDir, OMX_DIR, 'state');
    await ensureDir(omxStateDir);
    await writeFile(
      join(omxStateDir, `handoff-from-${from}_${ts}.md`),
      md,
      'utf-8',
    );
  }

  return handoff;
}

// ─── Markdown Generators ────────────────────────────────────────────────────

/**
 * Convert a session object into a human-readable markdown summary.
 */
export function generateSummaryMarkdown(session: Session): string {
  const lines: string[] = [];

  lines.push(`# Session Summary`);
  lines.push('');
  lines.push(`| Field | Value |`);
  lines.push(`|-------|-------|`);
  lines.push(`| **ID** | \`${session.id}\` |`);
  lines.push(`| **Tool** | ${session.tool} |`);
  lines.push(`| **Started** | ${session.startedAt} |`);
  if (session.endedAt) {
    lines.push(`| **Ended** | ${session.endedAt} |`);
  }
  lines.push(`| **Project** | ${session.project} |`);
  lines.push('');

  if (session.summary) {
    lines.push(`## Summary`);
    lines.push('');
    lines.push(session.summary);
    lines.push('');
  }

  if (session.filesModified.length > 0) {
    lines.push(`## Files Modified`);
    lines.push('');
    for (const f of session.filesModified) {
      lines.push(`- \`${f}\``);
    }
    lines.push('');
  }

  if (session.tasksCompleted.length > 0) {
    lines.push(`## Tasks Completed`);
    lines.push('');
    for (const t of session.tasksCompleted) {
      lines.push(`- [x] ${t}`);
    }
    lines.push('');
  }

  if (session.tasksPending.length > 0) {
    lines.push(`## Tasks Pending`);
    lines.push('');
    for (const t of session.tasksPending) {
      lines.push(`- [ ] ${t}`);
    }
    lines.push('');
  }

  if (session.decisions.length > 0) {
    lines.push(`## Decisions`);
    lines.push('');
    for (const d of session.decisions) {
      lines.push(`- ${d}`);
    }
    lines.push('');
  }

  if (session.nextSteps.length > 0) {
    lines.push(`## Next Steps`);
    lines.push('');
    for (const s of session.nextSteps) {
      lines.push(`- ${s}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Render a handoff document as markdown for injection into tool context.
 */
function renderHandoffMarkdown(handoff: HandoffDocument): string {
  const lines: string[] = [];

  lines.push(`# Handoff: ${handoff.from} -> ${handoff.to}`);
  lines.push('');
  lines.push(`> Generated at ${handoff.timestamp}`);
  lines.push('');

  lines.push(`## Context`);
  lines.push('');
  lines.push(handoff.context);
  lines.push('');

  if (handoff.filesModified.length > 0) {
    lines.push(`## Files Modified (by ${handoff.from})`);
    lines.push('');
    for (const f of handoff.filesModified) {
      lines.push(`- \`${f}\``);
    }
    lines.push('');
  }

  if (handoff.tasksCompleted.length > 0) {
    lines.push(`## Completed`);
    lines.push('');
    for (const t of handoff.tasksCompleted) {
      lines.push(`- [x] ${t}`);
    }
    lines.push('');
  }

  if (handoff.tasksPending.length > 0) {
    lines.push(`## Still Pending (for ${handoff.to})`);
    lines.push('');
    for (const t of handoff.tasksPending) {
      lines.push(`- [ ] ${t}`);
    }
    lines.push('');
  }

  if (handoff.decisions.length > 0) {
    lines.push(`## Decisions Made`);
    lines.push('');
    for (const d of handoff.decisions) {
      lines.push(`- ${d}`);
    }
    lines.push('');
  }

  if (handoff.warnings.length > 0) {
    lines.push(`## Warnings`);
    lines.push('');
    for (const w of handoff.warnings) {
      lines.push(`> **Warning:** ${w}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}
