/**
 * Budget tracker — per-agent spend tracking with hard stops.
 */
export class BudgetTracker {
  private spent: Map<string, number> = new Map();
  private limits: Map<string, number> = new Map();

  setLimit(agentId: string, limit: number): void {
    this.limits.set(agentId, limit);
  }

  record(agentId: string, cost: number): void {
    const current = this.spent.get(agentId) || 0;
    this.spent.set(agentId, current + cost);
  }

  canSpend(agentId: string, estimatedCost: number): boolean {
    const limit = this.limits.get(agentId) || Infinity;
    const current = this.spent.get(agentId) || 0;
    return current + estimatedCost <= limit;
  }

  getSpent(agentId: string): number {
    return this.spent.get(agentId) || 0;
  }

  getRemaining(agentId: string): number {
    const limit = this.limits.get(agentId) || Infinity;
    return limit - this.getSpent(agentId);
  }
}
