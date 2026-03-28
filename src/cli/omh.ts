#!/usr/bin/env node
// ─── oh-my-hermes CLI ───────────────────────────────────────────────────────

import { Command } from 'commander';
import chalk from 'chalk';
import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { TOOLS } from '../shared/constants.js';
import {
  detectInstalledTools,
  detectExistingSetup,
  detectProjectStack,
  getProjectRoot,
} from '../shared/detect.js';

// ── Helpers ──────────────────────────────────────────────────────────────────

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** Read the version string from the nearest package.json. */
async function readVersion(): Promise<string> {
  try {
    const pkgPath = join(__dirname, '..', '..', 'package.json');
    const raw = await readFile(pkgPath, 'utf-8');
    const pkg = JSON.parse(raw) as { version?: string };
    return pkg.version ?? '0.0.0';
  } catch {
    return '0.0.0';
  }
}

/** Print the OMH banner. */
function printBanner(): void {
  console.log('');
  console.log(
    chalk.bold.cyan(
      [
        '  ╔═══════════════════════════════════════╗',
        '  ║       OH-MY-HERMES  (OMH)             ║',
        '  ║  Unified AI Agent Orchestration        ║',
        '  ╚═══════════════════════════════════════╝',
      ].join('\n'),
    ),
  );
  console.log('');
}

/** Format a boolean as a coloured check / cross. */
function statusIcon(ok: boolean): string {
  return ok ? chalk.green('✔') : chalk.red('✘');
}

// ── Command Handlers ─────────────────────────────────────────────────────────

async function handleSetup(): Promise<void> {
  printBanner();
  console.log(chalk.bold('Interactive project setup\n'));

  const projectDir = await getProjectRoot();
  console.log(chalk.dim(`Project root: ${projectDir}\n`));

  // 1. Detect installed tools
  console.log(chalk.underline('Installed tools'));
  const tools = await detectInstalledTools();
  console.log(`  ${statusIcon(tools.claude)} Claude CLI`);
  console.log(`  ${statusIcon(tools.codex)} Codex CLI`);
  console.log(`  ${statusIcon(tools.omc)} oh-my-claude (omc)`);
  console.log(`  ${statusIcon(tools.omx)} oh-my-codex (omx)`);
  console.log('');

  // 2. Detect project stack
  console.log(chalk.underline('Project stack'));
  const stack = await detectProjectStack(projectDir);
  if (stack.languages.length > 0) {
    console.log(`  Languages:  ${stack.languages.join(', ')}`);
  } else {
    console.log(chalk.dim('  No recognised languages detected.'));
  }
  if (stack.frameworks.length > 0) {
    console.log(`  Frameworks: ${stack.frameworks.join(', ')}`);
  }
  console.log(`  Git:        ${statusIcon(stack.hasGit)}`);
  console.log('');

  // 3. Detect existing setup
  console.log(chalk.underline('Existing configuration'));
  const setup = await detectExistingSetup(projectDir);
  console.log(`  ${statusIcon(setup.hasOmh)}  .omh/`);
  console.log(`  ${statusIcon(setup.hasOmc)}  .omc/`);
  console.log(`  ${statusIcon(setup.hasOmx)}  .omx/`);
  console.log(`  ${statusIcon(setup.hasClaude)}  .claude/`);
  console.log(`  ${statusIcon(setup.hasCodex)}  .codex/`);
  console.log(`  ${statusIcon(setup.hasClaudeMd)}  CLAUDE.md`);
  console.log(`  ${statusIcon(setup.hasAgentsMd)}  AGENTS.md`);
  console.log('');

  if (!tools.claude && !tools.codex) {
    console.log(
      chalk.yellow(
        'Neither Claude CLI nor Codex CLI is installed.\n' +
          'Install at least one tool, then run `omh setup` again.',
      ),
    );
    return;
  }

  // Auto-install missing orchestration tools
  const { autoInstallMissingTools } = await import('../installer/setup.js');
  if ((!tools.omc && tools.claude) || (!tools.omx && tools.codex)) {
    console.log(chalk.underline('Installing missing orchestration tools'));
    const results = autoInstallMissingTools(tools);
    for (const r of results) {
      if (r.success) {
        console.log(`  ${statusIcon(true)} ${r.message}`);
        if (r.tool === 'omc') tools.omc = true;
        if (r.tool === 'omx') tools.omx = true;
      } else {
        console.log(`  ${statusIcon(false)} ${r.message}`);
      }
    }
    console.log('');
  }

  // Run the full installer
  const selectedTools: ('claude' | 'codex')[] = [];
  if (tools.claude) selectedTools.push('claude');
  if (tools.codex) selectedTools.push('codex');

  const { setup: runSetup } = await import('../installer/setup.js');
  await runSetup(projectDir, { tools: selectedTools, nonInteractive: true });

  console.log(chalk.green('\nSetup complete!'));
}

