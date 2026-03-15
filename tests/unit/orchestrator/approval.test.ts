import { describe, it, expect } from 'vitest';
import { Orchestrator } from '@agentorg/core';
import type { CompanyConfig, ActionRecord } from '@agentorg/core';

const testConfig: CompanyConfig = {
  company: { name: 'Test Co', description: '', timezone: 'UTC', businessHours: '09:00-18:00' },
  org: {
    writer: {
      id: 'writer', name: 'Maya', role: 'writer', runtime: 'claude-agent-sdk',
      personality: '', budget: 30, reportsTo: 'ceo',
      skills: ['browser', 'filesystem', 'email'],
      heartbeat: { schedule: '0 */2 * * *', tasks: [] },
    },
  },
  governance: {
    rules: [
      { action: 'billing.refund', requires: 'board_approval' },
      { action: 'email.send', requires: 'auto_approve' },
      { action: 'billing.credit', requires: 'ceo_approval', above: 50 },
    ],
  },
};

const makeAction = (type: string, extra?: Partial<ActionRecord>): ActionRecord => ({
  id: 'act_1', agentId: 'writer', type, description: 'test',
  timestamp: new Date(), input: {}, orchestratorDecision: 'ALLOWED', ...extra,
});

describe('Orchestrator — Approval Check', () => {
  it('should QUEUE action requiring board approval per governance rules', () => {
    const orch = new Orchestrator(testConfig);
    const result = orch.check('writer', makeAction('billing.refund'));

    expect(result.decision).toBe('QUEUED');
    expect(result.checkResults.approval).toBe(false);
    expect(result.reason).toContain('board_approval');
  });

  it('should ALLOW auto-approved actions (requires: auto_approve)', () => {
    const orch = new Orchestrator(testConfig);
    const result = orch.check('writer', makeAction('email.send'));

    expect(result.decision).toBe('ALLOWED');
    expect(result.checkResults.approval).toBe(true);
  });

  it('should QUEUE when governance rule has above threshold and cost exceeds it', () => {
    const orch = new Orchestrator(testConfig);
    const action = makeAction('billing.credit', { cost: 75 });

    const result = orch.check('writer', action);

    // Cost $75 exceeds the $50 threshold, so requires ceo_approval
    expect(result.decision).toBe('QUEUED');
    expect(result.checkResults.approval).toBe(false);
    expect(result.reason).toContain('ceo_approval');
  });

  it('should ALLOW when cost is below the above threshold', () => {
    const orch = new Orchestrator(testConfig);
    const action = makeAction('billing.credit', { cost: 25 });

    const result = orch.check('writer', action);

    // Cost $25 is below the $50 threshold, so auto-approved
    expect(result.decision).toBe('ALLOWED');
    expect(result.checkResults.approval).toBe(true);
  });

  it('should ALLOW when no matching governance rules exist', () => {
    const orch = new Orchestrator(testConfig);
    const result = orch.check('writer', makeAction('browser.search'));

    // No governance rule matches browser.search, so approval passes
    expect(result.decision).toBe('ALLOWED');
    expect(result.checkResults.approval).toBe(true);
  });
});
