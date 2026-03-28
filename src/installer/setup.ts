// ─── oh-my-hermes project setup ─────────────────────────────────────────────
//
// Setup wizard, doctor check, and status report for oh-my-hermes projects.
//
// All functions accept options objects so they can be invoked both
// interactively (via inquirer) and programmatically (tests / CI).
// ─────────────────────────────────────────────────────────────────────────────

import { access, readFile, writeFile } from 'node:fs/promises';
import { join, basename } from 'node:path';
import { execSync } from 'node:child_process';
import { constants as fsConstants } from 'node:fs';
import { platform } from 'node:os';

import {
  OMH_DIR,
  OMC_DIR,
  OMX_DIR,
  CLAUDE_DIR,
  CODEX_DIR,
  CLAUDE_MD,
  AGENTS_MD,
  CONFIG_FILE,
  STACK_INDICATORS,
  TOOLS,
} from '../shared/constants.js';

import {
  ensureDir,
  readJsonSafe,
  writeJson,
  timestamp,
  resolveOmhDir,
} from '../shared/utils.js';

import { generateClaudeMd, generateAgentsMd, generateSettings } from './template-engine.js';
import type { ProjectInfo } from './template-engine.js';
import { loadSharedMemory, saveSharedMemory } from '../session/shared-memory.js';
import { getSessionIndex, listSessions } from '../session/manager.js';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface DetectedTools {
  claude: boolean;
  codex: boolean;
  omc: boolean;
  omx: boolean;
}

export interface DetectedStack {
  languages: string[];
  frameworks: string[];
}

export interface ExistingSetup {
  hasOmh: boolean;
  hasClaude: boolean;
  hasCodex: boolean;
  hasOmc: boolean;
  hasOmx: boolean;
  hasClaudeMd: boolean;
  hasAgentsMd: boolean;
}

export interface SetupOptions {
  /** Which tools to configure. Defaults to all detected tools. */
  tools?: ('claude' | 'codex')[];
  /** Project description for generated files. */
  description?: string;
  /** Override detected stack. */
  stack?: string[];
  /** Override detected frameworks. */
  frameworks?: string[];
  /** Skip confirmation prompts (for programmatic use). */
  nonInteractive?: boolean;
  /** Force overwrite existing files. */
  force?: boolean;
}

export interface OmhConfig {
  version: string;
  createdAt: string;
  updatedAt: string;
  tools: ('claude' | 'codex')[];
  project: ProjectInfo;
}

export interface HealthCheck {
  name: string;
  status: 'ok' | 'warn' | 'error';
  message: string;
}

// ─── Detection ──────────────────────────────────────────────────────────────

/**
 * Check whether a path exists on disk.
 */
