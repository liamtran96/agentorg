import type { AgentConfig } from '../types.js';

/**
 * Org chart — hierarchy and delegation routing.
 * Delegates flow DOWN. Escalations flow UP.
 */
export class OrgChart {
  private agents: Map<string, AgentConfig> = new Map();

  constructor(agents: Record<string, AgentConfig>) {
    for (const [id, config] of Object.entries(agents)) {
      this.agents.set(id, config);
    }
  }

  /** Get agent by ID */
  getAgent(id: string): AgentConfig | undefined {
    return this.agents.get(id);
  }

  /** Get all agents */
  getAllAgents(): AgentConfig[] {
    return [...this.agents.values()];
  }

  /** Get direct reports of an agent */
  getDirectReports(managerId: string): AgentConfig[] {
    return [...this.agents.values()].filter((a) => a.reportsTo === managerId);
  }

  /** Get manager of an agent */
  getManager(agentId: string): AgentConfig | undefined {
    const agent = this.agents.get(agentId);
    if (!agent || agent.reportsTo === 'board') return undefined;
    return this.agents.get(agent.reportsTo);
  }

  /** Get escalation chain: agent → manager → ... → board */
  getEscalationChain(agentId: string): AgentConfig[] {
    const chain: AgentConfig[] = [];
    let current = this.agents.get(agentId);
    while (current && current.reportsTo !== 'board') {
      const manager = this.agents.get(current.reportsTo);
      if (manager) chain.push(manager);
      current = manager;
    }
    return chain;
  }

  /** Find the CEO (agent that reports to board) */
  getCEO(): AgentConfig | undefined {
    return [...this.agents.values()].find((a) => a.reportsTo === 'board');
  }

  /** Get full hierarchy as tree */
  getTree(): { agent: AgentConfig; children: any[] }[] {
    const buildTree = (parentId: string): any[] => {
      return this.getDirectReports(parentId).map((agent) => ({
        agent,
        children: buildTree(agent.id),
      }));
    };
    // Start from board level
    const ceo = this.getCEO();
    if (!ceo) return [];
    return [{ agent: ceo, children: buildTree(ceo.id) }];
  }
}
