// ─── oh-my-hermes team router ────────────────────────────────────────────────
//
// Smart routing that analyses a user request, detects its type, and assigns
// the optimal tool (Claude Code / Codex CLI) plus the right agent team.

import { AGENT_CATALOG, type AgentDefinition } from './agents.js';

// ── Types ────────────────────────────────────────────────────────────────────

export interface TeamMember {
  /** Agent name from the catalog. */
  name: string;
  /** Model tier assigned for this task. */
  model: string;
  /** Concise role description within this team assignment. */
  role: string;
}

export interface TeamAssignment {
  /** Pipeline phase name (e.g., "design", "implement", "review"). */
  phase: string;
  /** Which CLI tool should execute this phase. */
  tool: 'claude' | 'codex';
  /** Agents involved in this phase. */
  agents: TeamMember[];
  /** Why this tool/team was chosen. */
  reason: string;
}

export interface RoutingResult {
  /** Ordered list of team assignments (pipeline). */
  assignments: TeamAssignment[];
  /** Overall estimated complexity. */
  estimatedComplexity: 'low' | 'medium' | 'high';
  /** Human-readable recommended workflow name. */
  recommendedWorkflow: string;
}

// ── Request type keywords ────────────────────────────────────────────────────
// Maps keywords (English + Korean) to canonical request types.

const KEYWORD_MAP: Record<string, string[]> = {
  dualforge: [
    'dualforge', 'dual forge', 'dual', 'forge', 'both tools', 'compare both',
    '양쪽에서 해봐', '둘 다 해봐', '비교해서 해봐', '양쪽에서', '둘 다',
    'ccg', 'tri-model', '병합해서', '합쳐서', '장점만',
  ],
  architecture: [
    'architect', 'architecture', 'design', 'system design', 'component',
    'diagram', 'structure', '설계', '아키텍처', '구조',
  ],
  backend: [
    'api', 'endpoint', 'server', 'backend', 'rest', 'graphql', 'grpc',
    'microservice', '백엔드', '서버', 'route', 'handler', 'middleware',
  ],
  frontend: [
    'frontend', 'ui', 'ux', 'component', 'react', 'next', 'dashboard',
    'layout', 'css', 'style', 'responsive', '프론트엔드', '화면', 'page',
  ],
  integration: [
    'integrate', 'integration', 'connect', 'saas', 'third-party', 'webhook',
    'database', 'db', 'schema', 'migration', 'auth', '통합', '연동',
  ],
  qa: [
    'test', 'testing', 'e2e', 'unit test', 'integration test', 'coverage',
    'spec', 'jest', 'vitest', 'cypress', 'playwright', '테스트', '검증',
  ],
  optimization: [
    'optimize', 'performance', 'speed', 'memory', 'bundle', 'lazy',
    'cache', 'profil', 'benchmark', 'refactor', 'simplify', '최적화', '성능',
  ],
  bug: [
    'bug', 'fix', 'error', 'crash', 'broken', 'issue', 'debug', 'fail',
    'exception', 'stack trace', 'regression', '버그', '에러', '오류', '수정',
  ],
  planning: [
    'plan', 'roadmap', 'milestone', 'phase', 'breakdown', 'estimate',
    'scope', 'spec', 'requirement', 'epic', 'story', '계획', '기획', '로드맵',
  ],
  review: [
    'review', 'audit', 'inspect', 'check', 'quality', 'security review',
    'code review', 'pr review', '리뷰', '검토', '감사',
  ],
  implement: [
    'implement', 'build', 'create', 'add', 'develop', 'feature', 'write',
    'code', 'scaffold', 'generate', '구현', '개발', '만들어', '작성',
  ],
};

// ── Team compositions ────────────────────────────────────────────────────────
// For each request type, define the default team assignments and tool routing.

interface TeamTemplate {
  phases: Array<{
    phase: string;
    tool: 'claude' | 'codex';
    agentNames: string[];
    reason: string;
  }>;
  workflow: string;
}

