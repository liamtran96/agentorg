import { describe, it, expect, beforeEach } from 'vitest';
import { AgentCommunicator, OrgChart } from '@agentorg/core';
import type { AgentConfig } from '@agentorg/core';

const agents: Record<string, AgentConfig> = {
  ceo: {
    id: 'ceo',
    name: 'Alice',
    role: 'CEO',
    runtime: 'anthropic-api',
    personality: 'Strategic leader',
    budget: 10000,
    reportsTo: 'board',
    skills: ['delegation', 'planning'],
  },
  writer: {
    id: 'writer',
    name: 'Bob',
    role: 'Content Writer',
    runtime: 'claude-agent-sdk',
    personality: 'Creative writer',
    budget: 500,
    reportsTo: 'ceo',
    skills: ['writing', 'research'],
  },
  editor: {
    id: 'editor',
    name: 'Carol',
    role: 'Editor',
    runtime: 'claude-agent-sdk',
    personality: 'Meticulous editor',
    budget: 300,
    reportsTo: 'ceo',
    skills: ['editing', 'brand-check'],
  },
};

describe('AgentCommunicator', () => {
  let orgChart: OrgChart;
  let comm: AgentCommunicator;

  beforeEach(() => {
    orgChart = new OrgChart(agents);
    comm = new AgentCommunicator(orgChart);
  });

  it('should delegate task from manager to report', () => {
    const delegation = comm.delegate('ceo', 'writer', {
      title: 'Write blog post',
      description: 'Write a 1000-word post about AI agents',
    });

    expect(delegation).toBeDefined();
    expect(delegation.fromId).toBe('ceo');
    expect(delegation.toId).toBe('writer');
    expect(delegation.task.title).toBe('Write blog post');
  });

  it('should escalate task from agent to manager', () => {
    const escalation = comm.escalate('writer', {
      title: 'Complex legal question',
      description: 'Client asking about contract terms',
    }, 'Beyond my expertise');

    expect(escalation).toBeDefined();
    expect(escalation.fromId).toBe('writer');
    expect(escalation.reason).toBe('Beyond my expertise');
  });

  it('should get pending delegations for an agent', () => {
    comm.delegate('ceo', 'writer', {
      title: 'Task 1',
      description: 'First task',
    });
    comm.delegate('ceo', 'writer', {
      title: 'Task 2',
      description: 'Second task',
    });
    comm.delegate('ceo', 'editor', {
      title: 'Task 3',
      description: 'Third task',
    });

    const writerDelegations = comm.getPendingDelegations('writer');
    expect(writerDelegations).toHaveLength(2);

    const editorDelegations = comm.getPendingDelegations('editor');
    expect(editorDelegations).toHaveLength(1);
  });

  it('should get pending escalations for an agent', () => {
    comm.escalate('writer', {
      title: 'Issue 1',
      description: 'First issue',
    }, 'Need help');
    comm.escalate('editor', {
      title: 'Issue 2',
      description: 'Second issue',
    }, 'Cannot resolve');

    // Both writer and editor report to CEO, so CEO should have 2 escalations
    const ceoEscalations = comm.getPendingEscalations('ceo');
    expect(ceoEscalations).toHaveLength(2);
  });

  it('should acknowledge delegation', () => {
    const delegation = comm.delegate('ceo', 'writer', {
      title: 'Write blog post',
      description: 'A blog post',
    });

    comm.acknowledge(delegation.id);

    const pending = comm.getPendingDelegations('writer');
    expect(pending).toHaveLength(0);
  });

  it('should acknowledge escalation', () => {
    const escalation = comm.escalate('writer', {
      title: 'Complex issue',
      description: 'Need CEO help',
    }, 'Beyond scope');

    comm.acknowledge(escalation.id);

    const pending = comm.getPendingEscalations('ceo');
    expect(pending).toHaveLength(0);
  });

  it('should create a task assigned to target agent on delegation', () => {
    const delegation = comm.delegate('ceo', 'writer', {
      title: 'Write blog post',
      description: 'About AI agents',
    });

    expect(delegation.task).toBeDefined();
    expect(delegation.task.title).toBe('Write blog post');
    expect(delegation.toId).toBe('writer');
  });

  it('should notify the manager chain on escalation', () => {
    const escalation = comm.escalate('writer', {
      title: 'Critical issue',
      description: 'Needs immediate attention',
    }, 'Cannot handle');

    // The escalation should target the manager (CEO for writer)
    expect(escalation).toBeDefined();
    expect(escalation.fromId).toBe('writer');

    // CEO should see it in pending escalations
    const ceoEscalations = comm.getPendingEscalations('ceo');
    expect(ceoEscalations).toHaveLength(1);
    expect(ceoEscalations[0].fromId).toBe('writer');
  });
});
