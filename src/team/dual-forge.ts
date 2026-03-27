// ─── oh-my-hermes dual-forge ─────────────────────────────────────────────────
//
// DualForge: Send the same task to both Claude Code and Codex CLI,
// collect both results, compare, and merge the best parts into one final output.
//
// Inspired by OMC's "ccg" (Claude-Codex-Gemini) tri-model advisor.
// ─────────────────────────────────────────────────────────────────────────────

import { join } from 'node:path';
import { readdir, readFile } from 'node:fs/promises';

import { OMH_DIR } from '../shared/constants.js';
import { ensureDir, writeJson, timestamp, shortTimestamp } from '../shared/utils.js';

// ── Types ────────────────────────────────────────────────────────────────────

export interface ForgePrompt {
  /** The original user request. */
  original: string;
  /** Tailored prompt sent to Claude Code (emphasises reasoning, design). */
  claudePrompt: string;
  /** Tailored prompt sent to Codex CLI (emphasises implementation, parallel). */
  codexPrompt: string;
  /** Synthesis plan: how to compare and merge. */
  synthesisPlan: string;
}

export interface ForgeArtifact {
  tool: 'claude' | 'codex';
  content: string;
  timestamp: string;
  filepath: string;
}

export interface ForgeSynthesis {
  /** Points where both tools agree. */
  agreed: string[];
  /** Points where tools disagree, with each perspective. */
  conflicts: Array<{
    topic: string;
    claude: string;
    codex: string;
    resolution: string;
  }>;
  /** The final merged result. */
  mergedResult: string;
  /** Action items derived from the merge. */
  actionItems: string[];
}

export interface ForgeResult {
  id: string;
  request: string;
  prompts: ForgePrompt;
  artifacts: ForgeArtifact[];
  synthesis: ForgeSynthesis | null;
  createdAt: string;
}

// ── Prompt Decomposition ─────────────────────────────────────────────────────

/**
 * Decompose a user request into two tool-specialised prompts.
 *
 * Claude prompt emphasises: deep reasoning, architecture, correctness, security,
 * edge cases, design trade-offs.
 *
 * Codex prompt emphasises: implementation, parallel execution, performance,
 * practical code, file-level changes, test coverage.
 */
export function decomposeRequest(request: string): ForgePrompt {
  const claudePrompt = [
    `You are a senior architect with deep reasoning capabilities.`,
    `Analyse the following request thoroughly:`,
    ``,
    `"${request}"`,
    ``,
    `Focus on:`,
    `- Architecture and system design (why, not just how)`,
    `- Correctness and edge cases`,
    `- Security implications`,
    `- Design trade-offs and alternatives considered`,
    `- Risk analysis and mitigation`,
    `- Long-term maintainability`,
    ``,
    `Produce a structured response with clear sections.`,
    `Include reasoning for every recommendation.`,
  ].join('\n');

  const codexPrompt = [
    `You are a pragmatic implementation engineer optimising for shipping.`,
    `Implement the following request:`,
    ``,
    `"${request}"`,
    ``,
    `Focus on:`,
    `- Concrete implementation plan with file-level changes`,
    `- Working code (not pseudocode)`,
    `- Performance and efficiency`,
    `- Test coverage and validation`,
    `- Parallel-safe changes across files`,
    `- Practical developer experience`,
    ``,
    `Produce a structured response with code blocks and file paths.`,
  ].join('\n');

  const synthesisPlan = [
    `Merge strategy:`,
    `1. Use Claude's architecture/design as the structural foundation`,
    `2. Use Codex's implementation as the code-level detail`,
    `3. Where they conflict: prefer Claude for "why" decisions, Codex for "how" decisions`,
    `4. Flag any unresolved tensions for user review`,
  ].join('\n');

  return {
    original: request,
    claudePrompt,
    codexPrompt,
    synthesisPlan,
  };
}

// ── Artifact Storage ─────────────────────────────────────────────────────────

const FORGE_DIR = 'dualforge';

/**
 * Save a forge artifact (response from one tool).
 */
export async function saveForgeArtifact(
  projectDir: string,
  forgeId: string,
  tool: 'claude' | 'codex',
  content: string,
): Promise<ForgeArtifact> {
  const dir = join(projectDir, OMH_DIR, FORGE_DIR, forgeId);
  await ensureDir(dir);

  const ts = shortTimestamp();
  const filename = `${tool}-${ts}.md`;
  const filepath = join(dir, filename);

  const { writeFile } = await import('node:fs/promises');
  await writeFile(filepath, content, 'utf-8');

  return {
    tool,
    content,
    timestamp: timestamp(),
    filepath,
  };
}

/**
 * Load all forge artifacts for a given forge ID.
 */
export async function loadForgeArtifacts(
  projectDir: string,
  forgeId: string,
): Promise<ForgeArtifact[]> {
  const dir = join(projectDir, OMH_DIR, FORGE_DIR, forgeId);
  const artifacts: ForgeArtifact[] = [];

  try {
    const files = await readdir(dir);
    for (const file of files) {
      if (!file.endsWith('.md')) continue;
      const tool = file.startsWith('claude') ? 'claude' : 'codex';
      const content = await readFile(join(dir, file), 'utf-8');
      artifacts.push({
        tool: tool as 'claude' | 'codex',
        content,
        timestamp: '',
        filepath: join(dir, file),
      });
    }
  } catch {
    // Directory doesn't exist yet — no artifacts.
  }

  return artifacts;
}

