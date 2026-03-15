import { describe, it, expect, beforeEach } from 'vitest';
import { OrgChart } from '@agentorg/core';
import type { AgentConfig } from '@agentorg/core';

const agents: Record<string, AgentConfig> = {
  ceo: {
    id: 'ceo',
    name: 'Alice',
    role: 'CEO',
    runtime: 'anthropic-api',
    personality: 'Strategic and decisive leader',
    budget: 10000,
    reportsTo: 'board',
    skills: ['delegation', 'planning'],
  },
  writer: {
    id: 'writer',
    name: 'Bob',
    role: 'Content Writer',
    runtime: 'claude-agent-sdk',
    personality: 'Creative and detail-oriented',
    budget: 500,
    reportsTo: 'ceo',
    skills: ['writing', 'research'],
  },
  editor: {
    id: 'editor',
    name: 'Carol',
    role: 'Editor',
    runtime: 'claude-agent-sdk',
    personality: 'Meticulous and brand-aware',
    budget: 300,
    reportsTo: 'ceo',
    skills: ['editing', 'brand-check'],
  },
};

describe('OrgChart', () => {
  let org: OrgChart;

  beforeEach(() => {
    org = new OrgChart(agents);
  });

  it('should build org from agent config', () => {
    expect(org.getAllAgents()).toHaveLength(3);
  });

  it('should return correct agent by id', () => {
    const agent = org.getAgent('writer');
    expect(agent).toBeDefined();
    expect(agent!.name).toBe('Bob');
    expect(agent!.role).toBe('Content Writer');
  });

  it('should return undefined for unknown agent id', () => {
    expect(org.getAgent('nonexistent')).toBeUndefined();
  });

  it('should return direct reports for a manager', () => {
    const reports = org.getDirectReports('ceo');
    expect(reports).toHaveLength(2);
    const ids = reports.map((a) => a.id);
    expect(ids).toContain('writer');
    expect(ids).toContain('editor');
  });

  it('should return empty array for agent with no reports', () => {
    expect(org.getDirectReports('writer')).toHaveLength(0);
  });

  it('should return manager for an agent', () => {
    const manager = org.getManager('writer');
    expect(manager).toBeDefined();
    expect(manager!.id).toBe('ceo');
  });

  it('should return undefined manager for CEO (reports to board)', () => {
    expect(org.getManager('ceo')).toBeUndefined();
  });

  it('should return escalation chain from agent to board', () => {
    const chain = org.getEscalationChain('writer');
    expect(chain.length).toBeGreaterThanOrEqual(1);
    expect(chain[0].id).toBe('ceo');
  });

  it('should return empty escalation chain for CEO', () => {
    const chain = org.getEscalationChain('ceo');
    expect(chain).toHaveLength(0);
  });

  it('should find CEO as agent reporting to board', () => {
    const ceo = org.getCEO();
    expect(ceo).toBeDefined();
    expect(ceo!.id).toBe('ceo');
    expect(ceo!.reportsTo).toBe('board');
  });

  it('should return hierarchy tree', () => {
    const tree = org.getTree();
    expect(tree).toBeDefined();
    // The tree should represent the full hierarchy rooted at the CEO
    expect(tree).toBeTruthy();
  });
});
