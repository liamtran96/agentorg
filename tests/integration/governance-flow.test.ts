import { describe, it, expect, beforeEach } from 'vitest';
import { Orchestrator, AuditLog } from '@agentorg/core';
import { ApprovalManager } from '@agentorg/chat-manager';
import type { CompanyConfig, ActionRecord, AuditEntry, OrchestratorDecision } from '@agentorg/core';

const governanceConfig: CompanyConfig = {
  company: {
    name: 'Governance Test Co',
    description: 'Testing governance flow end-to-end',
    timezone: 'UTC',
    businessHours: '09:00-18:00',
  },
  org: {
    ceo: {
      id: 'ceo',
      name: 'Alex',
      role: 'ceo',
      runtime: 'claude-agent-sdk',
      personality: 'Strategic CEO',
      budget: 50,
      reportsTo: 'board',
      skills: ['browser', 'email', 'calendar', 'billing'],
      heartbeat: { schedule: '0 */4 * * *', tasks: ['review_agents'] },
    },
    writer: {
      id: 'writer',
      name: 'Maya',
      role: 'writer',
      runtime: 'claude-agent-sdk',
      personality: 'Content writer',
      budget: 20,
      reportsTo: 'ceo',
      skills: ['browser', 'filesystem', 'email', 'billing'],
      heartbeat: { schedule: '0 */2 * * *', tasks: ['check_task_queue'] },
    },
    support: {
      id: 'support',
      name: 'Sam',
      role: 'support',
      runtime: 'anthropic-api',
      personality: 'Helpful support agent',
      budget: 10,
      reportsTo: 'ceo',
      skills: ['email', 'crm', 'support'],
      heartbeat: { schedule: '*/15 * * * *', tasks: ['check_inbox'] },
    },
  },
  governance: {
    rules: [
      { action: 'billing.refund', requires: 'board_approval' },
      { action: 'email.send_external', requires: 'ceo_approval' },
      { action: 'support.reply', requires: 'auto_approve' },
      { action: 'billing.credit', requires: 'ceo_approval', above: 50 },
    ],
  },
};

const makeAction = (agentId: string, type: string, extra?: Partial<ActionRecord>): ActionRecord => ({
  id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
  agentId,
  type,
  description: 'test action',
  timestamp: new Date(),
  input: {},
  orchestratorDecision: 'ALLOWED',
  ...extra,
});

