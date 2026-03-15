import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DeadlineTracker } from '@agentorg/core';

describe('DeadlineTracker', () => {
  let tracker: DeadlineTracker;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-15T12:00:00Z'));
    tracker = new DeadlineTracker();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should track a task deadline', () => {
    const dueAt = new Date('2026-03-16T12:00:00Z');
    tracker.track('task_1', dueAt);

    const deadline = tracker.get('task_1');
    expect(deadline).toBeDefined();
    expect(deadline!.taskId).toBe('task_1');
    expect(deadline!.dueAt).toEqual(dueAt);
  });

  it('should check for overdue tasks', () => {
    // Due 1 hour ago (overdue)
    tracker.track('task_1', new Date('2026-03-15T11:00:00Z'));
    // Due in 1 hour (not overdue)
    tracker.track('task_2', new Date('2026-03-15T13:00:00Z'));
    // Due 2 hours ago (overdue)
    tracker.track('task_3', new Date('2026-03-15T10:00:00Z'));

    const overdue = tracker.getOverdue();
    expect(overdue).toHaveLength(2);

    const overdueIds = overdue.map((d) => d.taskId);
    expect(overdueIds).toContain('task_1');
    expect(overdueIds).toContain('task_3');
  });

  it('should check for upcoming deadlines within warning threshold', () => {
    // Due in 2 hours (within 4-hour threshold)
    tracker.track('task_1', new Date('2026-03-15T14:00:00Z'));
    // Due in 6 hours (outside 4-hour threshold)
    tracker.track('task_2', new Date('2026-03-15T18:00:00Z'));
    // Due in 3 hours (within 4-hour threshold)
    tracker.track('task_3', new Date('2026-03-15T15:00:00Z'));
    // Already overdue (should not appear in upcoming)
    tracker.track('task_4', new Date('2026-03-15T11:00:00Z'));

    const upcoming = tracker.getUpcoming(4);
    expect(upcoming).toHaveLength(2);

    const upcomingIds = upcoming.map((d) => d.taskId);
    expect(upcomingIds).toContain('task_1');
    expect(upcomingIds).toContain('task_3');
  });

  it('should remove a tracked deadline', () => {
    tracker.track('task_1', new Date('2026-03-16T12:00:00Z'));
    tracker.track('task_2', new Date('2026-03-17T12:00:00Z'));

    tracker.remove('task_1');

    expect(tracker.get('task_1')).toBeUndefined();
    expect(tracker.get('task_2')).toBeDefined();
  });

  it('should clear all deadlines', () => {
    tracker.track('task_1', new Date('2026-03-16T12:00:00Z'));
    tracker.track('task_2', new Date('2026-03-17T12:00:00Z'));

    tracker.clear();

    expect(tracker.get('task_1')).toBeUndefined();
    expect(tracker.get('task_2')).toBeUndefined();
  });

  it('should get tracked deadline for a task', () => {
    tracker.track('task_1', new Date('2026-03-16T12:00:00Z'));

    const deadline = tracker.get('task_1');
    expect(deadline).toBeDefined();
    expect(deadline!.taskId).toBe('task_1');
  });

  it('should return undefined for untracked task', () => {
    expect(tracker.get('nonexistent')).toBeUndefined();
  });

  it('should use current time for overdue detection', () => {
    tracker.track('task_1', new Date('2026-03-15T13:00:00Z'));

    // At 12:00 - not overdue
    expect(tracker.getOverdue()).toHaveLength(0);

    // Advance to 14:00 - now overdue
    vi.setSystemTime(new Date('2026-03-15T14:00:00Z'));
    expect(tracker.getOverdue()).toHaveLength(1);
    expect(tracker.getOverdue()[0].taskId).toBe('task_1');
  });
});
