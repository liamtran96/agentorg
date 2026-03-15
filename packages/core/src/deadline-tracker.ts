/** A tracked deadline for a task */
export interface TrackedDeadline {
  taskId: string;
  dueAt: Date;
}

/**
 * DeadlineTracker — Tracks task deadlines and detects overdue or upcoming tasks.
 */
export class DeadlineTracker {
  private deadlines: Map<string, TrackedDeadline> = new Map();

  /** Track a deadline for a task */
  track(taskId: string, dueAt: Date): void {
    this.deadlines.set(taskId, { taskId, dueAt });
  }

  /** Get a tracked deadline by task ID */
  get(taskId: string): TrackedDeadline | undefined {
    return this.deadlines.get(taskId);
  }

  /** Get all overdue deadlines (dueAt < now) */
  getOverdue(): TrackedDeadline[] {
    const now = new Date();
    const result: TrackedDeadline[] = [];
    for (const d of this.deadlines.values()) {
      if (d.dueAt < now) {
        result.push(d);
      }
    }
    return result;
  }

  /**
   * Get upcoming deadlines within a warning threshold.
   * Returns deadlines that are due within the next `hours` hours but not yet overdue.
   */
  getUpcoming(hours: number): TrackedDeadline[] {
    const now = new Date();
    const threshold = new Date(now.getTime() + hours * 60 * 60 * 1000);
    const result: TrackedDeadline[] = [];
    for (const d of this.deadlines.values()) {
      if (d.dueAt >= now && d.dueAt <= threshold) {
        result.push(d);
      }
    }
    return result;
  }

  /** Remove a tracked deadline */
  remove(taskId: string): void {
    this.deadlines.delete(taskId);
  }

  /** Clear all tracked deadlines */
  clear(): void {
    this.deadlines.clear();
  }
}
