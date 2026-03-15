import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ErrorRecovery, IncidentLog } from '@agentorg/core';
import type { ActionRecord } from '@agentorg/core';

function makeActionRecord(overrides: Partial<ActionRecord> = {}): ActionRecord {
  return {
    id: 'action_1',
    agentId: 'writer',
    type: 'send_email',
    description: 'Send newsletter to subscribers',
    timestamp: new Date('2026-03-15T10:00:00Z'),
    input: { to: 'subscribers@example.com', subject: 'Newsletter' },
    orchestratorDecision: 'ALLOWED',
    ...overrides,
  };
}

describe('ErrorRecovery', () => {
  let recovery: ErrorRecovery;
  let incidentLog: IncidentLog;

  beforeEach(() => {
    incidentLog = new IncidentLog();
    recovery = new ErrorRecovery(incidentLog);
  });

  it('should register a revert handler for an action type', () => {
    const handler = vi.fn().mockResolvedValue({ success: true, message: 'Reverted' });

    recovery.registerHandler('send_email', handler);

    // No error thrown means it registered successfully
    expect(true).toBe(true);
  });

  it('should recover from a failed action by calling the registered handler', async () => {
    const handler = vi.fn().mockResolvedValue({ success: true, message: 'Email send reverted' });
    recovery.registerHandler('send_email', handler);

    const action = makeActionRecord({ type: 'send_email' });
    const result = await recovery.recover(action);

    expect(handler).toHaveBeenCalledWith(action);
    expect(result.success).toBe(true);
    expect(result.message).toBe('Email send reverted');
  });

  it('should return recovery result with success and message', async () => {
    const handler = vi.fn().mockResolvedValue({ success: true, message: 'Recovered successfully' });
    recovery.registerHandler('send_email', handler);

    const action = makeActionRecord({ type: 'send_email' });
    const result = await recovery.recover(action);

    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('message');
    expect(result.success).toBe(true);
    expect(result.message).toBe('Recovered successfully');
  });

  it('should handle missing handler gracefully with failure result', async () => {
    const action = makeActionRecord({ type: 'unknown_action' });
    const result = await recovery.recover(action);

    expect(result.success).toBe(false);
    expect(result.message).toBeDefined();
  });

  it('should track recovery attempts', async () => {
    const handler = vi.fn().mockResolvedValue({ success: false, message: 'Failed to revert' });
    recovery.registerHandler('send_email', handler);

    const action = makeActionRecord({ id: 'action_42', type: 'send_email' });
    await recovery.recover(action);
    await recovery.recover(action);

    const attempts = recovery.getAttempts('action_42');
    expect(attempts).toBe(2);
  });

  it('should respect max retry limit (default 3)', async () => {
    const handler = vi.fn().mockResolvedValue({ success: false, message: 'Still failing' });
    recovery.registerHandler('send_email', handler);

    const action = makeActionRecord({ id: 'action_99', type: 'send_email' });

    // Attempt recovery 4 times (exceeding the default limit of 3)
    await recovery.recover(action);
    await recovery.recover(action);
    await recovery.recover(action);
    const result = await recovery.recover(action);

    // 4th attempt should be rejected because max retries reached
    expect(result.success).toBe(false);
    expect(handler).toHaveBeenCalledTimes(3);
  });

  it('should support configurable max retry limit', async () => {
    const customRecovery = new ErrorRecovery(incidentLog, { maxRetries: 5 });
    const handler = vi.fn().mockResolvedValue({ success: false, message: 'Still failing' });
    customRecovery.registerHandler('send_email', handler);

    const action = makeActionRecord({ id: 'action_100', type: 'send_email' });

    for (let i = 0; i < 5; i++) {
      await customRecovery.recover(action);
    }

    expect(handler).toHaveBeenCalledTimes(5);

    // 6th attempt should be rejected
    const result = await customRecovery.recover(action);
    expect(result.success).toBe(false);
    expect(handler).toHaveBeenCalledTimes(5);
  });

  it('should log recovery to incident log', async () => {
    const handler = vi.fn().mockResolvedValue({ success: false, message: 'Revert failed' });
    recovery.registerHandler('send_email', handler);

    const action = makeActionRecord({ type: 'send_email', agentId: 'writer' });
    await recovery.recover(action);

    const incidents = incidentLog.getAll();
    expect(incidents.length).toBeGreaterThanOrEqual(1);

    const recoveryIncident = incidents.find((i) => i.agentId === 'writer');
    expect(recoveryIncident).toBeDefined();
  });
});
