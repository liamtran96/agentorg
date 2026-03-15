import { Agent } from './types';

/**
 * Org chart — manages agent hierarchy, delegation, and escalation.
 */
export class OrgChart {
  private agents: Map<string, Agent> = new Map();

  addAgent(agent: Agent): void {
    this.agents.set(agent.id, agent);
  }

  getAgent(id: string): Agent | undefined {
    return this.agents.get(id);
  }

  getManager(agentId: string): Agent | undefined {
    const agent = this.agents.get(agentId);
    if (!agent) return undefined;
    return this.agents.get(agent.reportsTo);
  }

  getDirectReports(agentId: string): Agent[] {
    return Array.from(this.agents.values()).filter((a) => a.reportsTo === agentId);
  }

  getAllAgents(): Agent[] {
    return Array.from(this.agents.values());
  }
}
