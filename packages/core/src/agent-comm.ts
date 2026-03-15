import type { OrgChart } from './org/chart.js';

/** A task description for delegation or escalation */
export interface CommTask {
  title: string;
  description: string;
}

/** A delegation record — manager assigns work to a report */
export interface Delegation {
  id: string;
  fromId: string;
  toId: string;
  task: CommTask;
  acknowledged: boolean;
  createdAt: Date;
}

/** An escalation record — agent escalates work to their manager */
export interface Escalation {
  id: string;
  fromId: string;
  toId: string;
  task: CommTask;
  reason: string;
  acknowledged: boolean;
  createdAt: Date;
}

/**
 * AgentCommunicator — Handles delegation (downward) and escalation (upward) flows.
 * Uses the OrgChart to determine reporting relationships.
 */
export class AgentCommunicator {
  private orgChart: OrgChart;
  private delegations: Map<string, Delegation> = new Map();
  private escalations: Map<string, Escalation> = new Map();
  private nextId = 1;

  constructor(orgChart: OrgChart) {
    this.orgChart = orgChart;
  }

  /** Delegate a task from a manager to a direct report */
  delegate(fromId: string, toId: string, task: CommTask): Delegation {
    const delegation: Delegation = {
      id: `deleg_${this.nextId++}`,
      fromId,
      toId,
      task,
      acknowledged: false,
      createdAt: new Date(),
    };
    this.delegations.set(delegation.id, delegation);
    return delegation;
  }

  /** Escalate a task from an agent up to their manager */
  escalate(fromId: string, task: CommTask, reason: string): Escalation {
    const manager = this.orgChart.getManager(fromId);
    const toId = manager ? manager.id : 'board';

    const escalation: Escalation = {
      id: `esc_${this.nextId++}`,
      fromId,
      toId,
      task,
      reason,
      acknowledged: false,
      createdAt: new Date(),
    };
    this.escalations.set(escalation.id, escalation);
    return escalation;
  }

  /** Get pending (unacknowledged) delegations for an agent */
  getPendingDelegations(agentId: string): Delegation[] {
    const result: Delegation[] = [];
    for (const d of this.delegations.values()) {
      if (d.toId === agentId && !d.acknowledged) {
        result.push(d);
      }
    }
    return result;
  }

  /** Get pending (unacknowledged) escalations for an agent (as the manager) */
  getPendingEscalations(agentId: string): Escalation[] {
    const result: Escalation[] = [];
    for (const e of this.escalations.values()) {
      if (e.toId === agentId && !e.acknowledged) {
        result.push(e);
      }
    }
    return result;
  }

  /** Acknowledge a delegation or escalation by ID, removing it from the store */
  acknowledge(id: string): void {
    if (this.delegations.has(id)) {
      this.delegations.delete(id);
      return;
    }

    if (this.escalations.has(id)) {
      this.escalations.delete(id);
    }
  }
}
