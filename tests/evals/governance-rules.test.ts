/**
 * Governance Rule Matching Eval
 *
 * Evaluates the governance rule system: exact matches, wildcard patterns,
 * threshold-based rules, rule precedence, and interactions between governance
 * and the 6-check pipeline.
 */
import { describe, it, expect } from 'vitest';
import { Orchestrator } from '@agentorg/core';
import type { CompanyConfig, ActionRecord, GovernanceRule } from '@agentorg/core';

const makeConfig = (rules: GovernanceRule[]): CompanyConfig => ({
  company: { name: 'Gov Eval Co', description: '', timezone: 'UTC', businessHours: '09:00-18:00' },
  org: {
    agent: {
      id: 'agent', name: 'Agent', role: 'worker', runtime: 'claude-agent-sdk',
      personality: '', budget: 100, reportsTo: 'ceo',
      skills: ['email', 'browser', 'billing', 'crm', 'filesystem', 'calendar', 'messaging', 'support'],
    },
  },
  governance: { rules },
});

const makeAction = (type: string, cost?: number): ActionRecord => ({
  id: `gov_${Math.random().toString(36).slice(2, 8)}`,
  agentId: 'agent', type, description: 'governance eval',
  timestamp: new Date(), input: {},
  orchestratorDecision: 'ALLOWED',
  cost,
});

