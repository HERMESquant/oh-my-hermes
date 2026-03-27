// ─── oh-my-hermes shared constants ───────────────────────────────────────────

/** Directory names used by OMH and its supported tools. */
export const OMH_DIR = '.omh' as const;
export const OMC_DIR = '.omc' as const;
export const OMX_DIR = '.omx' as const;
export const CLAUDE_DIR = '.claude' as const;
export const CODEX_DIR = '.codex' as const;

/** Well-known instruction files. */
export const CLAUDE_MD = 'CLAUDE.md' as const;
export const AGENTS_MD = 'AGENTS.md' as const;

/** Paths relative to OMH_DIR. */
export const SESSION_INDEX = 'sessions/index.json' as const;
export const SHARED_MEMORY = 'shared-memory' as const;
export const CONFIG_FILE = 'config.json' as const;

/** Supported AI coding tools. */
export enum TOOLS {
  CLAUDE = 'claude',
  CODEX = 'codex',
}

/** Sentinel files that mark a project root (ordered by priority). */
export const PROJECT_ROOT_MARKERS = [
  '.git',
  'package.json',
  'Cargo.toml',
  'go.mod',
  'pyproject.toml',
  'requirements.txt',
  '.omh',
] as const;

/** Files / dirs used to detect the project technology stack. */
export const STACK_INDICATORS: Record<string, { language: string; framework?: string }> = {
  'package.json': { language: 'typescript/javascript' },
  'tsconfig.json': { language: 'typescript' },
  'requirements.txt': { language: 'python' },
  'pyproject.toml': { language: 'python' },
  'setup.py': { language: 'python' },
  'Cargo.toml': { language: 'rust' },
  'go.mod': { language: 'go' },
  'Gemfile': { language: 'ruby' },
  'pom.xml': { language: 'java' },
  'build.gradle': { language: 'java' },
  'mix.exs': { language: 'elixir' },
  'composer.json': { language: 'php' },
  'next.config.js': { language: 'typescript/javascript', framework: 'next.js' },
  'next.config.mjs': { language: 'typescript/javascript', framework: 'next.js' },
  'next.config.ts': { language: 'typescript', framework: 'next.js' },
  'nuxt.config.ts': { language: 'typescript', framework: 'nuxt' },
  'angular.json': { language: 'typescript', framework: 'angular' },
  'svelte.config.js': { language: 'typescript/javascript', framework: 'svelte' },
  'vite.config.ts': { language: 'typescript', framework: 'vite' },
  'vite.config.js': { language: 'typescript/javascript', framework: 'vite' },
  'django-admin.py': { language: 'python', framework: 'django' },
  'manage.py': { language: 'python', framework: 'django' },
  'Dockerfile': { language: 'docker' },
  'docker-compose.yml': { language: 'docker' },
  'docker-compose.yaml': { language: 'docker' },
} as const;
