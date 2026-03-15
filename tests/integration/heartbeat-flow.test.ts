import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  TaskQueue,
  OrgChart,
  BudgetTracker,
  HeartbeatScheduler,
} from '@agentorg/core';
import type {
  AgentConfig,
  HeartbeatResult,
  Task,
  TaskResult,
} from '@agentorg/core';

/** Mock adapter that simulates task execution */
function createMockAdapter() {
  return {
    executeTask: vi.fn(
      async (task: Task, _agent: AgentConfig): Promise<TaskResult> => ({
        success: true,
        output: `Completed: ${task.title}`,
        tokensUsed: 100,
        cost: 0.05,
        actions: [],
      }),
    ),
  };
}

const agents: Record<string, AgentConfig> = {
  ceo: {
    id: 'ceo',
    name: 'Alex',
    role: 'ceo',
    runtime: 'claude-agent-sdk',
    personality: 'Strategic CEO',
    budget: 50,
    reportsTo: 'board',
    skills: ['browser', 'email', 'calendar'],
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
    skills: ['browser', 'filesystem'],
    heartbeat: { schedule: '0 */2 * * *', tasks: ['check_task_queue'] },
  },
  social: {
    id: 'social',
    name: 'Sam',
    role: 'social_media',
    runtime: 'anthropic-api',
    personality: 'Social media manager',
    budget: 10,
    reportsTo: 'ceo',
    skills: ['messaging'],
    heartbeat: { schedule: '*/30 * * * *', tasks: ['post_scheduled'] },
  },
};

describe('Integration — Heartbeat Flow', () => {
  let taskQueue: TaskQueue;
  let orgChart: OrgChart;
  let budgetTracker: BudgetTracker;
  let mockAdapter: ReturnType<typeof createMockAdapter>;

  beforeEach(() => {
    taskQueue = new TaskQueue();
    orgChart = new OrgChart(agents);
    budgetTracker = new BudgetTracker();
    mockAdapter = createMockAdapter();

    // Set budget limits
    for (const [id, agent] of Object.entries(agents)) {
      budgetTracker.setLimit(id, agent.budget);
    }
  });

  it('should wake agent on heartbeat, check queue, execute task, and report result', async () => {
    // CEO creates a task for writer
    const task = taskQueue.create({
      title: 'Write blog post about AI',
      description: 'Write a 1000-word blog post',
      assignedTo: 'writer',
      createdBy: 'ceo',
      priority: 'high',
    });

    expect(task.status).toBe('pending');

    // Simulate writer heartbeat: check queue, pick up task, execute
    const pendingTasks = taskQueue.getForAgent('writer', 'pending');
    expect(pendingTasks).toHaveLength(1);

    // Mark as in progress
    taskQueue.updateStatus(task.id, 'in_progress');

    // Execute via adapter
    const result = await mockAdapter.executeTask(task, agents.writer);
    expect(result.success).toBe(true);

    // Record spend
    budgetTracker.record('writer', result.cost);

    // Mark as complete
    taskQueue.updateStatus(task.id, 'completed', result.output);

    // Verify
    const completed = taskQueue.get(task.id);
    expect(completed!.status).toBe('completed');
    expect(completed!.result).toContain('Completed');
    expect(budgetTracker.getSpent('writer')).toBe(0.05);
    expect(mockAdapter.executeTask).toHaveBeenCalledOnce();
  });

  it('should track budget across heartbeat cycle', async () => {
    // Create multiple tasks
    const task1 = taskQueue.create({
      title: 'Task 1',
      description: 'First task',
      assignedTo: 'writer',
      createdBy: 'ceo',
    });
    const task2 = taskQueue.create({
      title: 'Task 2',
      description: 'Second task',
      assignedTo: 'writer',
      createdBy: 'ceo',
    });

    // Execute both tasks
    for (const task of [task1, task2]) {
      taskQueue.updateStatus(task.id, 'in_progress');
      const result = await mockAdapter.executeTask(task, agents.writer);
      budgetTracker.record('writer', result.cost);
      taskQueue.updateStatus(task.id, 'completed', result.output);
    }

    // Budget should accumulate
    expect(budgetTracker.getSpent('writer')).toBe(0.10);
    expect(budgetTracker.canSpend('writer', 19.90)).toBe(true);
    expect(budgetTracker.canSpend('writer', 20.00)).toBe(false);
    expect(budgetTracker.getRemaining('writer')).toBeCloseTo(19.90);
  });

  it('should escalate up the org chart when agent escalates', () => {
    // Writer escalates a task to manager (CEO)
    const writer = orgChart.getAgent('writer');
    expect(writer).toBeDefined();

    const manager = orgChart.getManager('writer');
    expect(manager).toBeDefined();
    expect(manager!.id).toBe('ceo');

    // Create escalation task for the manager
    const escalatedTask = taskQueue.create({
      title: 'ESCALATION: Need approval for external link',
      description: 'Writer needs CEO approval',
      assignedTo: manager!.id,
      createdBy: 'writer',
      priority: 'urgent',
    });

    expect(escalatedTask.assignedTo).toBe('ceo');
    expect(escalatedTask.priority).toBe('urgent');

    // CEO should see this in their queue
    const ceoTasks = taskQueue.getForAgent('ceo', 'pending');
    expect(ceoTasks).toHaveLength(1);
    expect(ceoTasks[0].title).toContain('ESCALATION');
  });

  it('should delegate tasks down the org chart (CEO to writer)', () => {
    const ceo = orgChart.getCEO();
    expect(ceo).toBeDefined();

    // CEO's direct reports
    const reports = orgChart.getDirectReports('ceo');
    expect(reports.length).toBeGreaterThanOrEqual(2);

    // CEO delegates task to writer
    const delegatedTask = taskQueue.create({
      title: 'Write Q1 report',
      description: 'Annual report summary',
      assignedTo: 'writer',
      createdBy: 'ceo',
      priority: 'high',
    });

    expect(delegatedTask.createdBy).toBe('ceo');
    expect(delegatedTask.assignedTo).toBe('writer');

    // Writer should see the task
    const writerTasks = taskQueue.getForAgent('writer', 'pending');
    expect(writerTasks.some((t) => t.title === 'Write Q1 report')).toBe(true);

    // Escalation chain from writer should include CEO
    const chain = orgChart.getEscalationChain('writer');
    expect(chain).toHaveLength(1);
    expect(chain[0].id).toBe('ceo');
  });
});
