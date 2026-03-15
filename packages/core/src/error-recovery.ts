import type { ActionRecord } from './types.js';
import type { IncidentLog } from './incident-log.js';

/** Result of a recovery attempt */
export interface RecoveryResult {
  success: boolean;
  message: string;
}

/** Handler function for recovering from a failed action */
export type RecoveryHandler = (action: ActionRecord) => Promise<RecoveryResult>;

/** Configuration options for ErrorRecovery */
export interface ErrorRecoveryOptions {
  maxRetries?: number;
}

/**
 * ErrorRecovery — Manages revert handlers for action types and orchestrates recovery attempts.
 * Tracks retry counts per action and enforces a maximum retry limit.
 * Logs failed recovery attempts as incidents.
 */
export class ErrorRecovery {
  private incidentLog: IncidentLog;
  private handlers: Map<string, RecoveryHandler> = new Map();
  private attempts: Map<string, number> = new Map();
  private maxRetries: number;

  constructor(incidentLog: IncidentLog, options?: ErrorRecoveryOptions) {
    this.incidentLog = incidentLog;
    this.maxRetries = options?.maxRetries ?? 3;
  }

  /** Register a recovery handler for an action type */
  registerHandler(actionType: string, handler: RecoveryHandler): void {
    this.handlers.set(actionType, handler);
  }

  /** Attempt to recover from a failed action */
  async recover(action: ActionRecord): Promise<RecoveryResult> {
    const handler = this.handlers.get(action.type);

    if (!handler) {
      return {
        success: false,
        message: `No recovery handler registered for action type: ${action.type}`,
      };
    }

    const currentAttempts = this.attempts.get(action.id) ?? 0;

    if (currentAttempts >= this.maxRetries) {
      this.attempts.delete(action.id);
      return {
        success: false,
        message: `Max retries (${this.maxRetries}) exceeded for action: ${action.id}`,
      };
    }

    this.attempts.set(action.id, currentAttempts + 1);

    const result = await handler(action);

    if (result.success) {
      this.attempts.delete(action.id);
    } else {
      this.incidentLog.report({
        id: `inc_recovery_${action.id}_${currentAttempts + 1}`,
        timestamp: new Date(),
        agentId: action.agentId,
        type: 'error',
        severity: 'medium',
        description: `Recovery attempt ${currentAttempts + 1} failed for action ${action.id}: ${result.message}`,
        resolved: false,
      });
    }

    return result;
  }

  /** Get the number of recovery attempts for an action */
  getAttempts(actionId: string): number {
    return this.attempts.get(actionId) ?? 0;
  }

  /** Clear tracked attempts for a specific action */
  clearAttempts(actionId: string): void {
    this.attempts.delete(actionId);
  }
}
