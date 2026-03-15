import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { HeartbeatScheduler } from '@agentorg/core';
import type { AgentConfig, HeartbeatResult } from '@agentorg/core';

// Mock node-cron
vi.mock('node-cron', () => ({
  default: {
    schedule: vi.fn(() => ({
      stop: vi.fn(),
    })),
    validate: vi.fn(() => true),
  },
  schedule: vi.fn(() => ({
    stop: vi.fn(),
  })),
  validate: vi.fn(() => true),
}));

function makeAgent(overrides: Partial<AgentConfig> = {}): AgentConfig {
  return {
    id: 'writer',
    name: 'Bob',
    role: 'Writer',
    runtime: 'claude-agent-sdk',
    personality: 'Creative writer',
    budget: 500,
    reportsTo: 'ceo',
    skills: ['writing'],
    heartbeat: {
      schedule: '*/15 * * * *',
      tasks: ['check_inbox', 'process_tasks'],
    },
    ...overrides,
  };
}

describe('HeartbeatScheduler', () => {
  let scheduler: HeartbeatScheduler;

  beforeEach(() => {
    scheduler = new HeartbeatScheduler();
  });

  afterEach(() => {
    scheduler.stopAll();
    vi.restoreAllMocks();
  });

  it('should schedule a heartbeat for an agent', async () => {
    const agent = makeAgent();
    const callback = vi.fn();

    await scheduler.start(agent, callback);

    expect(scheduler.isRunning('writer')).toBe(true);
  });

  it('should trigger a reactive heartbeat immediately', async () => {
    const agent = makeAgent({
      heartbeat: {
        schedule: '*/15 * * * *',
        tasks: ['check_inbox'],
        reactive: [{ trigger: 'new_email', priority: 'high' }],
      },
    });
    const callback = vi.fn().mockResolvedValue({
      agentId: 'writer',
      runtime: 'claude-agent-sdk',
      timestamp: new Date(),
      checked: { taskQueue: 0, inbox: 1, deadlines: 0, alerts: 0 },
      acted: { tasksCompleted: 0, messagesReplied: 1, escalations: [], delegations: [] },
      tokensUsed: 100,
      nextHeartbeat: new Date(),
    } satisfies HeartbeatResult);

    const result = await scheduler.triggerReactive(agent, 'new_email', callback);

    expect(callback).toHaveBeenCalled();
    expect(result).toBeDefined();
    expect(result.agentId).toBe('writer');
  });

  it('should stop an individual agent heartbeat', async () => {
    const agent = makeAgent();
    const callback = vi.fn();

    await scheduler.start(agent, callback);
    expect(scheduler.isRunning('writer')).toBe(true);

    scheduler.stop('writer');
    expect(scheduler.isRunning('writer')).toBe(false);
  });

  it('should stop all heartbeats', async () => {
    const agent1 = makeAgent({ id: 'writer' });
    const agent2 = makeAgent({ id: 'editor', name: 'Carol' });
    const callback = vi.fn();

    await scheduler.start(agent1, callback);
    await scheduler.start(agent2, callback);

    expect(scheduler.isRunning('writer')).toBe(true);
    expect(scheduler.isRunning('editor')).toBe(true);

    scheduler.stopAll();

    expect(scheduler.isRunning('writer')).toBe(false);
    expect(scheduler.isRunning('editor')).toBe(false);
  });

  it('should return false for isRunning on unregistered agent', () => {
    expect(scheduler.isRunning('nonexistent')).toBe(false);
  });
});
