import { describe, it, expect } from 'vitest';
import { createAdapter } from '@agentorg/sdk';
import type { Task, AgentConfig, HeartbeatResult, TaskResult } from '@agentorg/core';

describe('SDK — Adapter Builder', () => {
  const makeTask = (): Task => ({
    id: 'task_1',
    title: 'Test Task',
    description: 'A test task',
    assignedTo: 'writer',
    createdBy: 'ceo',
    status: 'pending',
    priority: 'normal',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const makeAgent = (): AgentConfig => ({
    id: 'writer',
    name: 'Maya',
    role: 'writer',
    runtime: 'http',
    personality: 'Writes well',
    budget: 30,
    reportsTo: 'ceo',
    skills: ['browser', 'filesystem'],
  });

  const validAdapterOptions = {
    runtime: 'http' as const,
    initialize: async (_config: Record<string, unknown>) => {
      /* setup */
    },
    executeTask: async (
      _task: Task,
      _context: AgentConfig,
    ): Promise<TaskResult> => ({
      success: true,
      output: 'done',
      tokensUsed: 0,
      cost: 0,
      actions: [],
    }),
    heartbeat: async (agent: AgentConfig): Promise<HeartbeatResult> => ({
      agentId: agent.id,
      runtime: 'http',
      timestamp: new Date(),
      checked: { taskQueue: 0, inbox: 0, deadlines: 0, alerts: 0 },
      acted: {
        tasksCompleted: 0,
        messagesReplied: 0,
        escalations: [],
        delegations: [],
      },
      tokensUsed: 0,
      nextHeartbeat: new Date(),
    }),
  };

  it('should return a valid AgentAdapter with runtime, executeTask, and heartbeat', () => {
    const adapter = createAdapter(validAdapterOptions);

    expect(adapter.runtime).toBe('http');
    expect(typeof adapter.executeTask).toBe('function');
    expect(typeof adapter.heartbeat).toBe('function');
    expect(typeof adapter.initialize).toBe('function');
  });

  it('should throw if executeTask is missing', () => {
    const opts = { ...validAdapterOptions, executeTask: undefined } as any;
    expect(() => createAdapter(opts)).toThrow();
  });

  it('should throw if heartbeat is missing', () => {
    const opts = { ...validAdapterOptions, heartbeat: undefined } as any;
    expect(() => createAdapter(opts)).toThrow();
  });

  it('should set runtime property correctly', () => {
    const adapter = createAdapter(validAdapterOptions);
    expect(adapter.runtime).toBe('http');

    const adapter2 = createAdapter({
      ...validAdapterOptions,
      runtime: 'anthropic-api',
    });
    expect(adapter2.runtime).toBe('anthropic-api');
  });

  it('should delegate executeTask to provided handler', async () => {
    const adapter = createAdapter(validAdapterOptions);
    const task = makeTask();
    const agent = makeAgent();
    const result = await adapter.executeTask(task, agent);

    expect(result.success).toBe(true);
    expect(result.output).toBe('done');
    expect(result.tokensUsed).toBe(0);
    expect(result.cost).toBe(0);
    expect(result.actions).toEqual([]);
  });

  it('should delegate heartbeat to provided handler', async () => {
    const adapter = createAdapter(validAdapterOptions);
    const agent = makeAgent();
    const result = await adapter.heartbeat(agent);

    expect(result.agentId).toBe('writer');
    expect(result.runtime).toBe('http');
    expect(result.checked.taskQueue).toBe(0);
    expect(result.acted.tasksCompleted).toBe(0);
  });

  it('should delegate initialize to provided handler', async () => {
    let initCalled = false;
    const adapter = createAdapter({
      ...validAdapterOptions,
      initialize: async (_config: Record<string, unknown>) => {
        initCalled = true;
      },
    });

    await adapter.initialize({});
    expect(initCalled).toBe(true);
  });
});
