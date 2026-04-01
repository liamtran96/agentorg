/**
 * Orchestrator Decision Matrix Eval
 *
 * Data-driven evaluation of the 6-check policy engine across many scenarios.
 * Each case specifies an agent, action, config overrides, and the expected
 * decision + check results. This catches regressions in check ordering,
 * short-circuit logic, and multi-check interactions.
 */
import { describe, it, expect } from 'vitest';
import { Orchestrator } from '@agentorg/core';
import type { CompanyConfig, ActionRecord, OrchestratorDecision } from '@agentorg/core';

// ─── Base config shared across all eval cases ──────────────────────────────

const baseConfig: CompanyConfig = {
  company: { name: 'Eval Co', description: '', timezone: 'UTC', businessHours: '09:00-18:00' },
  org: {
    ceo: {
      id: 'ceo', name: 'Alex', role: 'ceo', runtime: 'claude-agent-sdk',
      personality: '', budget: 50, reportsTo: 'board',
      skills: ['browser', 'email', 'calendar', 'billing', 'crm'],
    },
    writer: {
      id: 'writer', name: 'Maya', role: 'writer', runtime: 'claude-agent-sdk',
      personality: '', budget: 20, reportsTo: 'ceo',
      skills: ['browser', 'filesystem'],
    },
    support: {
      id: 'support', name: 'Sam', role: 'support', runtime: 'anthropic-api',
      personality: '', budget: 10, reportsTo: 'ceo',
      skills: ['email', 'crm'],
    },
    intern: {
      id: 'intern', name: 'Jo', role: 'intern', runtime: 'http',
      personality: '', budget: 2, reportsTo: 'writer',
      skills: ['filesystem'],
    },
  },
  governance: {
    rules: [
      { action: 'billing.refund', requires: 'board_approval' },
      { action: 'email.send_external', requires: 'ceo_approval' },
      { action: 'crm.*', requires: 'auto_approve' },
      { action: 'billing.credit', requires: 'ceo_approval', above: 50 },
    ],
  },
  safety: {
    brandCheck: {
      enabled: true,
      blockedWords: ['competitor-corp', 'free forever'],
    },
    factCheck: { enabled: true, sourceOfTruth: [] },
    blockMode: 'block',
  },
};

// ─── Helpers ───────────────────────────────────────────────────────────────

const makeAction = (
  agentId: string,
  type: string,
  overrides?: Partial<ActionRecord>,
): ActionRecord => ({
  id: `eval_${Math.random().toString(36).slice(2, 8)}`,
  agentId,
  type,
  description: overrides?.description ?? 'eval action',
  timestamp: new Date(),
  input: overrides?.input ?? {},
  orchestratorDecision: 'ALLOWED',
  cost: overrides?.cost,
  ...overrides,
});

interface EvalCase {
  name: string;
  agentId: string;
  actionType: string;
  actionOverrides?: Partial<ActionRecord>;
  /** Pre-record spend before the check */
  preSpend?: number;
  expectedDecision: OrchestratorDecision;
  /** Subset of check results to assert */
  expectedChecks?: Partial<Record<'permission' | 'scope' | 'budget' | 'rateLimit' | 'safety' | 'approval', boolean>>;
  /** Substring expected in reason */
  reasonContains?: string;
}

// ─── Eval Cases ────────────────────────────────────────────────────────────

