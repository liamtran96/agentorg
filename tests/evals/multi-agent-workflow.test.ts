/**
 * Multi-Agent Workflow Eval
 *
 * Evaluates realistic multi-agent workflows end-to-end. Tests delegation
 * chains, escalation paths, concurrent agent execution, and cross-agent
 * isolation (budget, rate limits, permissions).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { Orchestrator, OrgChart, TaskQueue, BudgetTracker } from '@agentorg/core';
import type { CompanyConfig, ActionRecord } from '@agentorg/core';

const workflowConfig: CompanyConfig = {
  company: { name: 'Workflow Eval Co', description: '', timezone: 'UTC', businessHours: '09:00-18:00' },
  org: {
    ceo: {
      id: 'ceo', name: 'Alex', role: 'ceo', runtime: 'claude-agent-sdk',
      personality: '', budget: 50, reportsTo: 'board',
      skills: ['browser', 'email', 'calendar', 'billing'],
    },
    writer: {
      id: 'writer', name: 'Maya', role: 'writer', runtime: 'claude-agent-sdk',
      personality: '', budget: 20, reportsTo: 'ceo',
      skills: ['browser', 'filesystem'],
    },
    editor: {
      id: 'editor', name: 'Linh', role: 'editor', runtime: 'anthropic-api',
      personality: '', budget: 15, reportsTo: 'ceo',
      skills: ['filesystem'],
    },
    social: {
      id: 'social', name: 'Sam', role: 'social', runtime: 'anthropic-api',
      personality: '', budget: 5, reportsTo: 'ceo',
      skills: ['messaging'],
    },
    support: {
      id: 'support', name: 'Jo', role: 'support', runtime: 'anthropic-api',
      personality: '', budget: 10, reportsTo: 'ceo',
      skills: ['email', 'crm'],
    },
  },
  governance: {
    rules: [
      { action: 'email.send_external', requires: 'ceo_approval' },
      { action: 'billing.*', requires: 'board_approval' },
    ],
  },
  safety: {
    brandCheck: { enabled: true, blockedWords: ['competitor-corp'] },
    blockMode: 'block',
  },
};

const makeAction = (agentId: string, type: string, description = 'workflow action'): ActionRecord => ({
  id: `wf_${Math.random().toString(36).slice(2, 8)}`,
  agentId, type, description,
  timestamp: new Date(), input: {},
  orchestratorDecision: 'ALLOWED',
});

describe('Eval — Multi-Agent Workflow', () => {
  let orchestrator: Orchestrator;
  let orgChart: OrgChart;
  let taskQueue: TaskQueue;
  let budgetTracker: BudgetTracker;

  beforeEach(() => {
    orchestrator = new Orchestrator(workflowConfig);
    orgChart = new OrgChart(workflowConfig.org);
    taskQueue = new TaskQueue();
    budgetTracker = new BudgetTracker();

    for (const [id, agent] of Object.entries(workflowConfig.org)) {
      budgetTracker.setLimit(id, agent.budget);
    }
  });

  // ── Content pipeline: CEO → Writer → Editor → Social ──────────────────

  describe('Content pipeline delegation chain', () => {
    it('full pipeline: CEO creates → Writer drafts → Editor reviews → Social publishes', () => {
      // Step 1: CEO creates tasks
      const writeTask = taskQueue.create({
        title: 'Write blog post',
        description: 'AI trends article',
        assignedTo: 'writer',
        createdBy: 'ceo',
        priority: 'high',
      });

      // CEO browses for strategy — ALLOWED
      expect(orchestrator.check('ceo', makeAction('ceo', 'browser.navigate')).decision).toBe('ALLOWED');

      // Step 2: Writer researches and writes
      expect(orchestrator.check('writer', makeAction('writer', 'browser.search')).decision).toBe('ALLOWED');
      expect(orchestrator.check('writer', makeAction('writer', 'filesystem.write')).decision).toBe('ALLOWED');
      orchestrator.recordSpend('writer', 0.05);
      taskQueue.updateStatus(writeTask.id, 'completed', 'Draft completed');

      // Step 3: Editor reviews
      const editTask = taskQueue.create({
        title: 'Review blog post',
        description: 'Check grammar and tone',
        assignedTo: 'editor',
        createdBy: 'ceo',
        priority: 'normal',
      });
      expect(orchestrator.check('editor', makeAction('editor', 'filesystem.read')).decision).toBe('ALLOWED');
      expect(orchestrator.check('editor', makeAction('editor', 'filesystem.write')).decision).toBe('ALLOWED');
      orchestrator.recordSpend('editor', 0.03);
      taskQueue.updateStatus(editTask.id, 'completed', 'Edits applied');

      // Step 4: Social publishes
      const socialTask = taskQueue.create({
        title: 'Promote blog post',
        description: 'Create social media posts',
        assignedTo: 'social',
        createdBy: 'ceo',
        priority: 'normal',
      });
      expect(orchestrator.check('social', makeAction('social', 'messaging.post')).decision).toBe('ALLOWED');
      orchestrator.recordSpend('social', 0.01);
      taskQueue.updateStatus(socialTask.id, 'completed', 'Posted');

      // Verify end state
      const counts = taskQueue.countByStatus();
      expect(counts.completed).toBe(3);

      // Verify spend isolation
      expect(orchestrator.getSpend('writer')).toBeCloseTo(0.05);
      expect(orchestrator.getSpend('editor')).toBeCloseTo(0.03);
      expect(orchestrator.getSpend('social')).toBeCloseTo(0.01);
      expect(orchestrator.getSpend('ceo')).toBe(0);
    });
  });

  // ── Org chart hierarchy ───────────────────────────────────────────────

  describe('Org chart hierarchy', () => {
    it('CEO is at the top of the org chart', () => {
      const ceo = orgChart.getCEO();
      expect(ceo).toBeDefined();
      expect(ceo!.id).toBe('ceo');
    });

    it('all non-CEO agents report to CEO', () => {
      const reports = orgChart.getDirectReports('ceo');
      expect(reports).toHaveLength(4); // writer, editor, social, support
      for (const agent of reports) {
        expect(agent.reportsTo).toBe('ceo');
      }
    });

    it('agents cannot delegate to their peers (no cross-team delegation without escalation)', () => {
      // Writer creates task for social — task creation itself is allowed,
      // but the writer cannot directly control social's actions
      const task = taskQueue.create({
        title: 'Post update',
        assignedTo: 'social',
        createdBy: 'writer',
        description: 'Cross-team task',
      });
      expect(task).toBeDefined();

      // But writer still can't use social's skills
      const writerPostResult = orchestrator.check('writer', makeAction('writer', 'messaging.post'));
      expect(writerPostResult.decision).toBe('BLOCKED');
      expect(writerPostResult.checkResults.permission).toBe(false);
    });
  });

  // ── Cross-agent isolation ─────────────────────────────────────────────

  describe('Cross-agent isolation', () => {
    it('one agent exhausting budget does not affect others', () => {
      // Exhaust social's budget
      orchestrator.recordSpend('social', 5);
      expect(orchestrator.check('social', makeAction('social', 'messaging.post')).decision).toBe('BLOCKED');

      // Other agents unaffected
      expect(orchestrator.check('writer', makeAction('writer', 'browser.search')).decision).toBe('ALLOWED');
      expect(orchestrator.check('editor', makeAction('editor', 'filesystem.read')).decision).toBe('ALLOWED');
      expect(orchestrator.check('ceo', makeAction('ceo', 'email.send')).decision).toBe('ALLOWED');
    });

    it('task queues are properly segmented per agent', () => {
      taskQueue.create({ title: 'Writer task 1', assignedTo: 'writer', createdBy: 'ceo', description: '' });
      taskQueue.create({ title: 'Writer task 2', assignedTo: 'writer', createdBy: 'ceo', description: '' });
      taskQueue.create({ title: 'Editor task', assignedTo: 'editor', createdBy: 'ceo', description: '' });
      taskQueue.create({ title: 'Social task', assignedTo: 'social', createdBy: 'ceo', description: '' });

      expect(taskQueue.getForAgent('writer', 'pending')).toHaveLength(2);
      expect(taskQueue.getForAgent('editor', 'pending')).toHaveLength(1);
      expect(taskQueue.getForAgent('social', 'pending')).toHaveLength(1);
      expect(taskQueue.getForAgent('support', 'pending')).toHaveLength(0);
    });
  });

  // ── Governance in workflow context ────────────────────────────────────

  describe('Governance enforcement in workflow context', () => {
    it('support agent external email is queued while internal actions proceed', () => {
      // Support can use crm.update freely
      expect(orchestrator.check('support', makeAction('support', 'crm.update')).decision).toBe('ALLOWED');
      expect(orchestrator.check('support', makeAction('support', 'email.send')).decision).toBe('ALLOWED');

      // But external email requires CEO approval
      const externalResult = orchestrator.check('support', makeAction('support', 'email.send_external'));
      expect(externalResult.decision).toBe('QUEUED');
      expect(externalResult.reason).toContain('ceo_approval');
    });

    it('CEO billing actions are queued for board approval even during urgent tasks', () => {
      const urgentTask = taskQueue.create({
        title: 'Emergency refund',
        assignedTo: 'ceo',
        createdBy: 'ceo',
        description: 'Critical customer refund',
        priority: 'urgent',
      });

      const result = orchestrator.check('ceo', makeAction('ceo', 'billing.refund'));
      expect(result.decision).toBe('QUEUED');
      expect(result.reason).toContain('board_approval');
    });
  });

  // ── Safety enforcement across agents ──────────────────────────────────

  describe('Safety enforcement is uniform across all agents', () => {
    it('blocked words are caught regardless of agent role', () => {
      const agents = ['ceo', 'writer', 'editor', 'social', 'support'];
      const skillMap: Record<string, string> = {
        ceo: 'email.send',
        writer: 'filesystem.write',
        editor: 'filesystem.write',
        social: 'messaging.post',
        support: 'email.send',
      };

      for (const agentId of agents) {
        const actionType = skillMap[agentId];
        const result = orchestrator.check(
          agentId,
          makeAction(agentId, actionType, 'competitor-corp is bad'),
        );
        expect(result.decision, `${agentId} should be blocked by safety`).toBe('BLOCKED');
        expect(result.checkResults.safety).toBe(false);
      }
    });
  });

  // ── Concurrent workflow simulation ────────────────────────────────────

  describe('Concurrent agent operations', () => {
    it('multiple agents can execute simultaneously without interference', () => {
      // Simulate all agents acting in the same heartbeat window
      const results = {
        ceo: orchestrator.check('ceo', makeAction('ceo', 'browser.navigate')),
        writer: orchestrator.check('writer', makeAction('writer', 'browser.search')),
        editor: orchestrator.check('editor', makeAction('editor', 'filesystem.read')),
        social: orchestrator.check('social', makeAction('social', 'messaging.post')),
        support: orchestrator.check('support', makeAction('support', 'crm.update')),
      };

      // All should be ALLOWED (within permissions, budget, etc.)
      for (const [agentId, result] of Object.entries(results)) {
        expect(result.decision, `${agentId} concurrent action`).toBe('ALLOWED');
      }

      // Record spend for each
      orchestrator.recordSpend('ceo', 0.02);
      orchestrator.recordSpend('writer', 0.02);
      orchestrator.recordSpend('editor', 0.005);
      orchestrator.recordSpend('social', 0.01);
      orchestrator.recordSpend('support', 0.005);

      // Verify independent tracking
      expect(orchestrator.getSpend('ceo')).toBeCloseTo(0.02);
      expect(orchestrator.getSpend('writer')).toBeCloseTo(0.02);
      expect(orchestrator.getSpend('editor')).toBeCloseTo(0.005);
      expect(orchestrator.getSpend('social')).toBeCloseTo(0.01);
      expect(orchestrator.getSpend('support')).toBeCloseTo(0.005);
    });
  });
});