describe('Integration — Governance Flow', () => {
  let orchestrator: Orchestrator;
  let auditLog: AuditLog;
  let approvalManager: ApprovalManager;

  beforeEach(() => {
    orchestrator = new Orchestrator(governanceConfig);
    auditLog = new AuditLog();
    approvalManager = new ApprovalManager();
  });

  it('should QUEUE an action requiring board_approval', () => {
    const action = makeAction('writer', 'billing.refund');
    const result = orchestrator.check('writer', action);

    expect(result.decision).toBe('QUEUED');
    expect(result.reason).toContain('board_approval');
    expect(result.checkResults.approval).toBe(false);
    // Permission and budget should still pass
    expect(result.checkResults.budget).toBe(true);
  });

  it('should create an approval request in ApprovalManager for QUEUED actions', () => {
    const action = makeAction('writer', 'billing.refund');
    const result = orchestrator.check('writer', action);

    expect(result.decision).toBe('QUEUED');

    // Create an approval request in the ApprovalManager
    const approvalId = approvalManager.createRequest({
      actionId: action.id,
      agentId: action.agentId,
      actionType: action.type,
      requires: 'board_approval',
      reason: result.reason,
    });

    expect(approvalId).toBeDefined();

    // The approval request should be pending
    const pending = approvalManager.getPending();
    expect(pending.length).toBeGreaterThanOrEqual(1);
    const request = pending.find((r) => r.id === approvalId);
    expect(request).toBeDefined();
    expect(request!.status).toBe('pending');
    expect(request!.actionType).toBe('billing.refund');
  });

  it('should allow a previously QUEUED action after approval', () => {
    const action = makeAction('writer', 'billing.refund');

    // Step 1: Orchestrator queues the action
    const initialResult = orchestrator.check('writer', action);
    expect(initialResult.decision).toBe('QUEUED');

    // Step 2: Create approval request
    const approvalId = approvalManager.createRequest({
      actionId: action.id,
      agentId: action.agentId,
      actionType: action.type,
      requires: 'board_approval',
      reason: initialResult.reason,
    });

    // Step 3: Approve the request
    approvalManager.approve(approvalId, 'board');

    // Step 4: Verify approval status
    const approved = approvalManager.getRequest(approvalId);
    expect(approved).toBeDefined();
    expect(approved!.status).toBe('approved');
    expect(approved!.decidedBy).toBe('board');
  });

  it('should keep a QUEUED action blocked after rejection', () => {
    const action = makeAction('writer', 'billing.refund');

    // Step 1: Orchestrator queues the action
    const initialResult = orchestrator.check('writer', action);
    expect(initialResult.decision).toBe('QUEUED');

    // Step 2: Create approval request
    const approvalId = approvalManager.createRequest({
      actionId: action.id,
      agentId: action.agentId,
      actionType: action.type,
      requires: 'board_approval',
      reason: initialResult.reason,
    });

    // Step 3: Reject the request
    approvalManager.reject(approvalId, 'board', 'Refund not justified');

    // Step 4: Verify rejection
    const rejected = approvalManager.getRequest(approvalId);
    expect(rejected).toBeDefined();
    expect(rejected!.status).toBe('rejected');
    expect(rejected!.decidedBy).toBe('board');
    expect(rejected!.rejectionReason).toContain('not justified');
  });

  it('should record all decisions in the audit log (QUEUED, then ALLOWED or BLOCKED)', () => {
    const action = makeAction('writer', 'billing.refund');

    // Step 1: Initial check -> QUEUED
    const queuedResult = orchestrator.check('writer', action);
    auditLog.record({
      id: `audit_${Date.now()}_1`,
      timestamp: new Date(),
      agentId: action.agentId,
      action: action.type,
      decision: queuedResult.decision as OrchestratorDecision,
      reason: queuedResult.reason,
    });

    // Step 2: After approval, record ALLOWED
    auditLog.record({
      id: `audit_${Date.now()}_2`,
      timestamp: new Date(),
      agentId: action.agentId,
      action: action.type,
      decision: 'ALLOWED',
      reason: 'Board approved the refund',
    });

    // Verify audit trail
    const entries = auditLog.getByAgent('writer');
    expect(entries).toHaveLength(2);
    expect(entries[0].decision).toBe('QUEUED');
    expect(entries[1].decision).toBe('ALLOWED');

    // Verify full audit log
    const all = auditLog.getAll();
    expect(all.length).toBeGreaterThanOrEqual(2);
  });

  it('should block all actions with budget hard stop when agent budget is exhausted', () => {
    // Exhaust writer's budget by recording spend
    orchestrator.recordSpend('writer', 20);

    // Now any action should be blocked by budget check
    const action = makeAction('writer', 'browser.search');
    const result = orchestrator.check('writer', action);

    expect(result.decision).toBe('BLOCKED');
    expect(result.checkResults.budget).toBe(false);
    expect(result.reason).toContain('budget');

    // Record in audit log
    auditLog.record({
      id: `audit_budget_block`,
      timestamp: new Date(),
      agentId: 'writer',
      action: action.type,
      decision: result.decision as OrchestratorDecision,
      reason: result.reason,
    });

    const blocked = auditLog.getByDecision('BLOCKED');
    expect(blocked).toHaveLength(1);
    expect(blocked[0].reason).toContain('budget');
  });

  it('should auto-approve actions matching auto_approve governance rules without creating approval requests', () => {
    // support.reply has requires: auto_approve
    const action = makeAction('support', 'support.reply');
    const result = orchestrator.check('support', action);

    expect(result.decision).toBe('ALLOWED');
    expect(result.checkResults.approval).toBe(true);

    // No approval request should be needed
    const pending = approvalManager.getPending();
    expect(pending).toHaveLength(0);

    // Record in audit log
    auditLog.record({
      id: 'audit_auto_approve',
      timestamp: new Date(),
      agentId: 'support',
      action: action.type,
      decision: result.decision as OrchestratorDecision,
      reason: result.reason,
    });

    const allowed = auditLog.getByDecision('ALLOWED');
    expect(allowed).toHaveLength(1);
    expect(allowed[0].action).toBe('support.reply');
  });

  it('should apply threshold-based governance rules correctly', () => {
    // billing.credit requires ceo_approval only when cost > $50
    const smallCredit = makeAction('writer', 'billing.credit', { cost: 25 });
    const smallResult = orchestrator.check('writer', smallCredit);
    expect(smallResult.decision).toBe('ALLOWED');
    expect(smallResult.checkResults.approval).toBe(true);

    const largeCredit = makeAction('writer', 'billing.credit', { cost: 75 });
    const largeResult = orchestrator.check('writer', largeCredit);
    expect(largeResult.decision).toBe('QUEUED');
    expect(largeResult.checkResults.approval).toBe(false);
    expect(largeResult.reason).toContain('ceo_approval');
  });
});