const TEAM_TEMPLATES: Record<string, TeamTemplate> = {
  dualforge: {
    phases: [
      {
        phase: 'decompose',
        tool: 'claude',
        agentNames: ['planner'],
        reason: 'Decompose request into Claude-optimised and Codex-optimised prompts.',
      },
      {
        phase: 'claude-execute',
        tool: 'claude',
        agentNames: ['architect', 'code-reviewer'],
        reason: 'Claude analyses architecture, security, design trade-offs (opus reasoning).',
      },
      {
        phase: 'codex-execute',
        tool: 'codex',
        agentNames: ['api-architect', 'perf-engineer', 'test-engineer'],
        reason: 'Codex generates implementation, code, tests (parallel execution).',
      },
      {
        phase: 'synthesize',
        tool: 'claude',
        agentNames: ['analyst', 'critic'],
        reason: 'Claude merges both outputs: agreed points, conflicts, final merged result.',
      },
    ],
    workflow: 'dualforge',
  },

  architecture: {
    phases: [
      {
        phase: 'design',
        tool: 'claude',
        agentNames: ['architect', 'ha-specialist', 'devops'],
        reason: 'Architecture requires deep reasoning and holistic system thinking (opus).',
      },
      {
        phase: 'review',
        tool: 'claude',
        agentNames: ['critic', 'security-reviewer'],
        reason: 'Design review benefits from opus-level critical analysis.',
      },
    ],
    workflow: 'ralplan',
  },

  backend: {
    phases: [
      {
        phase: 'design',
        tool: 'claude',
        agentNames: ['api-architect'],
        reason: 'API design requires careful reasoning about contracts and data flow.',
      },
      {
        phase: 'implement',
        tool: 'codex',
        agentNames: ['api-architect', 'perf-engineer', 'exchange-specialist'],
        reason: 'Parallel implementation across multiple files with Codex agents.',
      },
      {
        phase: 'test',
        tool: 'codex',
        agentNames: ['test-engineer', 'qa-tester'],
        reason: 'Parallel test writing and execution with Codex.',
      },
    ],
    workflow: 'ultrawork',
  },

  frontend: {
    phases: [
      {
        phase: 'design',
        tool: 'claude',
        agentNames: ['ux-designer'],
        reason: 'UI/UX design benefits from opus creative reasoning.',
      },
      {
        phase: 'implement',
        tool: 'codex',
        agentNames: ['react-dev', 'dashboard-specialist'],
        reason: 'Component implementation works well in parallel via Codex.',
      },
      {
        phase: 'review',
        tool: 'claude',
        agentNames: ['code-reviewer', 'quality-reviewer'],
        reason: 'UI review benefits from deep pattern analysis.',
      },
    ],
    workflow: 'ultrawork',
  },

  integration: {
    phases: [
      {
        phase: 'design',
        tool: 'claude',
        agentNames: ['saas', 'db-architect', 'security'],
        reason: 'Integration architecture needs careful security and schema reasoning.',
      },
      {
        phase: 'implement',
        tool: 'codex',
        agentNames: ['saas', 'db-architect'],
        reason: 'Multi-file integration code benefits from parallel Codex agents.',
      },
      {
        phase: 'verify',
        tool: 'codex',
        agentNames: ['verifier', 'test-engineer'],
        reason: 'Integration verification runs in parallel via Codex.',
      },
    ],
    workflow: 'team',
  },

  qa: {
    phases: [
      {
        phase: 'plan',
        tool: 'claude',
        agentNames: ['test-engineer'],
        reason: 'Test strategy planning benefits from opus reasoning.',
      },
      {
        phase: 'execute',
        tool: 'codex',
        agentNames: ['test-engineer', 'qa-tester', 'verifier'],
        reason: 'Test writing and execution runs efficiently in parallel via Codex.',
      },
    ],
    workflow: 'autopilot',
  },

  optimization: {
    phases: [
      {
        phase: 'analyze',
        tool: 'claude',
        agentNames: ['perf-engineer', 'scientist'],
        reason: 'Performance analysis needs deep algorithmic reasoning (opus).',
      },
      {
        phase: 'implement',
        tool: 'codex',
        agentNames: ['perf-engineer', 'code-simplifier'],
        reason: 'Optimization changes across many files benefit from parallel Codex.',
      },
      {
        phase: 'verify',
        tool: 'codex',
        agentNames: ['verifier', 'qa-tester'],
        reason: 'Benchmark verification runs in parallel.',
      },
    ],
    workflow: 'ralph',
  },

  bug: {
    phases: [
      {
        phase: 'diagnose',
        tool: 'claude',
        agentNames: ['debugger', 'root-cause-analyst'],
        reason: 'Bug diagnosis requires deep reasoning to trace execution paths (opus).',
      },
      {
        phase: 'fix',
        tool: 'claude',
        agentNames: ['build-fixer', 'debugger'],
        reason: 'Targeted fixes benefit from Claude opus context awareness.',
      },
      {
        phase: 'verify',
        tool: 'codex',
        agentNames: ['verifier', 'qa-tester'],
        reason: 'Regression testing runs in parallel via Codex.',
      },
    ],
    workflow: 'ralph',
  },

  planning: {
    phases: [
      {
        phase: 'analyze',
        tool: 'claude',
        agentNames: ['planner', 'analyst', 'critic'],
        reason: 'Planning requires deep analytical reasoning and critical evaluation (opus).',
      },
    ],
    workflow: 'ralplan',
  },

  review: {
    phases: [
      {
        phase: 'review',
        tool: 'claude',
        agentNames: ['code-reviewer', 'security-reviewer', 'quality-reviewer'],
        reason: 'Code review requires opus-level pattern recognition and security awareness.',
      },
    ],
    workflow: 'ralph',
  },

  implement: {
    phases: [
      {
        phase: 'plan',
        tool: 'claude',
        agentNames: ['planner', 'architect'],
        reason: 'Implementation planning benefits from opus reasoning.',
      },
      {
        phase: 'implement',
        tool: 'codex',
        agentNames: ['react-dev', 'api-architect', 'db-architect'],
        reason: 'Multi-file implementation runs efficiently in parallel via Codex.',
      },
      {
        phase: 'test',
        tool: 'codex',
        agentNames: ['test-engineer', 'verifier'],
        reason: 'Test creation runs in parallel with Codex.',
      },
      {
        phase: 'review',
        tool: 'claude',
        agentNames: ['code-reviewer', 'quality-reviewer'],
        reason: 'Final review benefits from opus deep analysis.',
      },
    ],
    workflow: 'ultrawork',
  },
};

