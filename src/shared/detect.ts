// ─── oh-my-hermes environment / project detection ──────────────────────────

import { access, readdir, stat } from 'node:fs/promises';
import { join, dirname, parse as parsePath } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { platform } from 'node:os';

import {
  OMH_DIR,
  OMC_DIR,
  OMX_DIR,
  CLAUDE_DIR,
  CODEX_DIR,
  CLAUDE_MD,
  AGENTS_MD,
  PROJECT_ROOT_MARKERS,
  STACK_INDICATORS,
} from './constants.js';

const execFileAsync = promisify(execFile);

// ── Types ────────────────────────────────────────────────────────────────────

export interface InstalledTools {
  claude: boolean;
  codex: boolean;
  omc: boolean;
  omx: boolean;
}

export interface ProjectStack {
  languages: string[];
  frameworks: string[];
  hasGit: boolean;
}

export interface ExistingSetup {
  hasClaude: boolean;
  hasCodex: boolean;
  hasOmc: boolean;
  hasOmx: boolean;
  hasClaudeMd: boolean;
  hasAgentsMd: boolean;
  hasOmh: boolean;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Return `true` when a filesystem path exists (file or directory).
 */
async function pathExists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check whether a CLI tool is reachable on the system PATH.
 * Uses `where` on Windows, `which` everywhere else.
 */
async function commandExists(cmd: string): Promise<boolean> {
  const locator = platform() === 'win32' ? 'where' : 'which';
  try {
    await execFileAsync(locator, [cmd]);
    return true;
  } catch {
    return false;
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Detect which AI coding tools are installed on the host machine.
 */
export async function detectInstalledTools(): Promise<InstalledTools> {
  const [claude, codex, omc, omx] = await Promise.all([
    commandExists('claude'),
    commandExists('codex'),
    commandExists('omc'),
    commandExists('omx'),
  ]);
  return { claude, codex, omc, omx };
}

/**
 * Scan a project directory to determine its technology stack.
 */
export async function detectProjectStack(projectDir: string): Promise<ProjectStack> {
  const languages = new Set<string>();
  const frameworks = new Set<string>();

  let entries: string[];
  try {
    entries = await readdir(projectDir);
  } catch {
    entries = [];
  }

  for (const entry of entries) {
    const indicator = STACK_INDICATORS[entry];
    if (indicator) {
      languages.add(indicator.language);
      if (indicator.framework) {
        frameworks.add(indicator.framework);
      }
    }
  }

  const hasGit = await pathExists(join(projectDir, '.git'));

  return {
    languages: [...languages],
    frameworks: [...frameworks],
    hasGit,
  };
}

/**
 * Check which tool-specific configuration directories / files already exist
 * inside a project.
 */
export async function detectExistingSetup(projectDir: string): Promise<ExistingSetup> {
  const [hasClaude, hasCodex, hasOmc, hasOmx, hasClaudeMd, hasAgentsMd, hasOmh] =
    await Promise.all([
      pathExists(join(projectDir, CLAUDE_DIR)),
      pathExists(join(projectDir, CODEX_DIR)),
      pathExists(join(projectDir, OMC_DIR)),
      pathExists(join(projectDir, OMX_DIR)),
      pathExists(join(projectDir, CLAUDE_MD)),
      pathExists(join(projectDir, AGENTS_MD)),
      pathExists(join(projectDir, OMH_DIR)),
    ]);

  return { hasClaude, hasCodex, hasOmc, hasOmx, hasClaudeMd, hasAgentsMd, hasOmh };
}

/**
 * Walk up the directory tree from `cwd` until a recognised project-root
 * marker is found. Returns the directory that contains the marker, or `cwd`
 * as a last resort.
 */
export async function getProjectRoot(cwd?: string): Promise<string> {
  let dir = cwd ?? process.cwd();

  // eslint-disable-next-line no-constant-condition
  while (true) {
    for (const marker of PROJECT_ROOT_MARKERS) {
      if (await pathExists(join(dir, marker))) {
        return dir;
      }
    }

    const parent = dirname(dir);
    // Reached the filesystem root without finding a marker.
    if (parent === dir || parsePath(parent).root === parent) {
      return cwd ?? process.cwd();
    }
    dir = parent;
  }
}
