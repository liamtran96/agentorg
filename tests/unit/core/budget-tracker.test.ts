import { describe, it, expect, beforeEach } from 'vitest';
import { BudgetTracker } from '@agentorg/core';

describe('BudgetTracker', () => {
  let tracker: BudgetTracker;

  beforeEach(() => {
    tracker = new BudgetTracker();
  });

  it('should set a budget limit for an agent', () => {
    tracker.setLimit('writer', 500);
    expect(tracker.getRemaining('writer')).toBe(500);
  });

  it('should record spend for an agent', () => {
    tracker.setLimit('writer', 500);
    tracker.record('writer', 100);
    expect(tracker.getSpent('writer')).toBe(100);
  });

  it('should accumulate multiple spends', () => {
    tracker.setLimit('writer', 500);
    tracker.record('writer', 100);
    tracker.record('writer', 50);
    tracker.record('writer', 25);
    expect(tracker.getSpent('writer')).toBe(175);
  });

  it('should return true for canSpend when within budget', () => {
    tracker.setLimit('writer', 500);
    tracker.record('writer', 200);
    expect(tracker.canSpend('writer', 100)).toBe(true);
  });

  it('should return true for canSpend when exactly at limit', () => {
    tracker.setLimit('writer', 500);
    tracker.record('writer', 400);
    expect(tracker.canSpend('writer', 100)).toBe(true);
  });

  it('should return false for canSpend when over budget', () => {
    tracker.setLimit('writer', 500);
    tracker.record('writer', 450);
    expect(tracker.canSpend('writer', 100)).toBe(false);
  });

  it('should calculate remaining budget correctly', () => {
    tracker.setLimit('writer', 500);
    tracker.record('writer', 123.45);
    expect(tracker.getRemaining('writer')).toBeCloseTo(376.55);
  });

  it('should track budgets independently per agent', () => {
    tracker.setLimit('writer', 500);
    tracker.setLimit('editor', 300);
    tracker.record('writer', 100);
    tracker.record('editor', 200);

    expect(tracker.getSpent('writer')).toBe(100);
    expect(tracker.getSpent('editor')).toBe(200);
    expect(tracker.getRemaining('writer')).toBe(400);
    expect(tracker.getRemaining('editor')).toBe(100);
  });

  it('should return 0 spent for agent with no recorded spend', () => {
    tracker.setLimit('writer', 500);
    expect(tracker.getSpent('writer')).toBe(0);
  });
});