// ── Forge Session ────────────────────────────────────────────────────────────

/**
 * Create a new DualForge session.
 */
export async function createForgeSession(
  projectDir: string,
  request: string,
): Promise<ForgeResult> {
  const ts = shortTimestamp();
  const id = `forge-${ts}`;
  const prompts = decomposeRequest(request);

  const result: ForgeResult = {
    id,
    request,
    prompts,
    artifacts: [],
    synthesis: null,
    createdAt: timestamp(),
  };

  // Persist session metadata
  const dir = join(projectDir, OMH_DIR, FORGE_DIR, id);
  await ensureDir(dir);
  await writeJson(join(dir, 'meta.json'), result);

  return result;
}

/**
 * Load an existing forge session.
 */
export async function loadForgeSession(
  projectDir: string,
  forgeId: string,
): Promise<ForgeResult | null> {
  const metaPath = join(projectDir, OMH_DIR, FORGE_DIR, forgeId, 'meta.json');
  try {
    const raw = await readFile(metaPath, 'utf-8');
    return JSON.parse(raw) as ForgeResult;
  } catch {
    return null;
  }
}

/**
 * List all forge sessions, most recent first.
 */
export async function listForgeSessions(
  projectDir: string,
): Promise<Array<{ id: string; request: string; createdAt: string }>> {
  const dir = join(projectDir, OMH_DIR, FORGE_DIR);
  const results: Array<{ id: string; request: string; createdAt: string }> = [];

  try {
    const entries = await readdir(dir);
    for (const entry of entries) {
      if (!entry.startsWith('forge-')) continue;
      const meta = await loadForgeSession(projectDir, entry);
      if (meta) {
        results.push({
          id: meta.id,
          request: meta.request,
          createdAt: meta.createdAt,
        });
      }
    }
  } catch {
    // No forge directory yet.
  }

  return results.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

// ── Synthesis ────────────────────────────────────────────────────────────────

/**
 * Generate a synthesis prompt that asks the AI to merge two tool outputs.
 * This is meant to be used as a prompt for Claude Code (the synthesiser).
 */
export function generateSynthesisPrompt(
  request: string,
  claudeOutput: string,
  codexOutput: string,
): string {
  return [
    `# DualForge Synthesis`,
    ``,
    `You are merging the outputs of two AI tools that worked on the same task.`,
    `Your job is to produce a single best result by combining their strengths.`,
    ``,
    `## Original Request`,
    `"${request}"`,
    ``,
    `## Claude Code Output (strengths: reasoning, architecture, security)`,
    `<claude-output>`,
    claudeOutput,
    `</claude-output>`,
    ``,
    `## Codex CLI Output (strengths: implementation, code, performance)`,
    `<codex-output>`,
    codexOutput,
    `</codex-output>`,
    ``,
    `## Your Synthesis Task`,
    ``,
    `Produce a unified result with these sections:`,
    ``,
    `### 1. Agreed Points`,
    `List points where both tools agree. These are high-confidence recommendations.`,
    ``,
    `### 2. Conflicting Recommendations`,
    `For each conflict:`,
    `- What Claude recommends and why`,
    `- What Codex recommends and why`,
    `- Your resolution: which approach wins and why`,
    ``,
    `### 3. Merged Result`,
    `The final unified output combining the best of both.`,
    `Use Claude's architecture/design decisions as the foundation.`,
    `Use Codex's concrete implementation as the code-level detail.`,
    ``,
    `### 4. Action Checklist`,
    `Numbered list of concrete next steps to implement the merged result.`,
  ].join('\n');
}

/**
 * Generate a markdown report from a completed forge session.
 */
export function generateForgeReport(result: ForgeResult): string {
  const lines: string[] = [
    `# DualForge Report`,
    ``,
    `- **ID**: ${result.id}`,
    `- **Created**: ${result.createdAt}`,
    `- **Request**: ${result.request}`,
    ``,
    `---`,
    ``,
  ];

  if (result.artifacts.length > 0) {
    lines.push(`## Tool Outputs`, ``);
    for (const artifact of result.artifacts) {
      lines.push(
        `### ${artifact.tool === 'claude' ? 'Claude Code' : 'Codex CLI'}`,
        ``,
        artifact.content,
        ``,
        `---`,
        ``,
      );
    }
  }

  if (result.synthesis) {
    const s = result.synthesis;

    lines.push(`## Synthesis`, ``);

    if (s.agreed.length > 0) {
      lines.push(`### Agreed Points`, ``);
      for (const point of s.agreed) {
        lines.push(`- ${point}`);
      }
      lines.push(``);
    }

    if (s.conflicts.length > 0) {
      lines.push(`### Conflicts & Resolutions`, ``);
      for (const c of s.conflicts) {
        lines.push(
          `#### ${c.topic}`,
          `- **Claude**: ${c.claude}`,
          `- **Codex**: ${c.codex}`,
          `- **Resolution**: ${c.resolution}`,
          ``,
        );
      }
    }

    if (s.mergedResult) {
      lines.push(`### Merged Result`, ``, s.mergedResult, ``);
    }

    if (s.actionItems.length > 0) {
      lines.push(`### Action Checklist`, ``);
      s.actionItems.forEach((item, i) => {
        lines.push(`${i + 1}. ${item}`);
      });
      lines.push(``);
    }
  }

  return lines.join('\n');
}
