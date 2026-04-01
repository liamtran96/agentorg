/**
 * Budget & Rate Limit Edge Case Eval
 *
 * Evaluates boundary conditions for budget enforcement and rate limiting.
 * Tests exact boundaries, accumulation, reset behavior, and sliding window
 * mechanics.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Orchestrator } from '@agentorg/core';
import type { CompanyConfig, ActionRecord } from '@agentorg/core';

const makeConfig = (budgets: Record<string, number>): CompanyConfig => ({
  company: { name: 'Budget Eval Co', description: '', timezone: 'UTC', businessHours: '09:00-18:00' },
  org: Object.fromEntries(
    Object.entries(budgets).map(([id, budget]) => [
      id,
      {
        id, name: id, role: 'worker', runtime: 'claude-agent-sdk' as const,
        personality: '', budget, reportsTo: 'ceo',
        skills: ['browser', 'email', 'filesystem'],
      },
    ]),
  ),
  governance: { rules: [] },
});

const makeAction = (agentId: string, type = 'browser.search'): ActionRecord => ({
  id: `budget_${Math.random().toString(36).slice(2, 8)}`,
  agentId, type, description: 'budget eval',
  timestamp: new Date(), input: {},
  orchestratorDecision: 'ALLOWED',
});

describe('Eval — Budget Edge Cases', () => {
  // browser.search cost = 0.02 per the COST_MAP

  describe('Exact budget boundaries', () => {
    it('allows action when spend + cost equals exactly the budget', () => {
      const orch = new Orchestrator(makeConfig({ a: 0.04 }));
      orch.recordSpend('a', 0.02); // spent 0.02, budget 0.04, action cost 0.02 → exactly at limit
      const result = orch.check('a', makeAction('a'));
      expect(result.decision).toBe('ALLOWED');
    });

    it('blocks action when spend + cost exceeds budget by smallest amount', () => {
      const orch = new Orchestrator(makeConfig({ a: 0.03 }));
      orch.recordSpend('a', 0.02); // spent 0.02, budget 0.03, action cost 0.02 → exceeds by 0.01
      const result = orch.check('a', makeAction('a'));
      expect(result.decision).toBe('BLOCKED');
      expect(result.checkResults.budget).toBe(false);
    });

    it('allows first action on zero spend', () => {
      const orch = new Orchestrator(makeConfig({ a: 0.02 }));
      const result = orch.check('a', makeAction('a'));
      expect(result.decision).toBe('ALLOWED');
    });

    it('blocks on zero budget', () => {
      const orch = new Orchestrator(makeConfig({ a: 0 }));
      const result = orch.check('a', makeAction('a'));
      expect(result.decision).toBe('BLOCKED');
      expect(result.checkResults.budget).toBe(false);
    });
  });

  describe('Budget accumulation', () => {
    it('tracks cumulative spend correctly across multiple actions', () => {
      const orch = new Orchestrator(makeConfig({ a: 2.00 }));

      // Record spend in bulk to avoid floating point accumulation issues
      orch.recordSpend('a', 1.80);
      expect(orch.getSpend('a')).toBeCloseTo(1.80);

      // Next action (1.80 + 0.02 = 1.82) should be allowed since budget is 2.00
      const resultAllowed = orch.check('a', makeAction('a'));
      expect(resultAllowed.decision).toBe('ALLOWED');

      // Push near the limit
      orch.recordSpend('a', 0.18); // total: 1.98

      // Next action (1.98 + 0.02 = 2.00) should be allowed (exactly at limit)
      const resultExact = orch.check('a', makeAction('a'));
      expect(resultExact.decision).toBe('ALLOWED');

      orch.recordSpend('a', 0.02); // total: 2.00

      // Next action (2.00 + 0.02 = 2.02) should be blocked
      const resultBlocked = orch.check('a', makeAction('a'));
      expect(resultBlocked.decision).toBe('BLOCKED');
    });

    it('tracks spend independently per agent', () => {
      const orch = new Orchestrator(makeConfig({ a: 0.05, b: 0.05 }));

      orch.recordSpend('a', 0.04);
      // Agent a nearly exhausted, agent b untouched
      expect(orch.getSpend('a')).toBeCloseTo(0.04);
      expect(orch.getSpend('b')).toBe(0);

      // Agent b should still be allowed
      expect(orch.check('b', makeAction('b')).decision).toBe('ALLOWED');
    });
  });

  describe('Budget reset', () => {
    it('allows actions again after resetSpend()', () => {
      const orch = new Orchestrator(makeConfig({ a: 0.02 }));

      orch.recordSpend('a', 0.02);
      expect(orch.check('a', makeAction('a')).decision).toBe('BLOCKED');

      orch.resetSpend();
      expect(orch.getSpend('a')).toBe(0);
      expect(orch.check('a', makeAction('a')).decision).toBe('ALLOWED');
    });
  });

  describe('Different action costs', () => {
    it('email.send costs 0.01 — uses correct cost from COST_MAP', () => {
      const orch = new Orchestrator(makeConfig({ a: 0.015 }));
      // email.send = $0.01
      const result = orch.check('a', makeAction('a', 'email.send'));
      expect(result.decision).toBe('ALLOWED');

      orch.recordSpend('a', 0.01);
      // Now at 0.01, next email.send would be 0.02 > 0.015
      const result2 = orch.check('a', makeAction('a', 'email.send'));
      expect(result2.decision).toBe('BLOCKED');
    });

    it('unknown action type uses default cost of 0.01', () => {
      const orch = new Orchestrator(makeConfig({ a: 0.015 }));
      // unknown.action should use default cost 0.01
      const result = orch.check('a', makeAction('a', 'browser.screenshot'));
      // browser skill is allowed, and budget should pass with default cost
      expect(result.decision).toBe('ALLOWED');
    });
  });
});

describe('Eval — Rate Limit Edge Cases', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('allows exactly 60 actions in one minute', () => {
    const orch = new Orchestrator(makeConfig({ a: 10000 }));

    for (let i = 0; i < 60; i++) {
      const result = orch.check('a', makeAction('a'));
      expect(result.decision, `action ${i + 1} should be ALLOWED`).toBe('ALLOWED');
    }
  });

  it('blocks the 61st action within one minute', () => {
    const orch = new Orchestrator(makeConfig({ a: 10000 }));

    for (let i = 0; i < 60; i++) {
      orch.check('a', makeAction('a'));
    }

    const result = orch.check('a', makeAction('a'));
    expect(result.decision).toBe('BLOCKED');
    expect(result.checkResults.rateLimit).toBe(false);
    expect(result.reason).toContain('rate limit');
  });

  it('allows actions again after the sliding window expires', () => {
    const orch = new Orchestrator(makeConfig({ a: 10000 }));

    // Fill the window
    for (let i = 0; i < 60; i++) {
      orch.check('a', makeAction('a'));
    }

    expect(orch.check('a', makeAction('a')).decision).toBe('BLOCKED');

    // Advance time past the 1-minute window
    vi.advanceTimersByTime(61_000);

    // Should be allowed again
    const result = orch.check('a', makeAction('a'));
    expect(result.decision).toBe('ALLOWED');
    expect(result.checkResults.rateLimit).toBe(true);
  });

  it('rate limits are independent per agent', () => {
    const orch = new Orchestrator(makeConfig({ a: 10000, b: 10000 }));

    // Fill agent a's window
    for (let i = 0; i < 60; i++) {
      orch.check('a', makeAction('a'));
    }

    // Agent a should be blocked
    expect(orch.check('a', makeAction('a')).decision).toBe('BLOCKED');

    // Agent b should still be allowed
    expect(orch.check('b', makeAction('b')).decision).toBe('ALLOWED');
  });

  it('sliding window prunes old timestamps correctly', () => {
    const orch = new Orchestrator(makeConfig({ a: 10000 }));

    // Send 30 actions at t=0
    for (let i = 0; i < 30; i++) {
      orch.check('a', makeAction('a'));
    }

    // Advance 30 seconds
    vi.advanceTimersByTime(30_000);

    // Send 30 more actions at t=30s
    for (let i = 0; i < 30; i++) {
      orch.check('a', makeAction('a'));
    }

    // Now at 60 actions total, but only 30 within the last 30s of the window
    // The next action should be blocked because all 60 are within the 1-min window
    expect(orch.check('a', makeAction('a')).decision).toBe('BLOCKED');

    // Advance 31 seconds (t=61s) — the first 30 actions fall out of the window
    vi.advanceTimersByTime(31_000);

    // Now only 30 recent actions remain in the window — should be allowed
    const result = orch.check('a', makeAction('a'));
    expect(result.decision).toBe('ALLOWED');
  });
});