// ── Complexity estimation ────────────────────────────────────────────────────

const COMPLEXITY_SIGNALS: Record<string, number> = {
  // high complexity
  'architecture': 3, 'system design': 3, 'migration': 3, 'refactor entire': 3,
  'redesign': 3, 'from scratch': 3, 'full stack': 3,
  // medium complexity
  'feature': 2, 'implement': 2, 'integrate': 2, 'optimize': 2,
  'api': 2, 'test suite': 2, 'dashboard': 2,
  // low complexity
  'fix': 1, 'bug': 1, 'typo': 1, 'rename': 1, 'update': 1,
  'add field': 1, 'small': 1, 'simple': 1, 'tweak': 1,
};

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Detect the types/categories a request belongs to based on keyword matching.
 * Returns an array of canonical type strings, ordered by match strength.
 */
export function detectRequestType(request: string): string[] {
  const lower = request.toLowerCase();
  const scores: Record<string, number> = {};

  for (const [type, keywords] of Object.entries(KEYWORD_MAP)) {
    let score = 0;
    for (const kw of keywords) {
      if (lower.includes(kw)) {
        // Longer keyword matches get more weight.
        score += kw.length;
      }
    }
    if (score > 0) {
      scores[type] = score;
    }
  }

  return Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .map(([type]) => type);
}

/**
 * Get the team assignments for a given request type.
 * Falls back to "implement" when the type is not recognised.
 */
export function getTeamForType(type: string): TeamAssignment[] {
  const template = TEAM_TEMPLATES[type] ?? TEAM_TEMPLATES['implement']!;
  return template.phases.map((p) => ({
    phase: p.phase,
    tool: p.tool,
    agents: resolveAgents(p.agentNames),
    reason: p.reason,
  }));
}

/**
 * Analyse a request string and project context, then return the full routing
 * result: which tools, which agents, what pipeline, and estimated complexity.
 */
export function routeRequest(
  request: string,
  _projectContext: object = {},
): RoutingResult {
  const types = detectRequestType(request);
  const primaryType = types[0] ?? 'implement';

  // Build merged assignments from all detected types (primary first).
  const seenPhases = new Set<string>();
  const assignments: TeamAssignment[] = [];

  for (const type of types) {
    const teamAssignments = getTeamForType(type);
    for (const ta of teamAssignments) {
      const key = `${ta.phase}:${ta.tool}`;
      if (!seenPhases.has(key)) {
        seenPhases.add(key);
        assignments.push(ta);
      }
    }
  }

  // If nothing matched at all, use implement as fallback.
  if (assignments.length === 0) {
    assignments.push(...getTeamForType('implement'));
  }

  const estimatedComplexity = estimateComplexity(request, types);
  const recommendedWorkflow =
    TEAM_TEMPLATES[primaryType]?.workflow ?? 'ultrawork';

  return {
    assignments,
    estimatedComplexity,
    recommendedWorkflow,
  };
}

// ── Internal helpers ─────────────────────────────────────────────────────────

function resolveAgents(names: string[]): TeamMember[] {
  return names.map((name) => {
    const def: AgentDefinition | undefined = AGENT_CATALOG.find(
      (a) => a.name === name,
    );
    return {
      name,
      model: def?.model ?? 'sonnet',
      role: def?.description ?? name,
    };
  });
}

function estimateComplexity(
  request: string,
  types: string[],
): 'low' | 'medium' | 'high' {
  const lower = request.toLowerCase();
  let score = 0;

  for (const [signal, weight] of Object.entries(COMPLEXITY_SIGNALS)) {
    if (lower.includes(signal)) {
      score = Math.max(score, weight);
    }
  }

  // Multiple detected types increase complexity.
  if (types.length >= 3) {
    score = Math.max(score, 3);
  } else if (types.length >= 2) {
    score = Math.max(score, 2);
  }

  if (score >= 3) return 'high';
  if (score >= 2) return 'medium';
  return 'low';
}
