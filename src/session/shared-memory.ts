// ─── oh-my-hermes shared memory ─────────────────────────────────────────────
//
// Cross-tool shared memory that persists project context, architectural
// decisions, and progress across Claude Code and Codex CLI sessions.
//
// Stored at .omh/shared-memory/memory.json with formatted context
// generators for injection into CLAUDE.md and AGENTS.md.
// ─────────────────────────────────────────────────────────────────────────────

import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { OMH_DIR, SHARED_MEMORY, TOOLS } from '../shared/constants.js';
import {
  ensureDir,
  readJsonSafe,
  writeJson,
  timestamp,
  resolveOmhDir,
} from '../shared/utils.js';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ProjectContext {
  name: string;
  stack: string[];
  architecture: string;
  lastUpdated: string;
}

export interface Decision {
  date: string;
  tool: string;
  decision: string;
  reason: string;
}

export interface ProgressEntry {
  date: string;
  tool: string;
  task: string;
  status: 'completed' | 'in-progress' | 'blocked';
}

export interface SharedMemory {
  projectContext: ProjectContext;
  decisions: Decision[];
  progress: ProgressEntry[];
}

// ─── Paths ──────────────────────────────────────────────────────────────────

function sharedMemoryDir(projectDir: string): string {
  return join(resolveOmhDir(projectDir), SHARED_MEMORY);
}

function memoryFilePath(projectDir: string): string {
  return join(sharedMemoryDir(projectDir), 'memory.json');
}

// ─── Core Functions ─────────────────────────────────────────────────────────

/**
 * Load the shared memory file, or create a default empty one if it does
 * not yet exist.
 */
export async function loadSharedMemory(projectDir: string): Promise<SharedMemory> {
  const existing = await readJsonSafe<SharedMemory>(memoryFilePath(projectDir));
  if (existing) return existing;

  const projectName = projectDir.split(/[\\/]/).filter(Boolean).pop() ?? 'unknown';

  const fresh: SharedMemory = {
    projectContext: {
      name: projectName,
      stack: [],
      architecture: '',
      lastUpdated: timestamp(),
    },
    decisions: [],
    progress: [],
  };

  return fresh;
}

/**
 * Persist the shared memory object to disk.
 */
export async function saveSharedMemory(
  projectDir: string,
  memory: SharedMemory,
): Promise<void> {
  await ensureDir(sharedMemoryDir(projectDir));
  memory.projectContext.lastUpdated = timestamp();
  await writeJson(memoryFilePath(projectDir), memory);
}

/**
 * Append a decision record and save.
 */
export async function addDecision(
  projectDir: string,
  tool: string,
  decision: string,
  reason: string,
): Promise<void> {
  const memory = await loadSharedMemory(projectDir);
  memory.decisions.push({
    date: timestamp(),
    tool,
    decision,
    reason,
  });
  await saveSharedMemory(projectDir, memory);
}

/**
 * Add or update a progress entry (matched by task name) and save.
 */
export async function updateProgress(
  projectDir: string,
  tool: string,
  task: string,
  status: 'completed' | 'in-progress' | 'blocked',
): Promise<void> {
  const memory = await loadSharedMemory(projectDir);

  const existing = memory.progress.find(
    (p) => p.task === task && p.tool === tool,
  );

  if (existing) {
    existing.status = status;
    existing.date = timestamp();
  } else {
    memory.progress.push({
      date: timestamp(),
      tool,
      task,
      status,
    });
  }

  await saveSharedMemory(projectDir, memory);
}

// ─── Context Generators ─────────────────────────────────────────────────────

/**
 * Generate formatted context suitable for injection into a tool's instruction
 * file (CLAUDE.md or AGENTS.md).
 *
 * The output includes project context, recent decisions, and current progress
 * so the receiving tool has full situational awareness.
 */
export async function getContextForTool(
  projectDir: string,
  tool: 'claude' | 'codex',
): Promise<string> {
  const memory = await loadSharedMemory(projectDir);
  const lines: string[] = [];

  // Header
  lines.push(`<!-- OMH Shared Context (generated for ${tool}) -->`);
  lines.push('');

  // Project context
  lines.push(`## Project: ${memory.projectContext.name}`);
  lines.push('');
  if (memory.projectContext.stack.length > 0) {
    lines.push(`**Stack:** ${memory.projectContext.stack.join(', ')}`);
    lines.push('');
  }
  if (memory.projectContext.architecture) {
    lines.push(`**Architecture:** ${memory.projectContext.architecture}`);
    lines.push('');
  }

  // Recent decisions (last 10)
  const recentDecisions = memory.decisions.slice(-10);
  if (recentDecisions.length > 0) {
    lines.push(`## Recent Decisions`);
    lines.push('');
    for (const d of recentDecisions) {
      lines.push(`- **${d.decision}** (${d.tool}, ${d.date.slice(0, 10)})`);
      lines.push(`  - Reason: ${d.reason}`);
    }
    lines.push('');
  }

  // Current progress
  const active = memory.progress.filter((p) => p.status !== 'completed');
  const recentCompleted = memory.progress
    .filter((p) => p.status === 'completed')
    .slice(-5);

  if (active.length > 0 || recentCompleted.length > 0) {
    lines.push(`## Progress`);
    lines.push('');

    if (active.length > 0) {
      lines.push(`### Active`);
      lines.push('');
      for (const p of active) {
        const icon = p.status === 'in-progress' ? '🔄' : '🚫';
        lines.push(`- ${icon} **${p.task}** [${p.status}] (${p.tool})`);
      }
      lines.push('');
    }

    if (recentCompleted.length > 0) {
      lines.push(`### Recently Completed`);
      lines.push('');
      for (const p of recentCompleted) {
        lines.push(`- [x] ${p.task} (${p.tool}, ${p.date.slice(0, 10)})`);
      }
      lines.push('');
    }
  }

  // Cross-tool awareness
  const otherTool = tool === TOOLS.CLAUDE ? TOOLS.CODEX : TOOLS.CLAUDE;
  const otherToolEntries = memory.progress.filter((p) => p.tool === otherTool);
  if (otherToolEntries.length > 0) {
    lines.push(`## Work Done by ${otherTool}`);
    lines.push('');
    const recent = otherToolEntries.slice(-5);
    for (const p of recent) {
      const statusMark = p.status === 'completed' ? '[x]' : '[ ]';
      lines.push(`- ${statusMark} ${p.task} [${p.status}] (${p.date.slice(0, 10)})`);
    }
    lines.push('');
  }

  lines.push(`<!-- Last updated: ${memory.projectContext.lastUpdated} -->`);

  return lines.join('\n');
}
