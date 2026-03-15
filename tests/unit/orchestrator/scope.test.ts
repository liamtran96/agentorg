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
      { action: 'email.*', requires: 'board_approval' },
      { action: 'billing.refund', requires: 'ceo_approval' },
    ],
  },
};

const makeAction = (type: string, extra?: Partial<ActionRecord>): ActionRecord => ({
  id: 'act_1', agentId: 'writer', type, description: 'test',
  timestamp: new Date(), input: {}, orchestratorDecision: 'ALLOWED', ...extra,
});

describe('Orchestrator — Scope Check', () => {
  it('should ALLOW action within agent scope (no matching governance rule)', () => {
    const orch = new Orchestrator(testConfig);
    const result = orch.check('writer', makeAction('browser.search'));

    expect(result.decision).toBe('ALLOWED');
    expect(result.checkResults.scope).toBe(true);
  });

  it('should BLOCK action matching governance rule requiring board_approval', () => {
    const orch = new Orchestrator(testConfig);
    const result = orch.check('writer', makeAction('billing.refund'));

    // Scope check should flag this as out-of-scope for the agent's role
    // since there's a governance rule restricting it
    expect(result.checkResults.scope).toBe(false);
    expect(result.decision).not.toBe('ALLOWED');
  });

  it('should support wildcard rules (email.* matches email.send)', () => {
    const orch = new Orchestrator(testConfig);
    const result = orch.check('writer', makeAction('email.send'));

    // The wildcard governance rule email.* should match email.send
    expect(result.checkResults.scope).toBe(false);
    expect(result.decision).not.toBe('ALLOWED');
  });

  it('should ALLOW when no governance rules are defined', () => {
    const configNoGov: CompanyConfig = {
      company: { name: 'Test Co', description: '', timezone: 'UTC', businessHours: '09:00-18:00' },
      org: {
        writer: {
          id: 'writer', name: 'Maya', role: 'writer', runtime: 'claude-agent-sdk',
          personality: '', budget: 30, reportsTo: 'ceo',
          skills: ['browser', 'filesystem', 'email'],
          heartbeat: { schedule: '0 */2 * * *', tasks: [] },
        },
      },
    };

    const orch = new Orchestrator(configNoGov);
    const result = orch.check('writer', makeAction('email.send'));

    expect(result.decision).toBe('ALLOWED');
    expect(result.checkResults.scope).toBe(true);
  });
});
