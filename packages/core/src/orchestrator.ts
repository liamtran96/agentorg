import { Agent, Task, TaskResult } from './types';

export type OrchestratorOutcome = 'ALLOWED' | 'BLOCKED' | 'REWRITTEN' | 'QUEUED';

export interface OrchestratorDecision {
  outcome: OrchestratorOutcome;
  reason: string;
  checkedAt: Date;
  checksRun: string[];
  latencyMs: number;
}

export interface AgentAction {
  agentId: string;
  skill: string;
  action: string;
  params: Record<string, unknown>;
}

/**
 * The orchestrator is the central policy engine.
 * Every agent action passes through 6 checks in order:
 * 1. Permission — does this agent have this skill?
 * 2. Scope — is the target within their territory?
 * 3. Budget — can they afford this?
 * 4. Rate limit — too many actions?
 * 5. Safety — is the output safe?
 * 6. Approval — needs sign-off?
 */
export class Orchestrator {
  async evaluate(action: AgentAction, agent: Agent): Promise<OrchestratorDecision> {
    const start = Date.now();
    const checksRun: string[] = [];

    // Check 1: Permission
    checksRun.push('permission');
    if (!this.checkPermission(action, agent)) {
      return this.decision('BLOCKED', 'Agent does not have this skill', checksRun, start);
    }

    // Check 2: Scope
    checksRun.push('scope');
    if (!this.checkScope(action, agent)) {
      return this.decision('BLOCKED', 'Action target outside agent scope', checksRun, start);
    }

    // Check 3: Budget
    checksRun.push('budget');
    if (!this.checkBudget(action, agent)) {
      return this.decision('BLOCKED', 'Budget exceeded', checksRun, start);
    }

    // Check 4: Rate limit
    checksRun.push('rate_limit');
    if (!this.checkRateLimit(action, agent)) {
      return this.decision('BLOCKED', 'Rate limit exceeded', checksRun, start);
    }

    // Check 5: Safety
    checksRun.push('safety');
    const safetyResult = await this.checkSafety(action, agent);
    if (!safetyResult.safe) {
      return this.decision('BLOCKED', safetyResult.reason, checksRun, start);
    }

    // Check 6: Approval
    checksRun.push('approval');
    if (this.requiresApproval(action, agent)) {
      return this.decision('QUEUED', 'Requires founder approval', checksRun, start);
    }

    return this.decision('ALLOWED', 'All checks passed', checksRun, start);
  }

  private checkPermission(action: AgentAction, agent: Agent): boolean {
    return agent.skills.includes(action.skill);
  }

  private checkScope(_action: AgentAction, _agent: Agent): boolean {
    // TODO: Implement scope checking
    return true;
  }

  private checkBudget(_action: AgentAction, _agent: Agent): boolean {
    // TODO: Implement budget checking
    return true;
  }

  private checkRateLimit(_action: AgentAction, _agent: Agent): boolean {
    // TODO: Implement rate limiting
    return true;
  }

  private async checkSafety(
    _action: AgentAction,
    _agent: Agent,
  ): Promise<{ safe: boolean; reason: string }> {
    // TODO: Implement safety checks
    return { safe: true, reason: '' };
  }

  private requiresApproval(_action: AgentAction, _agent: Agent): boolean {
    // TODO: Implement approval rules
    return false;
  }

  private decision(
    outcome: OrchestratorOutcome,
    reason: string,
    checksRun: string[],
    startTime: number,
  ): OrchestratorDecision {
    return {
      outcome,
      reason,
      checkedAt: new Date(),
      checksRun,
      latencyMs: Date.now() - startTime,
    };
  }
}
