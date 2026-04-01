/**
 * Adversarial Eval
 *
 * Tests that the orchestrator correctly handles attempts to bypass security
 * controls. Covers: skill injection via action type manipulation, budget
 * evasion, safety bypass attempts, and unauthorized escalation.
 */
import { describe, it, expect } from 'vitest';
import { Orchestrator } from '@agentorg/core';
import type { CompanyConfig, ActionRecord } from '@agentorg/core';

const config: CompanyConfig = {
  company: { name: 'Adversarial Eval Co', description: '', timezone: 'UTC', businessHours: '09:00-18:00' },
  org: {
    restricted: {
      id: 'restricted', name: 'Restricted', role: 'intern', runtime: 'http',
      personality: '', budget: 5, reportsTo: 'ceo',
      skills: ['filesystem'],
    },
    ceo: {
      id: 'ceo', name: 'CEO', role: 'ceo', runtime: 'claude-agent-sdk',
      personality: '', budget: 100, reportsTo: 'board',
      skills: ['browser', 'email', 'calendar', 'billing', 'crm', 'filesystem'],
    },
  },
  governance: {
    rules: [
      { action: 'billing.refund', requires: 'board_approval' },
      { action: 'billing.*', requires: 'ceo_approval' },
    ],
  },
  safety: {
    brandCheck: {
      enabled: true,
      blockedWords: ['competitor-corp', 'free forever', "I'm an AI"],
    },
    factCheck: { enabled: true, sourceOfTruth: [], strictMode: true },
    blockMode: 'block',
  },
};

const makeAction = (agentId: string, type: string, overrides?: Partial<ActionRecord>): ActionRecord => ({
  id: `adv_${Math.random().toString(36).slice(2, 8)}`,
  agentId, type, description: overrides?.description ?? 'adversarial test',
  timestamp: new Date(), input: overrides?.input ?? {},
  orchestratorDecision: 'ALLOWED',
  cost: overrides?.cost,
  ...overrides,
});

