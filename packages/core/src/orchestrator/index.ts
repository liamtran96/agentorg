import type {
  AgentConfig,
  ActionRecord,
  OrchestratorResult,
  OrchestratorDecision,
  CompanyConfig,
  GovernanceRule,
} from '../types.js';

/**
 * Orchestrator — Central Policy Engine
 *
 * Every agent action passes through here. 6 checks in order:
 * 1. Permission — does this agent have this skill?
 * 2. Scope — is the target within their territory?
 * 3. Budget — can they afford this?
 * 4. Rate limit — too many actions? (Phase 4)
 * 5. Safety — is the output safe? (Phase 4)
 * 6. Approval — needs sign-off? (Phase 4)
 *
 * Phase 1 implements checks 1-3. Others return true by default.
 */
export class Orchestrator {
  private config: CompanyConfig;
  private agentSpend: Map<string, number> = new Map();

  constructor(config: CompanyConfig) {
    this.config = config;
  }

  /** Update config (hot-reload) */
  updateConfig(config: CompanyConfig): void {
    this.config = config;
  }

  /** Check an action against all rules. Returns in <20ms. */
  check(agentId: string, action: ActionRecord): OrchestratorResult {
    const agent = this.config.org[agentId];
    if (!agent) {
      return this.blocked('AGENT_NOT_FOUND', `Agent "${agentId}" not in org chart`);
    }

    // Check 1: Permission — does this agent have this skill?
    const permResult = this.checkPermission(agent, action);
    if (!permResult.allowed) {
      return this.blocked('PERMISSION_DENIED', permResult.reason, { permission: false });
    }

    // Check 2: Scope — is the target within their territory?
    const scopeResult = this.checkScope(agent, action);
    if (!scopeResult.allowed) {
      return this.blocked('SCOPE_VIOLATION', scopeResult.reason, { permission: true, scope: false });
    }

    // Check 3: Budget — can they afford this?
    const budgetResult = this.checkBudget(agent, action);
    if (!budgetResult.allowed) {
      return this.blocked('BUDGET_EXCEEDED', budgetResult.reason, {
        permission: true,
        scope: true,
        budget: false,
      });
    }

    // All checks passed
    return {
      decision: 'ALLOWED',
      reason: 'All checks passed',
      checkResults: {
        permission: true,
        scope: true,
        budget: true,
      },
    };
  }

  /** Check 1: Does this agent have permission to use this skill? */
  private checkPermission(
    agent: AgentConfig,
    action: ActionRecord,
  ): { allowed: boolean; reason: string } {
    const skillName = action.type.split('.')[0]; // 'email.send' → 'email'

    if (!agent.skills.includes(skillName)) {
      return {
        allowed: false,
        reason: `Agent "${agent.name}" does not have the "${skillName}" skill. Allowed skills: [${agent.skills.join(', ')}]`,
      };
    }

    return { allowed: true, reason: 'Skill allowed' };
  }

  /** Check 2: Is the target within this agent's territory? */
  private checkScope(
    agent: AgentConfig,
    action: ActionRecord,
  ): { allowed: boolean; reason: string } {
    // Scope rules from governance config
    const rules = this.config.governance?.rules || [];

    for (const rule of rules) {
      if (this.matchesRule(action, rule) && rule.requires === 'board_approval') {
        // For now, scope violations on board-level actions are blocked
        // Phase 4 will queue them for approval instead
        return {
          allowed: false,
          reason: `Action "${action.type}" requires board approval per governance rule`,
        };
      }
    }

    return { allowed: true, reason: 'Within scope' };
  }

  /** Check 3: Can this agent afford this action? */
  private checkBudget(
    agent: AgentConfig,
    action: ActionRecord,
  ): { allowed: boolean; reason: string } {
    const spent = this.agentSpend.get(agent.id) || 0;
    const estimatedCost = this.estimateActionCost(action);

    if (spent + estimatedCost > agent.budget) {
      return {
        allowed: false,
        reason: `Agent "${agent.name}" budget exhausted. Spent: $${spent.toFixed(2)}, Limit: $${agent.budget}, Action cost: ~$${estimatedCost.toFixed(2)}`,
      };
    }

    return { allowed: true, reason: 'Within budget' };
  }

  /** Record spend after an action completes */
  recordSpend(agentId: string, cost: number): void {
    const current = this.agentSpend.get(agentId) || 0;
    this.agentSpend.set(agentId, current + cost);
  }

  /** Get current spend for an agent */
  getSpend(agentId: string): number {
    return this.agentSpend.get(agentId) || 0;
  }

  /** Reset all spend (e.g., monthly reset) */
  resetSpend(): void {
    this.agentSpend.clear();
  }

  /** Estimate the cost of an action (rough, for budget gating) */
  private estimateActionCost(action: ActionRecord): number {
    // Rough estimates per action type
    const costMap: Record<string, number> = {
      'email.send': 0.01,
      'browser.navigate': 0.02,
      'browser.search': 0.02,
      'filesystem.write': 0.005,
      'filesystem.read': 0.001,
      'crm.update': 0.005,
      'crm.lookup': 0.001,
    };
    return costMap[action.type] || 0.01;
  }

  /** Check if an action matches a governance rule */
  private matchesRule(action: ActionRecord, rule: GovernanceRule): boolean {
    // Simple pattern matching: 'email.send' matches rule for 'email.send'
    // Wildcard: 'email.*' matches any email action
    if (rule.action === action.type) return true;
    if (rule.action.endsWith('.*')) {
      const prefix = rule.action.slice(0, -2);
      return action.type.startsWith(prefix);
    }
    return false;
  }

  private blocked(
    code: string,
    reason: string,
    checks?: Partial<OrchestratorResult['checkResults']>,
  ): OrchestratorResult {
    return {
      decision: 'BLOCKED',
      reason: `[${code}] ${reason}`,
      checkResults: {
        permission: checks?.permission ?? true,
        scope: checks?.scope ?? true,
        budget: checks?.budget ?? true,
      },
    };
  }
}
