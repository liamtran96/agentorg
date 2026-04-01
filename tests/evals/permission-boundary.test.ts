/**
 * Permission Boundary Eval
 *
 * Evaluates that the permission check correctly enforces skill-based access
 * control. Tests every agent × skill combination from a realistic config to
 * ensure no unauthorized access is possible.
 */
import { describe, it, expect } from 'vitest';
import { Orchestrator } from '@agentorg/core';
import type { CompanyConfig, ActionRecord } from '@agentorg/core';

const config: CompanyConfig = {
  company: { name: 'Perm Eval Co', description: '', timezone: 'UTC', businessHours: '09:00-18:00' },
  org: {
    ceo: {
      id: 'ceo', name: 'Alex', role: 'ceo', runtime: 'claude-agent-sdk',
      personality: '', budget: 100, reportsTo: 'board',
      skills: ['browser', 'email', 'calendar', 'billing', 'crm', 'filesystem', 'messaging'],
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
    social: {
      id: 'social', name: 'Jo', role: 'social', runtime: 'anthropic-api',
      personality: '', budget: 5, reportsTo: 'ceo',
      skills: ['messaging'],
    },
    analyst: {
      id: 'analyst', name: 'Kai', role: 'analyst', runtime: 'anthropic-api',
      personality: '', budget: 8, reportsTo: 'ceo',
      skills: ['browser'],
    },
    editor: {
      id: 'editor', name: 'Linh', role: 'editor', runtime: 'anthropic-api',
      personality: '', budget: 10, reportsTo: 'ceo',
      skills: ['filesystem'],
    },
  },
  governance: { rules: [] },
};

const allSkills = ['browser', 'email', 'calendar', 'billing', 'crm', 'filesystem', 'messaging'];
const allActions = [
  'browser.navigate', 'browser.search',
  'email.send', 'email.read',
  'calendar.schedule', 'calendar.list',
  'billing.charge', 'billing.refund',
  'crm.update', 'crm.lookup',
  'filesystem.read', 'filesystem.write',
  'messaging.post', 'messaging.list',
];

const makeAction = (agentId: string, type: string): ActionRecord => ({
  id: `perm_${Math.random().toString(36).slice(2, 8)}`,
  agentId, type, description: 'permission eval',
  timestamp: new Date(), input: {},
  orchestratorDecision: 'ALLOWED',
});

describe('Eval — Permission Boundary Matrix', () => {
  const orchestrator = new Orchestrator(config);

  // Build expected matrix: for each agent, which action types should be allowed
  const agents = Object.entries(config.org);

  for (const [agentId, agentConfig] of agents) {
    describe(`Agent: ${agentConfig.name} (${agentId})`, () => {
      for (const actionType of allActions) {
        const skillName = actionType.split('.')[0];
        const hasSkill = agentConfig.skills.includes(skillName);

        it(`${actionType} → ${hasSkill ? 'ALLOWED' : 'BLOCKED'}`, () => {
          const action = makeAction(agentId, actionType);
          const result = orchestrator.check(agentId, action);

          if (hasSkill) {
            // Should be ALLOWED (permission passes)
            expect(result.checkResults.permission).toBe(true);
            // Decision could be ALLOWED or QUEUED/REWRITTEN due to other checks
            // but permission must pass
            expect(result.decision).not.toBe('BLOCKED');
          } else {
            // Should be BLOCKED by permission
            expect(result.decision).toBe('BLOCKED');
            expect(result.checkResults.permission).toBe(false);
          }
        });
      }
    });
  }

  // ── Aggregate assertions ──────────────────────────────────────────────

  describe('Aggregate permission stats', () => {
    it('CEO has access to all skills — no actions blocked by permission', () => {
      let blockedCount = 0;
      for (const actionType of allActions) {
        const result = orchestrator.check('ceo', makeAction('ceo', actionType));
        if (result.checkResults.permission === false) blockedCount++;
      }
      expect(blockedCount).toBe(0);
    });

    it('Social media agent has access to only messaging — most actions blocked', () => {
      let allowedByPermission = 0;
      for (const actionType of allActions) {
        const result = orchestrator.check('social', makeAction('social', actionType));
        if (result.checkResults.permission !== false) allowedByPermission++;
      }
      // Only messaging.post and messaging.list should pass permission
      expect(allowedByPermission).toBe(2);
    });

    it('No agent can access skills not in their config', () => {
      for (const [agentId, agentConfig] of agents) {
        for (const skill of allSkills) {
          if (!agentConfig.skills.includes(skill)) {
            const result = orchestrator.check(agentId, makeAction(agentId, `${skill}.action`));
            expect(result.decision).toBe('BLOCKED');
            expect(result.checkResults.permission).toBe(false);
          }
        }
      }
    });
  });
});
