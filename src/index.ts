// ─── oh-my-hermes public API ─────────────────────────────────────────────────
//
// Re-export every module so consumers can do:
//
//   import { TOOLS, detectInstalledTools, ensureDir } from 'oh-my-hermes';
//

export * from './shared/constants.js';
export * from './shared/detect.js';
export * from './shared/utils.js';

export * from './session/manager.js';
export * from './session/shared-memory.js';

// installer/setup.ts re-declares some names from shared/detect.ts, so we
// re-export selectively to avoid ambiguity.
export { setup, doctor, showStatus, autoInstallMissingTools, installTool } from './installer/setup.js';
export type { SetupOptions, OmhConfig, InstallResult } from './installer/setup.js';

export * from './installer/template-engine.js';
export * from './team/agents.js';
export * from './team/router.js';
export * from './team/dual-forge.js';
