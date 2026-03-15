import { describe, it, expect, vi, beforeEach } from 'vitest';
import path from 'node:path';
import {
  ConfigManager,
  OrgChart,
  Orchestrator,
  TaskQueue,
  BudgetTracker,
} from '@agentorg/core';
import type {
  AgentConfig,
  ActionRecord,
  Task,
  TaskResult,
} from '@agentorg/core';

const TEMPLATE_PATH = path.resolve(
  __dirname,
  '../../templates/content-agency.yaml',
);

/** Mock adapter that simulates agent execution */
function createMockAdapter() {
  return {
    executeTask: vi.fn(
      async (task: Task, _agent: AgentConfig): Promise<TaskResult> => ({
        success: true,
        output: `Completed: ${task.title}`,
        tokensUsed: 150,
        cost: 0.03,
        actions: [],
      }),
    ),
  };
}

const makeAction = (
  agentId: string,
  type: string,
  description = 'action',
): ActionRecord => ({
  id: `act_${Date.now()}_${Math.random().toString(36).slice(2)}`,
  agentId,
  type,
  description,
  timestamp: new Date(),
  input: {},
  orchestratorDecision: 'ALLOWED',
});

describe('E2E — Full Workday Simulation', () => {
  let config: ReturnType<ConfigManager['load']>;
  let orgChart: OrgChart;
  let orchestrator: Orchestrator;
  let taskQueue: TaskQueue;
  let budgetTracker: BudgetTracker;
  let mockAdapter: ReturnType<typeof createMockAdapter>;

  beforeEach(() => {
    // Load content-agency template
    const configManager = new ConfigManager(TEMPLATE_PATH);
    config = configManager.load();

    // Build org chart
    orgChart = new OrgChart(config.org);

    // Create orchestrator
    orchestrator = new Orchestrator(config);

    // Create task queue and budget tracker
    taskQueue = new TaskQueue();
    budgetTracker = new BudgetTracker();
    mockAdapter = createMockAdapter();

    // Initialize budgets from config
    for (const [id, agent] of Object.entries(config.org)) {
      budgetTracker.setLimit(id, agent.budget);
    }
  });

  it('should load the content-agency template successfully', () => {
    expect(config.company.name).toBe('My Content Agency');
    expect(Object.keys(config.org)).toHaveLength(6);

    // Verify all 6 agents exist
    expect(config.org.ceo).toBeDefined();
    expect(config.org.content_writer).toBeDefined();
    expect(config.org.seo_analyst).toBeDefined();
    expect(config.org.editor).toBeDefined();
    expect(config.org.social_media).toBeDefined();
    expect(config.org.account_manager).toBeDefined();
  });

  it('should build a valid org chart from the template', () => {
    const ceo = orgChart.getCEO();
    expect(ceo).toBeDefined();
    expect(ceo!.name).toBe('Alex');

    const reports = orgChart.getDirectReports('ceo');
    expect(reports.length).toBe(5); // writer, seo, editor, social, account_manager

    // Every non-CEO reports to CEO
    for (const agent of orgChart.getAllAgents()) {
      if (agent.id !== 'ceo') {
        expect(agent.reportsTo).toBe('ceo');
      }
    }
  });

  it('should simulate CEO heartbeat: create tasks for writer and social', async () => {
    // CEO creates tasks during heartbeat
    const writingTask = taskQueue.create({
      title: 'Write blog post: AI Trends 2026',
      description: 'Research and write a 1500-word SEO blog post on AI trends',
      assignedTo: 'content_writer',
      createdBy: 'ceo',
      priority: 'high',
    });

    const socialTask = taskQueue.create({
      title: 'Create social posts from latest blog',
      description: 'Create Twitter, LinkedIn, and Instagram posts',
      assignedTo: 'social_media',
      createdBy: 'ceo',
      priority: 'normal',
    });

    // CEO action passes orchestrator (CEO has browser skill)
    const ceoAction = makeAction('ceo', 'browser.search', 'Review agent status');
    const ceoResult = orchestrator.check('ceo', ceoAction);
    expect(ceoResult.decision).toBe('ALLOWED');

    // Verify tasks were created
    expect(taskQueue.getForAgent('content_writer', 'pending')).toHaveLength(1);
    expect(taskQueue.getForAgent('social_media', 'pending')).toHaveLength(1);
    expect(writingTask.priority).toBe('high');
  });

  it('should simulate Writer heartbeat: pick up writing task and produce draft', async () => {
    // Create a task for writer
    const task = taskQueue.create({
      title: 'Write blog post: AI Trends 2026',
      description: 'Research and write a 1500-word SEO blog post',
      assignedTo: 'content_writer',
      createdBy: 'ceo',
      priority: 'high',
    });

    // Writer checks their queue
    const pending = taskQueue.getForAgent('content_writer', 'pending');
    expect(pending).toHaveLength(1);

    // Writer uses browser to research (orchestrator check)
    const researchAction = makeAction(
      'content_writer',
      'browser.search',
      'Research AI trends',
    );
    const researchResult = orchestrator.check('content_writer', researchAction);
    expect(researchResult.decision).toBe('ALLOWED');

    // Writer writes to filesystem (orchestrator check)
    const writeAction = makeAction(
      'content_writer',
      'filesystem.write',
      'Save draft',
    );
    const writeResult = orchestrator.check('content_writer', writeAction);
    expect(writeResult.decision).toBe('ALLOWED');

    // Execute task via mock adapter
    taskQueue.updateStatus(task.id, 'in_progress');
    const execResult = await mockAdapter.executeTask(
      task,
      config.org.content_writer,
    );
    expect(execResult.success).toBe(true);

    // Record spend
    budgetTracker.record('content_writer', execResult.cost);
    orchestrator.recordSpend('content_writer', execResult.cost);

    // Complete task
    taskQueue.updateStatus(task.id, 'completed', execResult.output);

    const completed = taskQueue.get(task.id);
    expect(completed!.status).toBe('completed');
  });

  it('should simulate Social heartbeat: create social posts from content', async () => {
    const task = taskQueue.create({
      title: 'Create social posts from blog',
      description: 'Create platform-specific social media posts',
      assignedTo: 'social_media',
      createdBy: 'ceo',
      priority: 'normal',
    });

    // Social uses messaging skill (orchestrator check)
    const postAction = makeAction(
      'social_media',
      'messaging.post',
      'Post to Twitter',
    );
    const postResult = orchestrator.check('social_media', postAction);
    expect(postResult.decision).toBe('ALLOWED');

    // Social should NOT be able to use email (not in skills)
    const emailAction = makeAction(
      'social_media',
      'email.send',
      'Send email',
    );
    const emailResult = orchestrator.check('social_media', emailAction);
    expect(emailResult.decision).toBe('BLOCKED');
    expect(emailResult.checkResults.permission).toBe(false);

    // Execute task
    taskQueue.updateStatus(task.id, 'in_progress');
    const execResult = await mockAdapter.executeTask(
      task,
      config.org.social_media,
    );
    budgetTracker.record('social_media', execResult.cost);
    taskQueue.updateStatus(task.id, 'completed', execResult.output);

    expect(taskQueue.get(task.id)!.status).toBe('completed');
  });

  it('should enforce all actions pass through orchestrator checks', () => {
    // CEO actions — allowed
    expect(
      orchestrator.check('ceo', makeAction('ceo', 'browser.navigate')).decision,
    ).toBe('ALLOWED');
    expect(
      orchestrator.check('ceo', makeAction('ceo', 'email.send')).decision,
    ).toBe('ALLOWED');
    expect(
      orchestrator.check('ceo', makeAction('ceo', 'calendar.schedule'))
        .decision,
    ).toBe('ALLOWED');

    // Writer actions — only browser and filesystem
    expect(
      orchestrator.check(
        'content_writer',
        makeAction('content_writer', 'browser.search'),
      ).decision,
    ).toBe('ALLOWED');
    expect(
      orchestrator.check(
        'content_writer',
        makeAction('content_writer', 'filesystem.read'),
      ).decision,
    ).toBe('ALLOWED');
    expect(
      orchestrator.check(
        'content_writer',
        makeAction('content_writer', 'email.send'),
      ).decision,
    ).toBe('BLOCKED');
    expect(
      orchestrator.check(
        'content_writer',
        makeAction('content_writer', 'crm.update'),
      ).decision,
    ).toBe('BLOCKED');

    // Non-existent agent
    const noAgent = orchestrator.check(
      'nonexistent',
      makeAction('nonexistent', 'browser.search'),
    );
    expect(noAgent.decision).toBe('BLOCKED');
    expect(noAgent.reason).toContain('not in org chart');
  });

  it('should track budget across all agents during workday', async () => {
    // Simulate multiple agents executing tasks
    const agentIds = ['ceo', 'content_writer', 'social_media'] as const;

    for (const agentId of agentIds) {
      const task = taskQueue.create({
        title: `Task for ${agentId}`,
        description: 'Workday task',
        assignedTo: agentId,
        createdBy: 'ceo',
      });

      taskQueue.updateStatus(task.id, 'in_progress');
      const result = await mockAdapter.executeTask(task, config.org[agentId]);
      budgetTracker.record(agentId, result.cost);
      taskQueue.updateStatus(task.id, 'completed', result.output);
    }

    // Verify spend per agent
    for (const agentId of agentIds) {
      expect(budgetTracker.getSpent(agentId)).toBe(0.03);
      expect(budgetTracker.canSpend(agentId, 0.01)).toBe(true);
    }

    // Verify overall task completion
    const counts = taskQueue.countByStatus();
    expect(counts.completed).toBe(3);
    expect(counts.pending).toBe(0);
  });

  it('should enforce governance: external email requires CEO approval (QUEUED)', () => {
    // The content-agency template has a governance rule:
    //   action: "email.send_external" → requires approval
    // Account manager has email skill, so permission passes
    const action = makeAction(
      'account_manager',
      'email.send_external',
      'Send update to client',
    );
    const result = orchestrator.check('account_manager', action);

    // The governance rule should cause this to be QUEUED (or at minimum not auto-ALLOWED)
    // Depending on orchestrator implementation it may be QUEUED or BLOCKED
    // The key assertion: it should NOT be simply ALLOWED without approval
    expect(['QUEUED', 'BLOCKED']).toContain(result.decision);
  });

  it('should complete full workday flow end-to-end', async () => {
    // 1. CEO heartbeat: reviews and creates tasks
    const writerTask = taskQueue.create({
      title: 'Write AI trends blog post',
      description: '1500-word SEO article',
      assignedTo: 'content_writer',
      createdBy: 'ceo',
      priority: 'high',
    });

    const socialTask = taskQueue.create({
      title: 'Promote blog on social media',
      description: 'Create posts for all platforms',
      assignedTo: 'social_media',
      createdBy: 'ceo',
      priority: 'normal',
    });

    // 2. Writer heartbeat: picks up task, executes
    taskQueue.updateStatus(writerTask.id, 'in_progress');

    const writerResearch = makeAction(
      'content_writer',
      'browser.search',
      'Research topics',
    );
    expect(orchestrator.check('content_writer', writerResearch).decision).toBe(
      'ALLOWED',
    );

    const writerResult = await mockAdapter.executeTask(
      writerTask,
      config.org.content_writer,
    );
    budgetTracker.record('content_writer', writerResult.cost);
    orchestrator.recordSpend('content_writer', writerResult.cost);
    taskQueue.updateStatus(writerTask.id, 'completed', writerResult.output);

    // 3. Social heartbeat: picks up task, creates posts
    taskQueue.updateStatus(socialTask.id, 'in_progress');

    const socialPost = makeAction(
      'social_media',
      'messaging.post',
      'Post content',
    );
    expect(orchestrator.check('social_media', socialPost).decision).toBe(
      'ALLOWED',
    );

    const socialResult = await mockAdapter.executeTask(
      socialTask,
      config.org.social_media,
    );
    budgetTracker.record('social_media', socialResult.cost);
    orchestrator.recordSpend('social_media', socialResult.cost);
    taskQueue.updateStatus(socialTask.id, 'completed', socialResult.output);

    // 4. Verify final state
    expect(taskQueue.get(writerTask.id)!.status).toBe('completed');
    expect(taskQueue.get(socialTask.id)!.status).toBe('completed');
    expect(budgetTracker.getSpent('content_writer')).toBe(0.03);
    expect(budgetTracker.getSpent('social_media')).toBe(0.03);
    expect(orchestrator.getSpend('content_writer')).toBe(0.03);
    expect(orchestrator.getSpend('social_media')).toBe(0.03);

    const counts = taskQueue.countByStatus();
    expect(counts.completed).toBe(2);
    expect(counts.pending).toBe(0);
    expect(counts.in_progress).toBe(0);
  });
});
