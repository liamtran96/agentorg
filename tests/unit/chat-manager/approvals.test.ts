import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ApprovalManager } from '@agentorg/chat-manager';

describe('ApprovalManager', () => {
  let manager: ApprovalManager;

  beforeEach(() => {
    vi.useFakeTimers();
    manager = new ApprovalManager();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('submit', () => {
    it('should submit an action for approval and return an approvalId', () => {
      const approvalId = manager.submit(
        { type: 'send_email', target: 'customer@example.com' },
        'agent-maya',
        'Sending promotional email to customer',
      );

      expect(approvalId).toBeDefined();
      expect(typeof approvalId).toBe('string');
    });
  });

  describe('getPending', () => {
    it('should return all pending approvals', () => {
      manager.submit({ type: 'publish' }, 'agent-writer', 'Publish blog post');
      manager.submit({ type: 'send_invoice' }, 'agent-finance', 'Send invoice to client');

      const pending = manager.getPending();

      expect(pending.length).toBe(2);
    });

    it('should not include approved or rejected items', () => {
      const id1 = manager.submit({ type: 'a' }, 'agent-1', 'Action A');
      const id2 = manager.submit({ type: 'b' }, 'agent-2', 'Action B');
      manager.submit({ type: 'c' }, 'agent-3', 'Action C');

      manager.approve(id1, 'owner');
      manager.reject(id2, 'owner', 'Not allowed');

      const pending = manager.getPending();

      expect(pending.length).toBe(1);
    });
  });

  describe('approve', () => {
    it('should mark an approval as approved', () => {
      const approvalId = manager.submit(
        { type: 'deploy' },
        'agent-devops',
        'Deploy to production',
      );

      const result = manager.approve(approvalId, 'owner-1');

      expect(result).toBe(true);
      expect(manager.getStatus(approvalId)).toBe('approved');
    });
  });

  describe('reject', () => {
    it('should mark an approval as rejected with a reason', () => {
      const approvalId = manager.submit(
        { type: 'delete_data' },
        'agent-admin',
        'Delete old records',
      );

      const result = manager.reject(approvalId, 'owner-1', 'Too risky');

      expect(result).toBe(true);
      expect(manager.getStatus(approvalId)).toBe('rejected');
    });
  });

  describe('getStatus', () => {
    it('should return pending for a new submission', () => {
      const approvalId = manager.submit({ type: 'test' }, 'agent-x', 'Reason');

      expect(manager.getStatus(approvalId)).toBe('pending');
    });

    it('should return approved after approval', () => {
      const approvalId = manager.submit({ type: 'test' }, 'agent-x', 'Reason');
      manager.approve(approvalId, 'owner');

      expect(manager.getStatus(approvalId)).toBe('approved');
    });

    it('should return rejected after rejection', () => {
      const approvalId = manager.submit({ type: 'test' }, 'agent-x', 'Reason');
      manager.reject(approvalId, 'owner', 'Denied');

      expect(manager.getStatus(approvalId)).toBe('rejected');
    });
  });

  describe('getByAgent', () => {
    it('should return approvals submitted by a specific agent', () => {
      manager.submit({ type: 'a' }, 'agent-maya', 'Reason A');
      manager.submit({ type: 'b' }, 'agent-maya', 'Reason B');
      manager.submit({ type: 'c' }, 'agent-other', 'Reason C');

      const mayaApprovals = manager.getByAgent('agent-maya');

      expect(mayaApprovals.length).toBe(2);
    });

    it('should return an empty array for an agent with no submissions', () => {
      expect(manager.getByAgent('agent-nobody')).toEqual([]);
    });
  });

  describe('cannot approve/reject already decided approval', () => {
    it('should not allow approving an already approved action', () => {
      const approvalId = manager.submit({ type: 'x' }, 'agent-1', 'Reason');
      manager.approve(approvalId, 'owner');

      const result = manager.approve(approvalId, 'owner-2');

      // Should either throw or return false
      expect(result).toBe(false);
    });

    it('should not allow rejecting an already approved action', () => {
      const approvalId = manager.submit({ type: 'x' }, 'agent-1', 'Reason');
      manager.approve(approvalId, 'owner');

      const result = manager.reject(approvalId, 'owner-2', 'Too late');

      expect(result).toBe(false);
    });

    it('should not allow approving an already rejected action', () => {
      const approvalId = manager.submit({ type: 'x' }, 'agent-1', 'Reason');
      manager.reject(approvalId, 'owner', 'Nope');

      const result = manager.approve(approvalId, 'owner-2');

      expect(result).toBe(false);
    });

    it('should not allow rejecting an already rejected action', () => {
      const approvalId = manager.submit({ type: 'x' }, 'agent-1', 'Reason');
      manager.reject(approvalId, 'owner', 'Nope');

      const result = manager.reject(approvalId, 'owner-2', 'Also nope');

      expect(result).toBe(false);
    });
  });

  describe('auto-expire', () => {
    it('should expire old approvals after timeout', () => {
      const approvalId = manager.submit(
        { type: 'expiring' },
        'agent-slow',
        'This will expire',
      );

      // Advance time by 24 hours (default expected timeout)
      vi.advanceTimersByTime(24 * 60 * 60 * 1000);

      // After expiry, status should no longer be pending
      const status = manager.getStatus(approvalId);
      expect(status).not.toBe('pending');

      // It should not appear in the pending list
      const pending = manager.getPending();
      const found = pending.find(
        (a: { approvalId: string }) => a.approvalId === approvalId,
      );
      expect(found).toBeUndefined();
    });
  });
});
