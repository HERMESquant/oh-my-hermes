// ─── oh-my-hermes agent catalog ──────────────────────────────────────────────
//
// All 28+ agents available across Claude Code and Codex CLI.
// Each agent has a defined model tier, category, tool mapping, and capability set.

// ── Types ────────────────────────────────────────────────────────────────────

export type ModelTier = 'opus' | 'sonnet' | 'haiku';
export type AgentCategory = 'build' | 'execution' | 'review' | 'domain';

export interface AgentDefinition {
  /** Unique kebab-case identifier. */
  name: string;
  /** Model tier: opus for deep reasoning, sonnet for balanced, haiku for speed. */
  model: ModelTier;
  /** Functional category. */
  category: AgentCategory;
  /** Human-readable role description. */
  description: string;
  /** Corresponding agent name in oh-my-claude (omc). */
  claudeEquivalent?: string;
  /** Corresponding agent name in oh-my-codex (omx). */
  codexEquivalent?: string;
  /** Tools / capabilities this agent uses. */
  tools: string[];
}

// ── Agent Catalog ────────────────────────────────────────────────────────────

export const AGENT_CATALOG: AgentDefinition[] = [
  // ── Architecture Team ──────────────────────────────────────────────────────
  {
    name: 'architect',
    model: 'opus',
    category: 'build',
    description: 'System architecture designer. Designs scalable, maintainable architectures with clear component boundaries and data flow.',
    claudeEquivalent: 'architect',
    codexEquivalent: 'architect',
    tools: ['Read', 'Glob', 'Grep', 'Write', 'Edit'],
  },
  {
    name: 'ha-specialist',
    model: 'sonnet',
    category: 'domain',
    description: 'High-availability specialist. Designs fault-tolerant systems with redundancy, failover, and disaster recovery.',
    claudeEquivalent: 'ha-specialist',
    codexEquivalent: 'ha-specialist',
    tools: ['Read', 'Glob', 'Grep', 'Write'],
  },
  {
    name: 'devops',
    model: 'sonnet',
    category: 'execution',
    description: 'DevOps engineer. Handles CI/CD pipelines, Docker, Kubernetes, infrastructure as code, and deployment automation.',
    claudeEquivalent: 'devops',
    codexEquivalent: 'devops',
    tools: ['Read', 'Write', 'Edit', 'Bash'],
  },

  // ── Backend Team ───────────────────────────────────────────────────────────
  {
    name: 'api-architect',
    model: 'opus',
    category: 'build',
    description: 'API designer and backend architect. Creates RESTful/GraphQL APIs with proper validation, error handling, and documentation.',
    claudeEquivalent: 'api-architect',
    codexEquivalent: 'api-architect',
    tools: ['Read', 'Write', 'Edit', 'Glob', 'Grep'],
  },
  {
    name: 'perf-engineer',
    model: 'sonnet',
    category: 'execution',
    description: 'Performance engineer. Profiles, benchmarks, and optimizes code for speed, memory, and throughput.',
    claudeEquivalent: 'perf-engineer',
    codexEquivalent: 'perf-engineer',
    tools: ['Read', 'Grep', 'Bash', 'Edit'],
  },
  {
    name: 'exchange-specialist',
    model: 'sonnet',
    category: 'domain',
    description: 'Exchange/trading domain specialist. Expert in exchange APIs (Binance, Bybit, etc.), order management, WebSocket feeds, and market data.',
    claudeEquivalent: 'exchange-specialist',
    codexEquivalent: 'exchange-specialist',
    tools: ['Read', 'Write', 'Edit', 'Grep'],
  },

  // ── Frontend Team ──────────────────────────────────────────────────────────
  {
    name: 'ux-designer',
    model: 'opus',
    category: 'build',
    description: 'UX/UI designer. Creates intuitive interfaces, component hierarchies, and user interaction flows.',
    claudeEquivalent: 'ux-designer',
    codexEquivalent: 'ux-designer',
    tools: ['Read', 'Write', 'Edit', 'Glob'],
  },
  {
    name: 'react-dev',
    model: 'sonnet',
    category: 'execution',
    description: 'React/Next.js developer. Implements components, hooks, state management, and frontend build pipelines.',
    claudeEquivalent: 'react-dev',
    codexEquivalent: 'react-dev',
    tools: ['Read', 'Write', 'Edit', 'Bash', 'Glob'],
  },
  {
    name: 'dashboard-specialist',
    model: 'sonnet',
    category: 'domain',
    description: 'Dashboard and data visualization specialist. Creates charts, real-time displays, and monitoring interfaces.',
    claudeEquivalent: 'dashboard-specialist',
    codexEquivalent: 'dashboard-specialist',
    tools: ['Read', 'Write', 'Edit', 'Glob'],
  },

  // ── Integration Team ───────────────────────────────────────────────────────
  {
    name: 'saas',
    model: 'sonnet',
    category: 'build',
    description: 'SaaS integration architect. Designs multi-tenant systems, subscription billing, onboarding flows, and API rate limiting.',
    claudeEquivalent: 'saas',
    codexEquivalent: 'saas',
    tools: ['Read', 'Write', 'Edit', 'Grep'],
  },
  {
    name: 'security',
    model: 'opus',
    category: 'review',
    description: 'Security engineer. Audits for vulnerabilities, implements auth/authz, encryption, and secure coding practices.',
    claudeEquivalent: 'security',
    codexEquivalent: 'security',
    tools: ['Read', 'Grep', 'Glob', 'Edit'],
  },
  {
    name: 'db-architect',
    model: 'sonnet',
    category: 'build',
    description: 'Database architect. Designs schemas, migrations, query optimization, indexing strategies, and data modeling.',
    claudeEquivalent: 'db-architect',
    codexEquivalent: 'db-architect',
    tools: ['Read', 'Write', 'Edit', 'Bash'],
  },

  // ── QA Team ────────────────────────────────────────────────────────────────
  {
    name: 'test-engineer',
    model: 'sonnet',
    category: 'execution',
    description: 'Test engineer. Writes unit, integration, and e2e tests with comprehensive coverage strategies.',
    claudeEquivalent: 'test-engineer',
    codexEquivalent: 'test-engineer',
    tools: ['Read', 'Write', 'Edit', 'Bash', 'Glob'],
  },
  {
    name: 'qa-tester',
    model: 'haiku',
    category: 'execution',
    description: 'QA tester. Executes test suites, reports bugs, validates edge cases, and performs regression testing.',
    claudeEquivalent: 'qa-tester',
    codexEquivalent: 'qa-tester',
    tools: ['Read', 'Bash', 'Grep'],
  },
  {
    name: 'verifier',
    model: 'haiku',
    category: 'review',
    description: 'Build verifier. Validates that code compiles, tests pass, and builds succeed before integration.',
    claudeEquivalent: 'verifier',
    codexEquivalent: 'verifier',
    tools: ['Bash', 'Read', 'Grep'],
  },

  // ── Optimization Team ──────────────────────────────────────────────────────
  {
    name: 'code-simplifier',
    model: 'sonnet',
    category: 'review',
    description: 'Code simplifier. Reduces complexity, eliminates dead code, improves readability without changing behavior.',
    claudeEquivalent: 'code-simplifier',
    codexEquivalent: 'code-simplifier',
    tools: ['Read', 'Edit', 'Grep', 'Glob'],
  },
  {
    name: 'scientist',
    model: 'opus',
    category: 'review',
    description: 'Algorithm scientist. Designs optimal algorithms, evaluates time/space complexity, and selects best data structures.',
    claudeEquivalent: 'scientist',
    codexEquivalent: 'scientist',
    tools: ['Read', 'Grep', 'Write', 'Edit'],
  },

  // ── Bug Team ───────────────────────────────────────────────────────────────
  {
    name: 'debugger',
    model: 'opus',
    category: 'execution',
    description: 'Expert debugger. Traces execution paths, inspects state, and isolates root causes with systematic analysis.',
    claudeEquivalent: 'debugger',
    codexEquivalent: 'debugger',
    tools: ['Read', 'Grep', 'Bash', 'Glob'],
  },
  {
    name: 'build-fixer',
    model: 'sonnet',
    category: 'execution',
    description: 'Build/config fixer. Resolves compilation errors, dependency conflicts, and configuration issues.',
    claudeEquivalent: 'build-fixer',
    codexEquivalent: 'build-fixer',
    tools: ['Read', 'Edit', 'Bash', 'Grep'],
  },
  {
    name: 'root-cause-analyst',
    model: 'opus',
    category: 'review',
    description: 'Root cause analyst. Performs deep causal analysis of bugs, failures, and system anomalies.',
    claudeEquivalent: 'root-cause-analyst',
    codexEquivalent: 'root-cause-analyst',
    tools: ['Read', 'Grep', 'Glob', 'Bash'],
  },

  // ── Planning Team ──────────────────────────────────────────────────────────
  {
    name: 'planner',
    model: 'opus',
    category: 'build',
    description: 'Project planner. Breaks down complex tasks into phases, creates execution plans, and defines milestones.',
    claudeEquivalent: 'planner',
    codexEquivalent: 'planner',
    tools: ['Read', 'Write', 'Glob', 'Grep'],
  },
  {
    name: 'analyst',
    model: 'sonnet',
    category: 'review',
    description: 'Requirements analyst. Analyzes specs, identifies gaps, validates assumptions, and clarifies ambiguous requirements.',
    claudeEquivalent: 'analyst',
    codexEquivalent: 'analyst',
    tools: ['Read', 'Grep', 'Glob'],
  },
  {
    name: 'critic',
    model: 'opus',
    category: 'review',
    description: 'Design critic. Challenges assumptions, identifies risks, and provides constructive feedback on proposed designs.',
    claudeEquivalent: 'critic',
    codexEquivalent: 'critic',
    tools: ['Read', 'Grep', 'Glob'],
  },

  // ── Review Team ────────────────────────────────────────────────────────────
  {
    name: 'code-reviewer',
    model: 'opus',
    category: 'review',
    description: 'Senior code reviewer. Evaluates code quality, patterns, naming, SOLID principles, and maintainability.',
    claudeEquivalent: 'code-reviewer',
    codexEquivalent: 'code-reviewer',
    tools: ['Read', 'Grep', 'Glob', 'Edit'],
  },
  {
    name: 'security-reviewer',
    model: 'opus',
    category: 'review',
    description: 'Security code reviewer. Identifies injection attacks, auth bypasses, data leaks, and insecure patterns.',
    claudeEquivalent: 'security-reviewer',
    codexEquivalent: 'security-reviewer',
    tools: ['Read', 'Grep', 'Glob'],
  },
  {
    name: 'quality-reviewer',
    model: 'sonnet',
    category: 'review',
    description: 'Quality assurance reviewer. Validates test coverage, documentation completeness, and coding standard compliance.',
    claudeEquivalent: 'quality-reviewer',
    codexEquivalent: 'quality-reviewer',
    tools: ['Read', 'Grep', 'Glob', 'Bash'],
  },

  // ── Specialist Agents ──────────────────────────────────────────────────────
  {
    name: 'doc-writer',
    model: 'sonnet',
    category: 'build',
    description: 'Technical writer. Creates API docs, READMEs, architecture docs, and inline code documentation.',
    claudeEquivalent: 'doc-writer',
    codexEquivalent: 'doc-writer',
    tools: ['Read', 'Write', 'Edit', 'Glob'],
  },
  {
    name: 'migrator',
    model: 'sonnet',
    category: 'execution',
    description: 'Migration specialist. Handles database migrations, API versioning, dependency upgrades, and breaking changes.',
    claudeEquivalent: 'migrator',
    codexEquivalent: 'migrator',
    tools: ['Read', 'Write', 'Edit', 'Bash', 'Grep'],
  },
  {
    name: 'refactorer',
    model: 'sonnet',
    category: 'execution',
    description: 'Refactoring specialist. Restructures code for better modularity, reduces coupling, and improves testability.',
    claudeEquivalent: 'refactorer',
    codexEquivalent: 'refactorer',
    tools: ['Read', 'Write', 'Edit', 'Grep', 'Glob'],
  },
];

// ── Lookup helpers ───────────────────────────────────────────────────────────

/**
 * Find an agent definition by name. Returns `undefined` when not found.
 */
export function getAgent(name: string): AgentDefinition | undefined {
  return AGENT_CATALOG.find((a) => a.name === name);
}

/**
 * Return all agents in a given category.
 */
export function getAgentsByCategory(category: AgentCategory): AgentDefinition[] {
  return AGENT_CATALOG.filter((a) => a.category === category);
}

/**
 * Return all agents assigned to a specific model tier.
 */
export function getAgentsByModel(model: ModelTier): AgentDefinition[] {
  return AGENT_CATALOG.filter((a) => a.model === model);
}

/**
 * Return agent names as a simple string array (useful for template rendering).
 */
export function getAgentNames(): string[] {
  return AGENT_CATALOG.map((a) => a.name);
}