describe('Eval — Governance Rule Matching', () => {
  // ── Exact match rules ─────────────────────────────────────────────────

  describe('Exact match rules', () => {
    const rules: GovernanceRule[] = [
      { action: 'billing.refund', requires: 'board_approval' },
      { action: 'email.send_external', requires: 'ceo_approval' },
      { action: 'support.reply', requires: 'auto_approve' },
    ];
    const orch = new Orchestrator(makeConfig(rules));

    it('billing.refund → QUEUED (board_approval)', () => {
      const result = orch.check('agent', makeAction('billing.refund'));
      expect(result.decision).toBe('QUEUED');
      expect(result.reason).toContain('board_approval');
    });

    it('email.send_external → QUEUED (ceo_approval)', () => {
      const result = orch.check('agent', makeAction('email.send_external'));
      expect(result.decision).toBe('QUEUED');
      expect(result.reason).toContain('ceo_approval');
    });

    it('support.reply → ALLOWED (auto_approve)', () => {
      const result = orch.check('agent', makeAction('support.reply'));
      expect(result.decision).toBe('ALLOWED');
    });

    it('email.send (no rule match) → ALLOWED', () => {
      const result = orch.check('agent', makeAction('email.send'));
      expect(result.decision).toBe('ALLOWED');
    });

    it('billing.charge (no rule match) → ALLOWED', () => {
      const result = orch.check('agent', makeAction('billing.charge'));
      expect(result.decision).toBe('ALLOWED');
    });
  });

  // ── Wildcard rules ────────────────────────────────────────────────────

  describe('Wildcard rules (action.*)', () => {
    const rules: GovernanceRule[] = [
      { action: 'billing.*', requires: 'ceo_approval' },
      { action: 'crm.*', requires: 'auto_approve' },
    ];
    const orch = new Orchestrator(makeConfig(rules));

    it('billing.refund → QUEUED (matches billing.*)', () => {
      expect(orch.check('agent', makeAction('billing.refund')).decision).toBe('QUEUED');
    });

    it('billing.charge → QUEUED (matches billing.*)', () => {
      expect(orch.check('agent', makeAction('billing.charge')).decision).toBe('QUEUED');
    });

    it('billing.credit → QUEUED (matches billing.*)', () => {
      expect(orch.check('agent', makeAction('billing.credit')).decision).toBe('QUEUED');
    });

    it('crm.update → ALLOWED (matches crm.* with auto_approve)', () => {
      expect(orch.check('agent', makeAction('crm.update')).decision).toBe('ALLOWED');
    });

    it('crm.delete → ALLOWED (matches crm.* with auto_approve)', () => {
      expect(orch.check('agent', makeAction('crm.delete')).decision).toBe('ALLOWED');
    });

    it('email.send → ALLOWED (no wildcard match)', () => {
      expect(orch.check('agent', makeAction('email.send')).decision).toBe('ALLOWED');
    });
  });

  // ── Threshold-based rules ─────────────────────────────────────────────

  describe('Threshold-based rules (above: N)', () => {
    const rules: GovernanceRule[] = [
      { action: 'billing.credit', requires: 'ceo_approval', above: 100 },
      { action: 'billing.refund', requires: 'board_approval', above: 500 },
    ];
    const orch = new Orchestrator(makeConfig(rules));

    const thresholdCases = [
      { action: 'billing.credit', cost: 0, expected: 'ALLOWED', label: '$0 credit — below threshold' },
      { action: 'billing.credit', cost: 50, expected: 'ALLOWED', label: '$50 credit — below threshold' },
      { action: 'billing.credit', cost: 100, expected: 'ALLOWED', label: '$100 credit — at threshold (not above)' },
      { action: 'billing.credit', cost: 100.01, expected: 'QUEUED', label: '$100.01 credit — just above threshold' },
      { action: 'billing.credit', cost: 1000, expected: 'QUEUED', label: '$1000 credit — well above threshold' },
      { action: 'billing.refund', cost: 499, expected: 'ALLOWED', label: '$499 refund — below $500 threshold' },
      { action: 'billing.refund', cost: 500, expected: 'ALLOWED', label: '$500 refund — at threshold' },
      { action: 'billing.refund', cost: 501, expected: 'QUEUED', label: '$501 refund — above threshold' },
      { action: 'billing.credit', cost: undefined, expected: 'ALLOWED', label: 'no cost specified — defaults to 0, below threshold' },
    ];

    it.each(thresholdCases.map((tc) => [tc.label, tc] as const))('%s', (_label, tc) => {
      const result = orch.check('agent', makeAction(tc.action, tc.cost));
      expect(result.decision).toBe(tc.expected);
    });
  });

  // ── Rule precedence (first match wins) ────────────────────────────────

  describe('Rule precedence — first matching rule wins', () => {
    it('exact rule before wildcard when exact is first', () => {
      const rules: GovernanceRule[] = [
        { action: 'billing.refund', requires: 'board_approval' },
        { action: 'billing.*', requires: 'auto_approve' },
      ];
      const orch = new Orchestrator(makeConfig(rules));

      // billing.refund should match the first (exact) rule → board_approval → QUEUED
      const result = orch.check('agent', makeAction('billing.refund'));
      expect(result.decision).toBe('QUEUED');
      expect(result.reason).toContain('board_approval');
    });

    it('wildcard matches before later exact rule', () => {
      const rules: GovernanceRule[] = [
        { action: 'billing.*', requires: 'auto_approve' },
        { action: 'billing.refund', requires: 'board_approval' },
      ];
      const orch = new Orchestrator(makeConfig(rules));

      // billing.refund should match the first (wildcard) rule → auto_approve → ALLOWED
      const result = orch.check('agent', makeAction('billing.refund'));
      expect(result.decision).toBe('ALLOWED');
    });
  });

  // ── Governance + scope interaction ────────────────────────────────────

  describe('Governance marks scope as out-of-territory', () => {
    const rules: GovernanceRule[] = [
      { action: 'billing.refund', requires: 'board_approval' },
    ];
    const orch = new Orchestrator(makeConfig(rules));

    it('scope is false when a governance rule matches', () => {
      const result = orch.check('agent', makeAction('billing.refund'));
      expect(result.checkResults.scope).toBe(false);
    });

    it('scope is true when no governance rule matches', () => {
      const result = orch.check('agent', makeAction('email.send'));
      expect(result.checkResults.scope).toBe(true);
    });
  });

  // ── Governance skips permission check ─────────────────────────────────

  describe('Governance-regulated actions skip permission check', () => {
    const configWithLimitedSkills: CompanyConfig = {
      ...makeConfig([{ action: 'billing.refund', requires: 'ceo_approval' }]),
      org: {
        agent: {
          id: 'agent', name: 'Agent', role: 'worker', runtime: 'claude-agent-sdk',
          personality: '', budget: 100, reportsTo: 'ceo',
          // Note: agent does NOT have 'billing' skill
          skills: ['email', 'browser'],
        },
      },
    };

    it('governance-matched action bypasses permission check even without skill', () => {
      const orch = new Orchestrator(configWithLimitedSkills);
      const result = orch.check('agent', makeAction('billing.refund'));

      // Should be QUEUED (governance), not BLOCKED (permission)
      expect(result.decision).toBe('QUEUED');
      expect(result.checkResults.permission).toBe(true); // permission skipped
      expect(result.checkResults.approval).toBe(false);
    });
  });

  // ── No governance rules ───────────────────────────────────────────────

  describe('No governance rules — everything auto-allowed', () => {
    const orch = new Orchestrator(makeConfig([]));

    it('all action types are ALLOWED when no rules exist', () => {
      const actions = ['billing.refund', 'email.send_external', 'crm.delete', 'browser.navigate'];
      for (const actionType of actions) {
        const result = orch.check('agent', makeAction(actionType));
        expect(result.decision).toBe('ALLOWED');
        expect(result.checkResults.approval).toBe(true);
      }
    });
  });
});
