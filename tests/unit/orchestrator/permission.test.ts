import { describe, it, expect } from 'vitest';
import { Orchestrator } from '@agentorg/core';

describe('Orchestrator - Permission Check', () => {
  it('should ALLOW action when agent has the required skill', async () => {
    const orchestrator = new Orchestrator();
    const agent = {
      id: 'writer-1', name: 'Maya', role: 'content_writer',
      runtime: 'claude-agent-sdk' as const, personality: '', budget: 30,
      reportsTo: 'ceo', skills: ['browser', 'filesystem'],
      heartbeat: { schedule: '0 */2 * * *', tasks: [] },
    };
    const action = { agentId: 'writer-1', skill: 'browser', action: 'search', params: { query: 'AI trends' } };

    const decision = await orchestrator.evaluate(action, agent);
    expect(decision.outcome).toBe('ALLOWED');
  });

  it('should BLOCK action when agent lacks the required skill', async () => {
    const orchestrator = new Orchestrator();
    const agent = {
      id: 'writer-1', name: 'Maya', role: 'content_writer',
      runtime: 'claude-agent-sdk' as const, personality: '', budget: 30,
      reportsTo: 'ceo', skills: ['browser', 'filesystem'],
      heartbeat: { schedule: '0 */2 * * *', tasks: [] },
    };
    const action = { agentId: 'writer-1', skill: 'email', action: 'send', params: {} };

    const decision = await orchestrator.evaluate(action, agent);
    expect(decision.outcome).toBe('BLOCKED');
    expect(decision.reason).toContain('does not have');
  });
});