describe('Eval — Adversarial Scenarios', () => {
  // ── Skill name manipulation ───────────────────────────────────────────

  describe('Skill name manipulation attempts', () => {
    const orch = new Orchestrator(config);

    it('dotless action type — extracts empty skill prefix, blocks', () => {
      // Action type "email" without ".action" → skill = "" (before the dot)
      // Actually split('.')[0] returns "email" for "email", so this tests a plain skill name
      const result = orch.check('restricted', makeAction('restricted', 'email'));
      expect(result.decision).toBe('BLOCKED');
    });

    it('deeply nested action type — only first segment is checked', () => {
      // "filesystem.deeply.nested.action" → skill = "filesystem" → allowed
      const result = orch.check('restricted', makeAction('restricted', 'filesystem.deeply.nested.action'));
      expect(result.decision).toBe('ALLOWED');
    });

    it('action type with spaces in skill — blocked (no skill match)', () => {
      const result = orch.check('restricted', makeAction('restricted', 'file system.write'));
      expect(result.decision).toBe('BLOCKED');
      expect(result.checkResults.permission).toBe(false);
    });

    it('empty action type — blocked (no skill match)', () => {
      const result = orch.check('restricted', makeAction('restricted', ''));
      expect(result.decision).toBe('BLOCKED');
    });

    it('action type starting with dot — blocked (empty skill prefix)', () => {
      const result = orch.check('restricted', makeAction('restricted', '.write'));
      expect(result.decision).toBe('BLOCKED');
    });
  });

  // ── Agent impersonation ───────────────────────────────────────────────

  describe('Agent impersonation / spoofing', () => {
    const orch = new Orchestrator(config);

    it('action with mismatched agentId in action record vs check call — check call agentId is used', () => {
      // The action record says agentId is "ceo" but we call check with "restricted"
      const action = makeAction('ceo', 'email.send');
      const result = orch.check('restricted', action);

      // Should use "restricted" agent's permissions, not "ceo"
      expect(result.decision).toBe('BLOCKED');
      expect(result.checkResults.permission).toBe(false);
    });

    it('nonexistent agent cannot perform any action', () => {
      const result = orch.check('hacker', makeAction('hacker', 'filesystem.read'));
      expect(result.decision).toBe('BLOCKED');
      expect(result.reason).toContain('not in org chart');
    });
  });

  // ── Safety bypass attempts ────────────────────────────────────────────

  describe('Safety bypass attempts', () => {
    const orch = new Orchestrator(config);

    it('blocked word with different casing — still caught', () => {
      const result = orch.check('ceo', makeAction('ceo', 'email.send', {
        description: 'COMPETITOR-CORP is inferior',
      }));
      expect(result.decision).toBe('BLOCKED');
      expect(result.checkResults.safety).toBe(false);
    });

    it('blocked word surrounded by special characters — still caught', () => {
      const result = orch.check('ceo', makeAction('ceo', 'email.send', {
        description: '***competitor-corp*** is bad',
      }));
      expect(result.decision).toBe('BLOCKED');
    });

    it('blocked word in input.content field — still caught', () => {
      const result = orch.check('ceo', makeAction('ceo', 'email.send', {
        description: 'Sending a professional email',
        input: { content: "I'm an AI and I approve this message" },
      }));
      expect(result.decision).toBe('BLOCKED');
      expect(result.checkResults.safety).toBe(false);
    });

    it('blocked words split across description and input — only description+input.content are checked', () => {
      // Putting part in input.subject (not checked) — should NOT be caught
      const result = orch.check('ceo', makeAction('ceo', 'email.send', {
        description: 'Normal professional message',
        input: { subject: 'competitor-corp comparison', otherField: "I'm an AI" },
      }));
      // Only description and input.content are checked, not other fields
      expect(result.decision).toBe('ALLOWED');
    });
  });

  // ── Budget evasion ────────────────────────────────────────────────────

  describe('Budget evasion attempts', () => {
    it('cannot reset own spend — only orchestrator controls spend', () => {
      const orch = new Orchestrator(config);
      orch.recordSpend('restricted', 5); // exhausted

      // Agent cannot call resetSpend for themselves — it resets ALL agents
      // But even if they could, the budget should still block
      const result = orch.check('restricted', makeAction('restricted', 'filesystem.write'));
      expect(result.decision).toBe('BLOCKED');
      expect(result.checkResults.budget).toBe(false);
    });

    it('recordSpend with negative value does reduce spend (orchestrator responsibility)', () => {
      const orch = new Orchestrator(config);
      orch.recordSpend('restricted', 4);
      orch.recordSpend('restricted', -2); // This is an orchestrator-level call

      // After negative spend, agent should have more room
      expect(orch.getSpend('restricted')).toBe(2);
      const result = orch.check('restricted', makeAction('restricted', 'filesystem.write'));
      expect(result.decision).toBe('ALLOWED');
    });
  });

  // ── Governance bypass ─────────────────────────────────────────────────

  describe('Governance bypass attempts', () => {
    const orch = new Orchestrator(config);

    it('cannot bypass board_approval by setting cost to 0', () => {
      // billing.refund requires board_approval (no threshold)
      const result = orch.check('ceo', makeAction('ceo', 'billing.refund', { cost: 0 }));
      expect(result.decision).toBe('QUEUED');
      expect(result.reason).toContain('board_approval');
    });

    it('billing.charge is caught by wildcard billing.* rule', () => {
      const result = orch.check('ceo', makeAction('ceo', 'billing.charge'));
      // billing.* → ceo_approval, but billing.refund is checked first (exact match)
      // billing.charge should match billing.* → QUEUED
      expect(result.decision).toBe('QUEUED');
      expect(result.reason).toContain('ceo_approval');
    });
  });

  // ── Config hot-reload ─────────────────────────────────────────────────

  describe('Config update — permissions change immediately', () => {
    it('revoking a skill blocks previously allowed actions', () => {
      const orch = new Orchestrator(config);

      // Initially restricted can use filesystem
      expect(orch.check('restricted', makeAction('restricted', 'filesystem.read')).decision).toBe('ALLOWED');

      // Update config to remove filesystem skill
      const updatedConfig: CompanyConfig = {
        ...config,
        org: {
          ...config.org,
          restricted: {
            ...config.org.restricted,
            skills: [], // no skills
          },
        },
      };
      orch.updateConfig(updatedConfig);

      // Now filesystem should be blocked
      expect(orch.check('restricted', makeAction('restricted', 'filesystem.read')).decision).toBe('BLOCKED');
    });

    it('adding a blocked word to safety config blocks previously allowed content', () => {
      const orch = new Orchestrator(config);

      // "special offer" is not blocked initially
      const action1 = makeAction('ceo', 'email.send', { description: 'Check out our special offer!' });
      expect(orch.check('ceo', action1).decision).toBe('ALLOWED');

      // Update config to block "special offer"
      const updatedConfig: CompanyConfig = {
        ...config,
        safety: {
          ...config.safety,
          brandCheck: {
            ...config.safety!.brandCheck!,
            blockedWords: [...config.safety!.brandCheck!.blockedWords, 'special offer'],
          },
        },
      };
      orch.updateConfig(updatedConfig);

      // Now "special offer" should be blocked
      const action2 = makeAction('ceo', 'email.send', { description: 'Check out our special offer!' });
      expect(orch.check('ceo', action2).decision).toBe('BLOCKED');
    });
  });
});
