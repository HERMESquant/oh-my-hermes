// ─── oh-my-hermes shared utilities ──────────────────────────────────────────

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { OMH_DIR } from './constants.js';

/**
 * Create a directory (and all parents) if it does not already exist.
 */
export async function ensureDir(dirPath: string): Promise<void> {
  await mkdir(dirPath, { recursive: true });
}

/**
 * Read and parse a JSON file.
 * Returns `null` when the file does not exist or contains invalid JSON.
 */
export async function readJsonSafe<T = unknown>(filePath: string): Promise<T | null> {
  try {
    const raw = await readFile(filePath, 'utf-8');
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/**
 * Write data to a JSON file with 2-space indentation.
 * Parent directories are created automatically.
 */
export async function writeJson(filePath: string, data: unknown): Promise<void> {
  const dir = filePath.substring(0, filePath.lastIndexOf('/') || filePath.lastIndexOf('\\'));
  if (dir) {
    await ensureDir(dir);
  }
  await writeFile(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

/**
 * Return the current time as an ISO-8601 string.
 */
export function timestamp(): string {
  return new Date().toISOString();
}

/**
 * Return the current time in a filesystem-safe `YYYY-MM-DD_HH-MM` format.
 */
export function shortTimestamp(): string {
  const d = new Date();
  const pad = (n: number): string => String(n).padStart(2, '0');
  return [
    d.getFullYear(),
    '-',
    pad(d.getMonth() + 1),
    '-',
    pad(d.getDate()),
    '_',
    pad(d.getHours()),
    '-',
    pad(d.getMinutes()),
  ].join('');
}

/**
 * Replace values that look like secrets (API keys, passwords, tokens)
 * with `[REDACTED]`.
 *
 * Matches common patterns:
 *   - `sk-...`, `pk-...`, `key-...`, Bearer tokens
 *   - Generic `KEY=value`, `PASSWORD=value`, `TOKEN=value` in env-style text
 *   - Hex / base-64 strings longer than 20 chars following an `=` sign
 */
export function sanitizeSensitive(text: string): string {
  // Bearer tokens
  let sanitized = text.replace(
    /Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi,
    'Bearer [REDACTED]',
  );

  // Common API-key prefixes (sk-, pk-, key-, xoxb-, ghp_, gho_, etc.)
  sanitized = sanitized.replace(
    /\b(sk|pk|key|xoxb|xoxp|ghp|gho|ghs|ghr|glpat|AKIA)[_\-][A-Za-z0-9\-._]{8,}\b/g,
    '[REDACTED]',
  );

  // ENV-style secrets: KEY=..., TOKEN=..., PASSWORD=..., SECRET=...
  sanitized = sanitized.replace(
    /\b(API_KEY|SECRET_KEY|ACCESS_KEY|PRIVATE_KEY|PASSWORD|TOKEN|SECRET|CREDENTIALS)\s*[=:]\s*\S+/gi,
    '$1=[REDACTED]',
  );

  return sanitized;
}

/**
 * Resolve the absolute path to the `.omh/` directory inside a project.
 */
export function resolveOmhDir(projectDir: string): string {
  return join(projectDir, OMH_DIR);
}