async function handleDoctor(): Promise<void> {
  printBanner();
  const projectDir = await getProjectRoot();
  const { doctor: runDoctor } = await import('../installer/setup.js');
  await runDoctor(projectDir);
}

async function handleStatus(): Promise<void> {
  const projectDir = await getProjectRoot();
  const { showStatus: runStatus } = await import('../installer/setup.js');
  await runStatus(projectDir);
}

async function handleSave(options: { tool?: string }): Promise<void> {
  const tool = (options.tool ?? TOOLS.CLAUDE) as 'claude' | 'codex';
  if (tool !== TOOLS.CLAUDE && tool !== TOOLS.CODEX) {
    console.error(chalk.red(`Invalid tool "${tool}". Use --tool claude or --tool codex.`));
    process.exitCode = 1;
    return;
  }

  const projectDir = await getProjectRoot();
  const { createSession: cs, saveSession: ss } = await import('../session/manager.js');
  const session = await cs(projectDir, tool);
  await ss(projectDir, session);
  console.log(chalk.green(`Session saved: .omh/sessions/${tool}/${session.id}.json`));
}

async function handleContinue(): Promise<void> {
  const projectDir = await getProjectRoot();
  const { loadLastSession: lls } = await import('../session/manager.js');
  const session = await lls(projectDir);
  if (!session) {
    console.log(chalk.yellow('No previous session found.'));
    return;
  }
  console.log(chalk.bold(`Resuming session from ${session.startedAt}\n`));
  console.log(`  Tool:    ${session.tool}`);
  console.log(`  Summary: ${session.summary ?? 'N/A'}`);
  if (session.tasksPending.length > 0) {
    console.log(chalk.underline('\nPending tasks:'));
    for (const t of session.tasksPending) console.log(`  - ${t}`);
  }
  if (session.nextSteps.length > 0) {
    console.log(chalk.underline('\nNext steps:'));
    for (const s of session.nextSteps) console.log(`  - ${s}`);
  }
}

async function handleHandoff(target: string): Promise<void> {
  if (target !== TOOLS.CLAUDE && target !== TOOLS.CODEX) {
    console.error(chalk.red(`Invalid target "${target}". Use: claude or codex`));
    process.exitCode = 1;
    return;
  }

  const projectDir = await getProjectRoot();
  const from = target === TOOLS.CLAUDE ? TOOLS.CODEX : TOOLS.CLAUDE;
  const { createHandoff: ch } = await import('../session/manager.js');
  const doc = await ch(projectDir, from, target, 'CLI handoff');
  console.log(chalk.green(`Handoff document created: ${from} → ${target}`));
  console.log(chalk.dim(`Pending tasks transferred: ${doc.tasksPending.length}`));
}

async function handleSessions(): Promise<void> {
  const projectDir = await getProjectRoot();
  const { listSessions: ls } = await import('../session/manager.js');
  const sessions = await ls(projectDir, 20);
  if (sessions.length === 0) {
    console.log(chalk.yellow('No sessions found.'));
    return;
  }
  console.log(chalk.bold(`Recent sessions (${sessions.length}):\n`));
  for (const s of sessions) {
    const icon = s.tool === 'claude' ? chalk.magenta('C') : chalk.green('X');
    console.log(`  [${icon}] ${s.date} - ${s.summary}`);
  }
}

