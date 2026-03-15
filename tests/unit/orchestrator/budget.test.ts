import { describe, it, expect, beforeEach } from 'vitest';
import { Orchestrator } from '@agentorg/core';
import type { CompanyConfig, ActionRecord } from '@agentorg/core';

const testConfig: CompanyConfig = {
  company: { name: 'Test Co', description: '', timezone: 'UTC', businessHours: '09:00-18:00' },
  org: {
    writer: { id: 'writer', name: 'Maya', role: 'writer', runtime: 'claude-agent-sdk', personality: '', budget: 1, reportsTo: 'ceo', skills: ['browser'], heartbeat: { schedule: '0 */2 * * *', tasks: [] } },
  },
};

const makeAction = (type: string): ActionRecord => ({
  id: 'act_1', agentId: 'writer', type, description: 'test', timestamp: new Date(), input: {}, orchestratorDecision: 'ALLOWED',
});

describe('Orchestrator — Budget Check', () => {
  let orch: Orchestrator;

  beforeEach(() => {
    orch = new Orchestrator(testConfig);
  });

  it('allows action within budget', () => {
    const result = orch.check('writer', makeAction('browser.navigate'));
    expect(result.decision).toBe('ALLOWED');
  });

  it('blocks action when budget is exhausted', () => {
    // Spend almost all budget
    orch.recordSpend('writer', 0.99);

    const result = orch.check('writer', makeAction('browser.navigate'));
    expect(result.decision).toBe('BLOCKED');
    expect(result.reason).toContain('BUDGET_EXCEEDED');
  });

  it('tracks spend correctly', () => {
    orch.recordSpend('writer', 0.5);
    expect(orch.getSpend('writer')).toBe(0.5);

    orch.recordSpend('writer', 0.3);
    expect(orch.getSpend('writer')).toBe(0.8);
  });

  it('resets spend', () => {
    orch.recordSpend('writer', 0.5);
    orch.resetSpend();
    expect(orch.getSpend('writer')).toBe(0);
  });
});
