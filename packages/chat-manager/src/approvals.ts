/**
 * Status of an approval request.
 */
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'expired';

/**
 * An action submitted for approval.
 */
export interface ApprovalRecord {
  approvalId: string;
  action: Record<string, unknown>;
  agentId: string;
  reason: string;
  status: ApprovalStatus;
  submittedAt: number;
  decidedBy?: string;
  rejectionReason?: string;
  decidedAt?: number;
  actionType?: string;
}

/** Default timeout for pending approvals: 24 hours in milliseconds. */
const DEFAULT_TIMEOUT_MS = 24 * 60 * 60 * 1000;

/**
 * Generates a unique approval ID.
 */
function generateId(): string {
  return `apr_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Manages approval requests for agent actions.
 *
 * Agents submit actions that require human approval. The owner can
 * approve or reject them. Pending approvals auto-expire after 24 hours.
 */
export class ApprovalManager {
  private approvals: Map<string, ApprovalRecord> = new Map();
  private timeoutMs: number;
  private timers: Map<string, ReturnType<typeof setTimeout>> = new Map();

  constructor(timeoutMs: number = DEFAULT_TIMEOUT_MS) {
    this.timeoutMs = timeoutMs;
  }

  /**
   * Clears the expiry timer for the given approval, if one exists.
   */
  private clearTimer(approvalId: string): void {
    const timer = this.timers.get(approvalId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(approvalId);
    }
  }

  /**
   * Starts an auto-expiry timer for a pending approval.
   */
  private startExpiryTimer(approvalId: string): void {
    const timer = setTimeout(() => {
      const entry = this.approvals.get(approvalId);
      if (entry && entry.status === 'pending') {
        entry.status = 'expired';
      }
      this.timers.delete(approvalId);
    }, this.timeoutMs);

    this.timers.set(approvalId, timer);
  }

  /**
   * Submits an action for approval.
   * @param action - The action object describing what the agent wants to do.
   * @param agentId - The ID of the agent submitting the request.
   * @param reason - A human-readable description of why this action is needed.
   * @returns The unique approval ID.
   */
  submit(
    action: Record<string, unknown>,
    agentId: string,
    reason: string,
  ): string {
    const approvalId = generateId();
    const record: ApprovalRecord = {
      approvalId,
      action,
      agentId,
      reason,
      status: 'pending',
      submittedAt: Date.now(),
    };

    this.approvals.set(approvalId, record);
    this.startExpiryTimer(approvalId);

    return approvalId;
  }

  /**
   * Returns all pending approval requests.
   */
  getPending(): (ApprovalRecord & { id: string })[] {
    const result: (ApprovalRecord & { id: string })[] = [];
    for (const record of this.approvals.values()) {
      if (record.status === 'pending') {
        result.push({ ...record, id: record.approvalId });
      }
    }
    return result;
  }

  /**
   * Approves a pending approval request.
   * @param approvalId - The ID of the approval to approve.
   * @param approverId - The ID of the person approving.
   * @returns true if the approval was successful, false if already decided or not found.
   */
  approve(approvalId: string, approverId: string): boolean {
    const record = this.approvals.get(approvalId);
    if (!record || record.status !== 'pending') {
      return false;
    }

    record.status = 'approved';
    record.decidedBy = approverId;
    record.decidedAt = Date.now();

    this.clearTimer(approvalId);

    return true;
  }

  /**
   * Rejects a pending approval request.
   * @param approvalId - The ID of the approval to reject.
   * @param rejectorId - The ID of the person rejecting.
   * @param reason - The reason for rejection.
   * @returns true if the rejection was successful, false if already decided or not found.
   */
  reject(approvalId: string, rejectorId: string, reason: string): boolean {
    const record = this.approvals.get(approvalId);
    if (!record || record.status !== 'pending') {
      return false;
    }

    record.status = 'rejected';
    record.decidedBy = rejectorId;
    record.rejectionReason = reason;
    record.decidedAt = Date.now();

    this.clearTimer(approvalId);

    return true;
  }

  /**
   * Returns the current status of an approval request.
   * @param approvalId - The ID of the approval to check.
   * @returns The status, or undefined if not found.
   */
  getStatus(approvalId: string): ApprovalStatus | undefined {
    const record = this.approvals.get(approvalId);
    if (!record) {
      return undefined;
    }
    return record.status;
  }

  /**
   * Returns all approval requests submitted by a specific agent.
   * @param agentId - The agent ID to filter by.
   */
  getByAgent(agentId: string): ApprovalRecord[] {
    const result: ApprovalRecord[] = [];
    for (const record of this.approvals.values()) {
      if (record.agentId === agentId) {
        result.push(record);
      }
    }
    return result;
  }

  /**
   * Creates a structured approval request (alternative to submit).
   * Used by the governance flow to create requests with action metadata.
   */
  createRequest(params: {
    actionId: string;
    agentId: string;
    actionType: string;
    requires: string;
    reason: string;
  }): string {
    const approvalId = generateId();
    const record: ApprovalRecord = {
      approvalId,
      action: { actionId: params.actionId, actionType: params.actionType, requires: params.requires },
      agentId: params.agentId,
      reason: params.reason,
      status: 'pending',
      submittedAt: Date.now(),
      actionType: params.actionType,
    };

    this.approvals.set(approvalId, record);
    this.startExpiryTimer(approvalId);

    return approvalId;
  }

  /**
   * Gets a single approval request by ID.
   * The original submission `reason` is always preserved.
   * When rejected, `rejectionReason` contains the rejection reason.
   */
  getRequest(approvalId: string): (ApprovalRecord & { id: string }) | undefined {
    const record = this.approvals.get(approvalId);
    if (!record) return undefined;
    return {
      ...record,
      id: approvalId,
    };
  }

  /**
   * Clears all active expiry timers. Call on graceful shutdown.
   */
  dispose(): void {
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
  }
}
