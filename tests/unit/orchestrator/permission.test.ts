import { describe, it, expect } from 'vitest';
import { Orchestrator } from '@agentorg/core';
import type { CompanyConfig, ActionRecord } from '@agentorg/core';

const testConfig: CompanyConfig = {
  company: { name: 'Test Co', description: '', timezone: 'UTC', businessHours: '09:00-18:00' },
  org: {
    writer: {
      id: 'writer', name: 'Maya', role: 'writer', runtime: 'claude-agent-sdk',
      personality: '', budget: 30, reportsTo: 'ceo',
      skills: ['browser', 'filesystem'],
      heartbeat: { schedule: '0 */2 * * *', tasks: [] },
    },
  },
};

const makeAction = (type: string): ActionRecord => ({
  id: 'act_1', agentId: 'writer', type, description: 'test',
  timestamp: new Date(), input: {}, orchestratorDecision: 'ALLOWED',
});

describe('Orchestrator — Permission Check', () => {
  it('should ALLOW action when agent has the required skill', () => {
    const orch = new Orchestrator(testConfig);
    const result = orch.check('writer', makeAction('browser.search'));
    expect(result.decision).toBe('ALLOWED');
  });

  it('should BLOCK action when agent lacks the required skill', () => {
    const orch = new Orchestrator(testConfig);
    const result = orch.check('writer', makeAction('email.send'));
    expect(result.decision).toBe('BLOCKED');
    expect(result.reason).toContain('does not have');
  });

  it('should extract skill name from dotted action type', () => {
    const orch = new Orchestrator(testConfig);
    const result = orch.check('writer', makeAction('filesystem.write'));
    expect(result.decision).toBe('ALLOWED');
    expect(result.checkResults.permission).toBe(true);
  });
});