async function handleForge(task: string): Promise<void> {
  const projectDir = await getProjectRoot();
  const {
    createForgeSession,
    decomposeRequest,
    saveForgeArtifact,
    generateSynthesisPrompt,
    generateForgeReport,
  } = await import('../team/dual-forge.js');

  console.log(chalk.bold.cyan('DualForge: Claude + Codex parallel execution\n'));

  // 1. Create forge session
  const session = await createForgeSession(projectDir, task);
  console.log(chalk.dim(`Forge ID: ${session.id}\n`));

  // 2. Decompose
  const prompts = decomposeRequest(task);
  console.log(chalk.underline('Phase 1: Request Decomposed'));
  console.log(chalk.dim(`  Claude prompt: ${prompts.claudePrompt.slice(0, 80)}...`));
  console.log(chalk.dim(`  Codex prompt:  ${prompts.codexPrompt.slice(0, 80)}...`));
  console.log('');

  // 3. Show instructions for manual execution
  console.log(chalk.underline('Phase 2: Execute in both tools'));
  console.log('');
  console.log(chalk.yellow('  Run these prompts in each tool:'));
  console.log('');
  console.log(chalk.magenta('  [Claude Code]'));
  console.log(chalk.dim(`  Paste the Claude prompt from: .omh/dualforge/${session.id}/claude-prompt.md`));
  console.log('');
  console.log(chalk.green('  [Codex CLI]'));
  console.log(chalk.dim(`  Paste the Codex prompt from: .omh/dualforge/${session.id}/codex-prompt.md`));
  console.log('');

  // Save prompts as files for easy access
  await saveForgeArtifact(projectDir, session.id, 'claude', prompts.claudePrompt);
  await saveForgeArtifact(projectDir, session.id, 'codex', prompts.codexPrompt);

  console.log(chalk.underline('Phase 3-4: Collect & Synthesize'));
  console.log(chalk.dim('  After both tools complete, save their outputs to:'));
  console.log(chalk.dim(`    .omh/dualforge/${session.id}/claude-result.md`));
  console.log(chalk.dim(`    .omh/dualforge/${session.id}/codex-result.md`));
  console.log(chalk.dim(`  Then run: omh forge-merge ${session.id}`));
  console.log('');

  console.log(chalk.green(`Forge session created: ${session.id}`));
  console.log(chalk.dim('Tip: In Claude Code, use the keyword "dualforge" or "양쪽에서 해봐" to auto-execute.'));
}

async function handleForgeMerge(forgeId: string): Promise<void> {
  const projectDir = await getProjectRoot();
  const {
    loadForgeArtifacts,
    generateSynthesisPrompt,
    generateForgeReport,
    loadForgeSession,
  } = await import('../team/dual-forge.js');

  const session = await loadForgeSession(projectDir, forgeId);
  if (!session) {
    console.error(chalk.red(`Forge session "${forgeId}" not found.`));
    process.exitCode = 1;
    return;
  }

  const artifacts = await loadForgeArtifacts(projectDir, forgeId);
  const claudeArtifact = artifacts.find((a) => a.filepath.includes('claude-result'));
  const codexArtifact = artifacts.find((a) => a.filepath.includes('codex-result'));

  if (!claudeArtifact || !codexArtifact) {
    console.error(chalk.red('Missing artifacts. Ensure both claude-result.md and codex-result.md exist.'));
    console.log(chalk.dim(`Expected at: .omh/dualforge/${forgeId}/`));
    process.exitCode = 1;
    return;
  }

  console.log(chalk.bold.cyan('DualForge: Synthesising results...\n'));

  const synthesisPrompt = generateSynthesisPrompt(
    session.request,
    claudeArtifact.content,
    codexArtifact.content,
  );

  console.log(chalk.underline('Synthesis Prompt (paste into Claude Code or Codex):'));
  console.log('');
  console.log(synthesisPrompt);
  console.log('');
  console.log(chalk.green('Copy the above prompt and paste it into your preferred AI tool.'));
}

// ── Programme definition ─────────────────────────────────────────────────────

async function main(): Promise<void> {
  const version = await readVersion();
  const program = new Command();

  program
    .name('omh')
    .description('OH-MY-HERMES -- Unified AI agent orchestration for Claude Code + Codex CLI')
    .version(version, '-v, --version', 'Show version');

  program
    .command('setup')
    .description('Interactive project setup (detect tools, create configs)')
    .action(handleSetup);

  program
    .command('doctor')
    .description('Check if omc/omx/claude/codex are installed')
    .action(handleDoctor);

  program
    .command('status')
    .description('Show project status (configured tools, last session)')
    .action(handleStatus);

  program
    .command('save')
    .description('Save current session')
    .option('--tool <tool>', 'Specify tool (claude | codex)')
    .action(handleSave);

  program
    .command('continue')
    .description('Continue last session')
    .action(handleContinue);

  program
    .command('handoff <target>')
    .description('Handoff from one tool to another (claude | codex)')
    .action(handleHandoff);

  program
    .command('sessions')
    .description('List all sessions')
    .action(handleSessions);

  program
    .command('forge <task>')
    .description('DualForge: run task in both Claude + Codex, then merge results')
    .action(handleForge);

  program
    .command('forge-merge <forgeId>')
    .description('Merge DualForge results after both tools have completed')
    .action(handleForgeMerge);

  await program.parseAsync(process.argv);
}

// ── Entry ────────────────────────────────────────────────────────────────────

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(chalk.red(`\nFatal error: ${message}`));
  process.exitCode = 1;
});