async function pathExists(p: string): Promise<boolean> {
  try {
    await access(p, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check whether a CLI tool is available on $PATH.
 */
function commandExists(cmd: string): boolean {
  try {
    // Use 'where' on Windows, 'which' everywhere else
    const checker = process.platform === 'win32' ? 'where' : 'which';
    execSync(`${checker} ${cmd}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Detect which AI coding tools are installed on the system.
 */
export function detectTools(): DetectedTools {
  return {
    claude: commandExists('claude'),
    codex: commandExists('codex'),
    omc: commandExists('omc'),
    omx: commandExists('omx'),
  };
}

/**
 * Detect the project's technology stack by scanning for indicator files.
 */
export async function detectStack(projectDir: string): Promise<DetectedStack> {
  const languages = new Set<string>();
  const frameworks = new Set<string>();

  for (const [file, info] of Object.entries(STACK_INDICATORS)) {
    if (await pathExists(join(projectDir, file))) {
      languages.add(info.language);
      if (info.framework) {
        frameworks.add(info.framework);
      }
    }
  }

  return {
    languages: [...languages],
    frameworks: [...frameworks],
  };
}

/**
 * Detect existing configuration in the project directory.
 */
export async function detectExistingSetup(projectDir: string): Promise<ExistingSetup> {
  const [hasOmh, hasClaude, hasCodex, hasOmc, hasOmx, hasClaudeMd, hasAgentsMd] =
    await Promise.all([
      pathExists(join(projectDir, OMH_DIR)),
      pathExists(join(projectDir, CLAUDE_DIR)),
      pathExists(join(projectDir, CODEX_DIR)),
      pathExists(join(projectDir, OMC_DIR)),
      pathExists(join(projectDir, OMX_DIR)),
      pathExists(join(projectDir, CLAUDE_MD)),
      pathExists(join(projectDir, AGENTS_MD)),
    ]);

  return { hasOmh, hasClaude, hasCodex, hasOmc, hasOmx, hasClaudeMd, hasAgentsMd };
}

// ─── Auto-install ───────────────────────────────────────────────────────────

/** npm package names for the orchestration layers. */
const INSTALL_PACKAGES: Record<string, string> = {
  omc: 'oh-my-claude-sisyphus',
  omx: 'oh-my-codex',
};

export interface InstallResult {
  tool: string;
  success: boolean;
  message: string;
}

/**
 * Attempt to install a missing orchestration tool globally via npm.
 * Returns an `InstallResult` describing the outcome.
 */
export function installTool(tool: 'omc' | 'omx'): InstallResult {
  const pkg = INSTALL_PACKAGES[tool];
  try {
    execSync(`npm install -g ${pkg}`, { stdio: 'pipe', timeout: 120_000 });
    return { tool, success: true, message: `Installed ${pkg} globally.` };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { tool, success: false, message: `Failed to install ${pkg}: ${msg}` };
  }
}

/**
 * Check which orchestration tools are missing and install them.
 * Only installs tools whose corresponding base CLI is present
 * (e.g. omc requires claude, omx requires codex).
 */
export function autoInstallMissingTools(tools: DetectedTools): InstallResult[] {
  const results: InstallResult[] = [];

  if (tools.claude && !tools.omc) {
    results.push(installTool('omc'));
  }
  if (tools.codex && !tools.omx) {
    results.push(installTool('omx'));
  }

  return results;
}

// ─── Setup ──────────────────────────────────────────────────────────────────

/**
 * Main setup function.
 *
 * Performs all setup steps in sequence:
 *  1. Detect installed tools
 *  2. Detect project stack
 *  3. Detect existing setup
 *  4. Determine tools to configure
 *  5. Create .omh/ directory structure
 *  6. Generate CLAUDE.md (if applicable)
 *  7. Generate AGENTS.md (if applicable)
 *  8. Create .claude/settings.local.json (if applicable)
 *  9. Create .omh/config.json
 * 10. Initialize shared memory
 *
 * Returns a report of actions taken.
 */
export async function setup(
  projectDir: string,
  options: SetupOptions = {},
): Promise<SetupReport> {
  const report: SetupReport = {
    actions: [],
    warnings: [],
    errors: [],
  };

  // ── Step 1: Detect tools ────────────────────────────────────────────────
  const tools = detectTools();
  report.actions.push(
    `Detected tools: claude=${tools.claude}, codex=${tools.codex}, omc=${tools.omc}, omx=${tools.omx}`,
  );

  // ── Step 1.5: Auto-install missing orchestration tools ──────────────────
  if (!options.nonInteractive) {
    const installResults = autoInstallMissingTools(tools);
    for (const r of installResults) {
      if (r.success) {
        report.actions.push(r.message);
        // Refresh detection after install
        if (r.tool === 'omc') tools.omc = true;
        if (r.tool === 'omx') tools.omx = true;
      } else {
        report.warnings.push(r.message);
      }
    }
  }

  // ── Step 2: Detect stack ────────────────────────────────────────────────
  const detectedStack = await detectStack(projectDir);
  const stack = options.stack ?? detectedStack.languages;
  const frameworks = options.frameworks ?? detectedStack.frameworks;
  report.actions.push(
    `Detected stack: ${stack.join(', ') || 'none'} | frameworks: ${frameworks.join(', ') || 'none'}`,
  );

  // ── Step 3: Detect existing setup ───────────────────────────────────────
  const existing = await detectExistingSetup(projectDir);
  if (existing.hasOmh && !options.force) {
    report.warnings.push(
      'Existing .omh/ directory found. Use --force to overwrite.',
    );
  }

  // ── Step 4: Determine tools to configure ────────────────────────────────
  let selectedTools: ('claude' | 'codex')[] = options.tools ?? [];
  if (selectedTools.length === 0) {
    // Default: configure all detected tools
    if (tools.claude || tools.omc) selectedTools.push('claude');
    if (tools.codex || tools.omx) selectedTools.push('codex');
    // If nothing detected, configure both anyway
    if (selectedTools.length === 0) {
      selectedTools = ['claude', 'codex'];
    }
  }
  report.actions.push(`Configuring for: ${selectedTools.join(', ')}`);

  // ── Step 5: Create .omh/ directory structure ────────────────────────────
  const omhDir = resolveOmhDir(projectDir);
  await ensureDir(omhDir);
  await ensureDir(join(omhDir, 'sessions', 'claude'));
  await ensureDir(join(omhDir, 'sessions', 'codex'));
  await ensureDir(join(omhDir, 'shared-memory'));
  await ensureDir(join(omhDir, 'handoffs'));
  report.actions.push('Created .omh/ directory structure');

  // Build project info
  const projectName = basename(projectDir) || 'project';
  const projectInfo: ProjectInfo = {
    name: projectName,
    stack,
    frameworks,
    description: options.description ?? '',
  };

  // ── Step 6: Generate CLAUDE.md ──────────────────────────────────────────
  if (selectedTools.includes('claude')) {
    const claudeMdPath = join(projectDir, CLAUDE_MD);
    if (!existing.hasClaudeMd || options.force) {
      const content = generateClaudeMd(projectInfo);
      await writeFile(claudeMdPath, content, 'utf-8');
      report.actions.push(`Generated ${CLAUDE_MD}`);
    } else {
      report.warnings.push(
        `${CLAUDE_MD} already exists. Skipping (use --force to overwrite).`,
      );
    }
  }

  // ── Step 7: Generate AGENTS.md ──────────────────────────────────────────
  if (selectedTools.includes('codex')) {
    const agentsMdPath = join(projectDir, AGENTS_MD);
    if (!existing.hasAgentsMd || options.force) {
      const content = generateAgentsMd(projectInfo);
      await writeFile(agentsMdPath, content, 'utf-8');
      report.actions.push(`Generated ${AGENTS_MD}`);
    } else {
      report.warnings.push(
        `${AGENTS_MD} already exists. Skipping (use --force to overwrite).`,
      );
    }
  }

  // ── Step 8: Create .claude/settings.local.json ──────────────────────────
  if (selectedTools.includes('claude')) {
    const claudeDir = join(projectDir, CLAUDE_DIR);
    await ensureDir(claudeDir);
    const settingsPath = join(claudeDir, 'settings.local.json');
    const settingsExist = await pathExists(settingsPath);

    if (!settingsExist || options.force) {
      const settings = generateSettings(projectInfo);
      await writeJson(settingsPath, settings);
      report.actions.push('Generated .claude/settings.local.json');
    } else {
      report.warnings.push(
        '.claude/settings.local.json already exists. Skipping (use --force to overwrite).',
      );
    }
  }

  // ── Step 9: Create .omh/config.json ─────────────────────────────────────
  const config: OmhConfig = {
    version: '0.1.0',
    createdAt: timestamp(),
    updatedAt: timestamp(),
    tools: selectedTools,
    project: projectInfo,
  };
  await writeJson(join(omhDir, CONFIG_FILE), config);
  report.actions.push('Created .omh/config.json');

  // ── Step 10: Initialize shared memory ───────────────────────────────────
  const memory = await loadSharedMemory(projectDir);
  memory.projectContext.name = projectName;
  memory.projectContext.stack = stack;
  memory.projectContext.architecture = options.description ?? '';
  await saveSharedMemory(projectDir, memory);
  report.actions.push('Initialized shared memory');

  return report;
}

export interface SetupReport {
  actions: string[];
  warnings: string[];
  errors: string[];
}

// ─── Doctor ─────────────────────────────────────────────────────────────────

/**
 * Run health checks on the project's oh-my-hermes configuration.
 *
 * Checks:
 *  - CLI tools available on PATH
 *  - .omh/ directory structure
 *  - CLAUDE.md / AGENTS.md existence
 *  - .claude/settings.local.json validity
 *  - Session index integrity
 *  - Shared memory file
 *  - Config file validity
 */
export async function doctor(projectDir: string): Promise<HealthCheck[]> {
  const checks: HealthCheck[] = [];

  // ── Check 1: CLI tools ──────────────────────────────────────────────────
  const tools = detectTools();

  checks.push({
    name: 'Claude CLI',
    status: tools.claude ? 'ok' : 'warn',
    message: tools.claude ? 'claude CLI found on PATH' : 'claude CLI not found on PATH',
  });

  checks.push({
    name: 'Codex CLI',
    status: tools.codex ? 'ok' : 'warn',
    message: tools.codex ? 'codex CLI found on PATH' : 'codex CLI not found on PATH',
  });

  checks.push({
    name: 'oh-my-claude (omc)',
    status: tools.omc ? 'ok' : 'warn',
    message: tools.omc ? 'omc CLI found on PATH' : 'omc CLI not found (optional)',
  });

  checks.push({
    name: 'oh-my-codex (omx)',
    status: tools.omx ? 'ok' : 'warn',
    message: tools.omx ? 'omx CLI found on PATH' : 'omx CLI not found (optional)',
  });

  if (!tools.claude && !tools.codex) {
    checks.push({
      name: 'Any AI tool',
      status: 'error',
      message: 'Neither claude nor codex CLI found. Install at least one.',
    });
  }

  // ── Check 2: .omh/ directory ────────────────────────────────────────────
  const omhDir = resolveOmhDir(projectDir);
  const omhExists = await pathExists(omhDir);
  checks.push({
    name: '.omh directory',
    status: omhExists ? 'ok' : 'error',
    message: omhExists ? '.omh/ directory exists' : '.omh/ directory missing. Run `omh setup`.',
  });

  if (omhExists) {
    // Sub-directories
    const sessionsDirExists = await pathExists(join(omhDir, 'sessions'));
    checks.push({
      name: '.omh/sessions/',
      status: sessionsDirExists ? 'ok' : 'warn',
      message: sessionsDirExists
        ? 'Sessions directory exists'
        : 'Sessions directory missing. Run `omh setup`.',
    });

    const sharedMemExists = await pathExists(join(omhDir, 'shared-memory'));
    checks.push({
      name: '.omh/shared-memory/',
      status: sharedMemExists ? 'ok' : 'warn',
      message: sharedMemExists
        ? 'Shared memory directory exists'
        : 'Shared memory directory missing. Run `omh setup`.',
    });

    const handoffsDirExists = await pathExists(join(omhDir, 'handoffs'));
    checks.push({
      name: '.omh/handoffs/',
      status: handoffsDirExists ? 'ok' : 'warn',
      message: handoffsDirExists
        ? 'Handoffs directory exists'
        : 'Handoffs directory missing. Run `omh setup`.',
    });
  }

  // ── Check 3: Config file ────────────────────────────────────────────────
  const configPath = join(omhDir, CONFIG_FILE);
  const config = await readJsonSafe<OmhConfig>(configPath);
  checks.push({
    name: '.omh/config.json',
    status: config ? 'ok' : omhExists ? 'error' : 'warn',
    message: config
      ? `Config valid (v${config.version}, tools: ${config.tools.join(', ')})`
      : 'Config file missing or invalid.',
  });

  // ── Check 4: CLAUDE.md ──────────────────────────────────────────────────
  const hasClaudeMd = await pathExists(join(projectDir, CLAUDE_MD));
  const claudeConfigured = config?.tools.includes('claude') ?? false;
  if (claudeConfigured) {
    checks.push({
      name: 'CLAUDE.md',
      status: hasClaudeMd ? 'ok' : 'error',
      message: hasClaudeMd
        ? 'CLAUDE.md exists'
        : 'CLAUDE.md missing but claude is configured. Run `omh setup --force`.',
    });
  }

  // ── Check 5: AGENTS.md ─────────────────────────────────────────────────
  const hasAgentsMd = await pathExists(join(projectDir, AGENTS_MD));
  const codexConfigured = config?.tools.includes('codex') ?? false;
  if (codexConfigured) {
    checks.push({
      name: 'AGENTS.md',
      status: hasAgentsMd ? 'ok' : 'error',
      message: hasAgentsMd
        ? 'AGENTS.md exists'
        : 'AGENTS.md missing but codex is configured. Run `omh setup --force`.',
    });
  }

  // ── Check 6: .claude/settings.local.json ────────────────────────────────
  if (claudeConfigured) {
    const settingsPath = join(projectDir, CLAUDE_DIR, 'settings.local.json');
    const settings = await readJsonSafe<Record<string, unknown>>(settingsPath);
    checks.push({
      name: '.claude/settings.local.json',
      status: settings ? 'ok' : 'warn',
      message: settings
        ? 'Claude settings file valid'
        : 'Claude settings file missing or invalid.',
    });
  }

  // ── Check 7: Session index ─────────────────────────────────────────────
  if (omhExists) {
    const idx = await getSessionIndex(projectDir);
    const sessionCount = Object.keys(idx.sessions).length;
    checks.push({
      name: 'Session index',
      status: 'ok',
      message: `${sessionCount} session(s) recorded.`,
    });
  }

  // ── Check 8: Shared memory ─────────────────────────────────────────────
  if (omhExists) {
    const memPath = join(omhDir, 'shared-memory', 'memory.json');
    const mem = await readJsonSafe(memPath);
    checks.push({
      name: 'Shared memory',
      status: mem ? 'ok' : 'warn',
      message: mem
        ? 'Shared memory file exists and is valid'
        : 'Shared memory file missing (will be created on first use).',
    });
  }

  return checks;
}

// ─── Status ─────────────────────────────────────────────────────────────────

export interface ProjectStatus {
  project: string;
  omhVersion: string;
  configuredTools: string[];
  stack: string[];
  frameworks: string[];
  totalSessions: number;
  lastSession: {
    id: string;
    tool: string;
    date: string;
    summary: string;
  } | null;
  recentSessions: Array<{
    tool: string;
    date: string;
    summary: string;
  }>;
  activeProgress: Array<{
    task: string;
    tool: string;
    status: string;
  }>;
  recentDecisions: Array<{
    decision: string;
    tool: string;
    date: string;
  }>;
}

/**
 * Show current project status including configuration, sessions, and progress.
 */
export async function showStatus(projectDir: string): Promise<ProjectStatus> {
  const omhDir = resolveOmhDir(projectDir);
  const projectName = basename(projectDir) || 'unknown';

  // Load config
  const config = await readJsonSafe<OmhConfig>(join(omhDir, CONFIG_FILE));

  // Load session data
  const sessions = await listSessions(projectDir, 5);
  const idx = await getSessionIndex(projectDir);
  const sessionCount = Object.keys(idx.sessions).length;

  // Determine last session
  let lastSession: ProjectStatus['lastSession'] = null;
  if (idx.lastSession && idx.sessions[idx.lastSession]) {
    const entry = idx.sessions[idx.lastSession];
    lastSession = {
      id: idx.lastSession,
      tool: entry.tool,
      date: entry.date,
      summary: entry.summary,
    };
  }

  // Load shared memory
  const memory = await loadSharedMemory(projectDir);

  // Active progress items
  const activeProgress = memory.progress
    .filter((p) => p.status !== 'completed')
    .map((p) => ({ task: p.task, tool: p.tool, status: p.status }));

  // Recent decisions (last 5)
  const recentDecisions = memory.decisions.slice(-5).map((d) => ({
    decision: d.decision,
    tool: d.tool,
    date: d.date.slice(0, 10),
  }));

  return {
    project: config?.project.name ?? projectName,
    omhVersion: config?.version ?? 'unknown',
    configuredTools: config?.tools ?? [],
    stack: config?.project.stack ?? [],
    frameworks: config?.project.frameworks ?? [],
    totalSessions: sessionCount,
    lastSession,
    recentSessions: sessions.map((s) => ({
      tool: s.tool,
      date: s.date,
      summary: s.summary,
    })),
    activeProgress,
    recentDecisions,
  };
}

/**
 * Format a project status object as a human-readable string.
 */
export function formatStatus(status: ProjectStatus): string {
  const lines: string[] = [];

  lines.push(`=== oh-my-hermes Status ===`);
  lines.push('');
  lines.push(`Project:    ${status.project}`);
  lines.push(`Version:    ${status.omhVersion}`);
  lines.push(`Tools:      ${status.configuredTools.join(', ') || 'none configured'}`);
  lines.push(`Stack:      ${status.stack.join(', ') || 'not detected'}`);
  lines.push(`Frameworks: ${status.frameworks.join(', ') || 'none'}`);
  lines.push('');

  lines.push(`--- Sessions ---`);
  lines.push(`Total: ${status.totalSessions}`);
  if (status.lastSession) {
    lines.push(
      `Last:  [${status.lastSession.tool}] ${status.lastSession.date} - ${status.lastSession.summary || '(no summary)'}`,
    );
  } else {
    lines.push(`Last:  none`);
  }
  lines.push('');

  if (status.recentSessions.length > 0) {
    lines.push(`Recent sessions:`);
    for (const s of status.recentSessions) {
      lines.push(`  [${s.tool}] ${s.date} - ${s.summary || '(no summary)'}`);
    }
    lines.push('');
  }

  if (status.activeProgress.length > 0) {
    lines.push(`--- Active Tasks ---`);
    for (const p of status.activeProgress) {
      lines.push(`  [${p.status}] ${p.task} (${p.tool})`);
    }
    lines.push('');
  }

  if (status.recentDecisions.length > 0) {
    lines.push(`--- Recent Decisions ---`);
    for (const d of status.recentDecisions) {
      lines.push(`  ${d.date} [${d.tool}] ${d.decision}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Format doctor results as a human-readable string.
 */
export function formatDoctorResults(checks: HealthCheck[]): string {
  const lines: string[] = [];
  lines.push(`=== oh-my-hermes Doctor ===`);
  lines.push('');

  const icons: Record<string, string> = {
    ok: '[OK]',
    warn: '[WARN]',
    error: '[ERR]',
  };

  for (const check of checks) {
    lines.push(`  ${icons[check.status]} ${check.name}: ${check.message}`);
  }

  lines.push('');

  const okCount = checks.filter((c) => c.status === 'ok').length;
  const warnCount = checks.filter((c) => c.status === 'warn').length;
  const errCount = checks.filter((c) => c.status === 'error').length;

  lines.push(`Results: ${okCount} ok, ${warnCount} warnings, ${errCount} errors`);

  if (errCount > 0) {
    lines.push('');
    lines.push('Fix errors above, then re-run `omh doctor`.');
  }

  return lines.join('\n');
}
