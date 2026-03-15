import type { AuditEntry, OrchestratorDecision } from './types.js';

/**
 * AuditLog — Records and queries all orchestrator decisions.
 * Every agent action that passes through the orchestrator gets logged here.
 */
export class AuditLog {
  private entries: AuditEntry[] = [];
  private readonly maxEntries: number;

  constructor(maxEntries: number = 10000) {
    this.maxEntries = maxEntries;
  }

  /** Record a new audit entry */
  record(entry: AuditEntry): void {
    if (this.entries.length >= this.maxEntries) {
      this.entries.splice(0, this.entries.length - this.maxEntries + 1);
    }
    this.entries.push(entry);
  }

  /** Get all audit entries in insertion order */
  getAll(): AuditEntry[] {
    return [...this.entries];
  }

  /** Get audit entries for a specific agent */
  getByAgent(agentId: string): AuditEntry[] {
    return this.entries.filter((e) => e.agentId === agentId);
  }

  /** Get audit entries filtered by decision type */
  getByDecision(decision: OrchestratorDecision): AuditEntry[] {
    return this.entries.filter((e) => e.decision === decision);
  }

  /** Get audit entries within a date range (inclusive) */
  getByDateRange(start: Date, end: Date): AuditEntry[] {
    return this.entries.filter(
      (e) => e.timestamp >= start && e.timestamp <= end,
    );
  }

  /** Get the total number of entries */
  count(): number {
    return this.entries.length;
  }

  /** Clear all audit entries */
  clear(): void {
    this.entries = [];
  }
}