const cases: EvalCase[] = [
  // ── Happy-path ALLOWED ────────────────────────────────────────────────
  {
    name: 'CEO browser action — all checks pass',
    agentId: 'ceo', actionType: 'browser.navigate',
    expectedDecision: 'ALLOWED',
    expectedChecks: { permission: true, budget: true, safety: true },
  },
  {
    name: 'CEO email send — allowed (no governance rule for email.send)',
    agentId: 'ceo', actionType: 'email.send',
    expectedDecision: 'ALLOWED',
  },
  {
    name: 'Writer browser search — within skills',
    agentId: 'writer', actionType: 'browser.search',
    expectedDecision: 'ALLOWED',
    expectedChecks: { permission: true },
  },
  {
    name: 'Writer filesystem write — within skills',
    agentId: 'writer', actionType: 'filesystem.write',
    expectedDecision: 'ALLOWED',
  },
  {
    name: 'Support email send — within skills (no governance match for email.send)',
    agentId: 'support', actionType: 'email.send',
    expectedDecision: 'ALLOWED',
  },
  {
    name: 'Intern filesystem read — within skills',
    agentId: 'intern', actionType: 'filesystem.read',
    expectedDecision: 'ALLOWED',
  },

  // ── Permission BLOCKED ────────────────────────────────────────────────
  {
    name: 'Writer cannot send email — missing email skill',
    agentId: 'writer', actionType: 'email.send',
    expectedDecision: 'BLOCKED',
    expectedChecks: { permission: false },
    reasonContains: 'PERMISSION',
  },
  {
    name: 'Writer CRM update — governance crm.* auto_approve bypasses permission check',
    agentId: 'writer', actionType: 'crm.update',
    expectedDecision: 'ALLOWED',
    // Governance-matched actions skip the permission check, so even though
    // writer lacks the crm skill, the auto_approve rule takes precedence
    expectedChecks: { permission: true, approval: true },
  },
  {
    name: 'Support cannot use browser — missing browser skill',
    agentId: 'support', actionType: 'browser.navigate',
    expectedDecision: 'BLOCKED',
    expectedChecks: { permission: false },
  },
  {
    name: 'Intern cannot send email — missing email skill',
    agentId: 'intern', actionType: 'email.send',
    expectedDecision: 'BLOCKED',
    expectedChecks: { permission: false },
  },
  {
    name: 'Intern cannot use browser — missing browser skill',
    agentId: 'intern', actionType: 'browser.search',
    expectedDecision: 'BLOCKED',
    expectedChecks: { permission: false },
  },

  // ── Unknown agent BLOCKED ─────────────────────────────────────────────
  {
    name: 'Unknown agent — blocked immediately',
    agentId: 'ghost', actionType: 'browser.search',
    expectedDecision: 'BLOCKED',
    reasonContains: 'not in org chart',
  },

  // ── Budget BLOCKED ────────────────────────────────────────────────────
  {
    name: 'Intern exceeds tiny budget — blocked',
    agentId: 'intern', actionType: 'filesystem.write',
    preSpend: 2.00, // exactly at budget
    expectedDecision: 'BLOCKED',
    expectedChecks: { permission: true, budget: false },
    reasonContains: 'budget',
  },
  {
    name: 'Writer budget exhausted — blocked on browser action',
    agentId: 'writer', actionType: 'browser.search',
    preSpend: 19.99, // budget = 20, action cost = 0.02
    expectedDecision: 'BLOCKED',
    expectedChecks: { budget: false },
  },

  // ── Safety BLOCKED ────────────────────────────────────────────────────
  {
    name: 'Content with blocked word "competitor-corp" — blocked',
    agentId: 'ceo', actionType: 'email.send',
    actionOverrides: { description: 'We are better than competitor-corp in every way' },
    expectedDecision: 'BLOCKED',
    expectedChecks: { safety: false },
    reasonContains: 'SAFETY',
  },
  {
    name: 'Content with blocked phrase "free forever" — blocked',
    agentId: 'writer', actionType: 'filesystem.write',
    actionOverrides: { description: 'Our product is free forever with no limits' },
    expectedDecision: 'BLOCKED',
    expectedChecks: { safety: false },
  },
  {
    name: 'Fact check failure — contradicts source of truth',
    agentId: 'ceo', actionType: 'email.send',
    actionOverrides: {
      description: 'Our company was founded in 1990 and has 500 employees',
      input: { sourceOfTruth: { founded: '2024', employees: '12' } },
    },
    expectedDecision: 'BLOCKED',
    expectedChecks: { safety: false },
  },

  // ── Governance QUEUED ─────────────────────────────────────────────────
  {
    name: 'billing.refund requires board_approval — queued',
    agentId: 'ceo', actionType: 'billing.refund',
    expectedDecision: 'QUEUED',
    expectedChecks: { approval: false },
    reasonContains: 'board_approval',
  },
  {
    name: 'email.send_external requires ceo_approval — queued',
    agentId: 'support', actionType: 'email.send_external',
    expectedDecision: 'QUEUED',
    expectedChecks: { approval: false },
    reasonContains: 'ceo_approval',
  },

  // ── Governance auto_approve ───────────────────────────────────────────
  {
    name: 'crm.update auto-approved by wildcard rule — allowed',
    agentId: 'support', actionType: 'crm.update',
    expectedDecision: 'ALLOWED',
    expectedChecks: { approval: true },
  },
  {
    name: 'crm.lookup auto-approved by wildcard rule — allowed',
    agentId: 'support', actionType: 'crm.lookup',
    expectedDecision: 'ALLOWED',
    expectedChecks: { approval: true },
  },
  {
    name: 'crm.delete auto-approved by wildcard rule — allowed',
    agentId: 'ceo', actionType: 'crm.delete',
    expectedDecision: 'ALLOWED',
  },

  // ── Threshold-based governance ────────────────────────────────────────
  {
    name: 'billing.credit $25 — below threshold, allowed',
    agentId: 'ceo', actionType: 'billing.credit',
    actionOverrides: { cost: 25 },
    expectedDecision: 'ALLOWED',
    expectedChecks: { approval: true },
  },
  {
    name: 'billing.credit $50 — at threshold, allowed',
    agentId: 'ceo', actionType: 'billing.credit',
    actionOverrides: { cost: 50 },
    expectedDecision: 'ALLOWED',
  },
  {
    name: 'billing.credit $75 — above threshold, queued',
    agentId: 'ceo', actionType: 'billing.credit',
    actionOverrides: { cost: 75 },
    expectedDecision: 'QUEUED',
    expectedChecks: { approval: false },
    reasonContains: 'ceo_approval',
  },
  {
    name: 'billing.credit $0 — zero cost, allowed',
    agentId: 'ceo', actionType: 'billing.credit',
    actionOverrides: { cost: 0 },
    expectedDecision: 'ALLOWED',
  },

  // ── Multi-check interaction: budget + safety ──────────────────────────
  {
    name: 'Budget exhausted takes priority over safety violation',
    agentId: 'writer', actionType: 'filesystem.write',
    preSpend: 20, // exhausted
    actionOverrides: { description: 'competitor-corp is bad' },
    expectedDecision: 'BLOCKED',
    // Budget check runs before safety, so budget should fail first
    expectedChecks: { budget: false },
    reasonContains: 'BUDGET',
  },

  // ── Clean content passes safety ───────────────────────────────────────
  {
    name: 'Professional content passes safety — no blocked words',
    agentId: 'ceo', actionType: 'email.send',
    actionOverrides: { description: 'Thank you for your continued partnership. We look forward to collaborating.' },
    expectedDecision: 'ALLOWED',
    expectedChecks: { safety: true },
  },
];

// ─── Run Eval Suite ────────────────────────────────────────────────────────

describe('Eval — Orchestrator Decision Matrix', () => {
  it.each(cases.map((c) => [c.name, c] as const))('%s', (_name, evalCase) => {
    const orchestrator = new Orchestrator(baseConfig);

    // Pre-record spend if specified
    if (evalCase.preSpend !== undefined) {
      orchestrator.recordSpend(evalCase.agentId, evalCase.preSpend);
    }

    const action = makeAction(
      evalCase.agentId,
      evalCase.actionType,
      evalCase.actionOverrides,
    );

    const result = orchestrator.check(evalCase.agentId, action);

    // Assert decision
    expect(result.decision).toBe(evalCase.expectedDecision);

    // Assert check results if specified
    if (evalCase.expectedChecks) {
      for (const [check, expected] of Object.entries(evalCase.expectedChecks)) {
        expect(result.checkResults[check as keyof typeof result.checkResults],
          `checkResults.${check} should be ${expected}`).toBe(expected);
      }
    }

    // Assert reason contains expected substring
    if (evalCase.reasonContains) {
      expect(result.reason.toUpperCase()).toContain(evalCase.reasonContains.toUpperCase());
    }
  });
});
