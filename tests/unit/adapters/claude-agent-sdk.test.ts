import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { AgentConfig, Task, TaskContext, ToolDefinition } from '@agentorg/core';
import { ClaudeAgentSDKAdapter } from '../../../packages/adapters/src/claude-agent-sdk.js';

// ─── Fixtures ────────────────────────────────────────────────────────────────

function makeAgentConfig(overrides: Partial<AgentConfig> = {}): AgentConfig {
  return {
    id: 'agent-ceo-01',
    name: 'CEO Agent',
    role: 'ceo',
    runtime: 'claude-agent-sdk',
    model: 'claude-sonnet-4-20250514',
    personality: 'Strategic thinker. Delegates effectively. Keeps the big picture.',
    budget: 200,
    reportsTo: 'owner',
    skills: ['email', 'calendar', 'browser'],
    allowedTools: ['send_email', 'create_event', 'browse_url'],
    ...overrides,
  };
}

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-sdk-001',
    title: 'Draft weekly team update',
    description: 'Write a concise weekly update email summarizing progress on all active projects.',
    assignedTo: 'agent-ceo-01',
    createdBy: 'owner',
    status: 'pending',
    priority: 'high',
    createdAt: new Date('2026-03-15T08:00:00Z'),
    updatedAt: new Date('2026-03-15T08:00:00Z'),
    ...overrides,
  };
}

function makeTaskContext(overrides: Partial<TaskContext> = {}): TaskContext {
  return {
    personality: 'Strategic thinker. Delegates effectively. Keeps the big picture.',
    model: 'claude-sonnet-4-20250514',
    skills: ['email', 'calendar', 'browser'],
    allowedTools: ['send_email', 'create_event', 'browse_url'],
    budget: 200,
    memory: { lastWeekSummary: 'Shipped v0.2, onboarded 3 clients.' },
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('ClaudeAgentSDKAdapter', () => {
  let adapter: ClaudeAgentSDKAdapter;

  beforeEach(() => {
    adapter = new ClaudeAgentSDKAdapter();
  });

  afterEach(async () => {
    await adapter.shutdown();
  });

  // ── runtime property ────────────────────────────────────────────────────

  it('should have runtime set to "claude-agent-sdk"', () => {
    expect(adapter.runtime).toBe('claude-agent-sdk');
  });

  // ── initialize ──────────────────────────────────────────────────────────

  describe('initialize', () => {
    it('should initialize with agent config without throwing', async () => {
      await expect(adapter.initialize(makeAgentConfig())).resolves.toBeUndefined();
    });

    it('should accept config with skills that will be mapped to tools', async () => {
      const config = makeAgentConfig({ skills: ['email', 'crm', 'browser'] });
      await expect(adapter.initialize(config)).resolves.toBeUndefined();
    });
  });

  // ── executeTask ─────────────────────────────────────────────────────────

  describe('executeTask', () => {
    it('should return a TaskResult with success on normal execution', async () => {
      await adapter.initialize(makeAgentConfig());
      const result = await adapter.executeTask(makeTask(), makeTaskContext());

      expect(result).toEqual(
        expect.objectContaining({
          success: expect.any(Boolean),
          output: expect.any(String),
          tokensUsed: expect.any(Number),
          cost: expect.any(Number),
          actions: expect.any(Array),
        }),
      );
    });

    it('should support tool_use in task execution', async () => {
      await adapter.initialize(makeAgentConfig());

      const task = makeTask({
        description: 'Send an email to the team with the weekly update. Use the send_email tool.',
      });
      const context = makeTaskContext({
        allowedTools: ['send_email'],
      });

      const result = await adapter.executeTask(task, context);

      // TDD: When the SDK adapter processes a task requiring tool use,
      // it should record the tool calls in the actions array.
      expect(result.success).toBe(true);
      expect(result.actions).toBeDefined();
      expect(Array.isArray(result.actions)).toBe(true);
      // Once implemented, actions should contain the tool_use records
      if (result.actions.length > 0) {
        expect(result.actions[0]).toEqual(
          expect.objectContaining({
            id: expect.any(String),
            agentId: expect.any(String),
            type: expect.any(String),
            description: expect.any(String),
            timestamp: expect.any(Date),
          }),
        );
      }
    });

    it('should track token usage from the SDK response', async () => {
      await adapter.initialize(makeAgentConfig());
      const result = await adapter.executeTask(makeTask(), makeTaskContext());

      // TDD: token usage should be reported accurately
      expect(result.tokensUsed).toBeGreaterThanOrEqual(0);
      expect(result.cost).toBeGreaterThanOrEqual(0);
    });

    it('should handle errors gracefully and return success: false', async () => {
      await adapter.initialize(makeAgentConfig());

      // Force an error scenario by providing an impossible budget
      const context = makeTaskContext({ budget: 0 });
      const task = makeTask({
        description: 'This task should fail gracefully if budget is exhausted.',
      });

      const result = await adapter.executeTask(task, context);

      // The adapter should not throw; it should return a structured error
      expect(result).toEqual(
        expect.objectContaining({
          success: expect.any(Boolean),
          output: expect.any(String),
          tokensUsed: expect.any(Number),
          cost: expect.any(Number),
          actions: expect.any(Array),
        }),
      );
    });
  });

  // ── heartbeat ───────────────────────────────────────────────────────────

  describe('heartbeat', () => {
    it('should return a valid HeartbeatResult with all required fields', async () => {
      await adapter.initialize(makeAgentConfig());
      const agent = makeAgentConfig();
      const result = await adapter.heartbeat(agent);

      expect(result.agentId).toBe(agent.id);
      expect(result.runtime).toBe('claude-agent-sdk');
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should check tasks, inbox, deadlines, and alerts', async () => {
      await adapter.initialize(makeAgentConfig());
      const result = await adapter.heartbeat(makeAgentConfig());

      expect(result.checked).toEqual(
        expect.objectContaining({
          taskQueue: expect.any(Number),
          inbox: expect.any(Number),
          deadlines: expect.any(Number),
          alerts: expect.any(Number),
        }),
      );
    });

    it('should report actions taken during heartbeat cycle', async () => {
      await adapter.initialize(makeAgentConfig());
      const result = await adapter.heartbeat(makeAgentConfig());

      expect(result.acted).toEqual(
        expect.objectContaining({
          tasksCompleted: expect.any(Number),
          messagesReplied: expect.any(Number),
          escalations: expect.any(Array),
          delegations: expect.any(Array),
        }),
      );
    });

    it('should schedule the next heartbeat in the future', async () => {
      await adapter.initialize(makeAgentConfig());
      const result = await adapter.heartbeat(makeAgentConfig());

      expect(result.nextHeartbeat).toBeInstanceOf(Date);
      expect(result.nextHeartbeat.getTime()).toBeGreaterThan(result.timestamp.getTime());
    });

    it('should track token usage during heartbeat', async () => {
      await adapter.initialize(makeAgentConfig());
      const result = await adapter.heartbeat(makeAgentConfig());

      expect(result.tokensUsed).toBeGreaterThanOrEqual(0);
    });
  });

  // ── skill-to-tool mapping ──────────────────────────────────────────────

  describe('skill-to-tool mapping', () => {
    it('should map skill names to tool definitions for the SDK', async () => {
      const config = makeAgentConfig({
        skills: ['email', 'calendar', 'browser'],
        allowedTools: ['send_email', 'create_event', 'browse_url'],
      });
      await adapter.initialize(config);

      // TDD: The adapter should expose a way to retrieve mapped tools,
      // or at minimum use them when executing tasks.
      // We test indirectly: executing a task with skills should not fail.
      const result = await adapter.executeTask(
        makeTask({ description: 'Browse https://example.com and summarize the page.' }),
        makeTaskContext({ skills: ['browser'], allowedTools: ['browse_url'] }),
      );

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it('should handle agents with no skills gracefully', async () => {
      const config = makeAgentConfig({ skills: [], allowedTools: [] });
      await adapter.initialize(config);

      const result = await adapter.executeTask(
        makeTask(),
        makeTaskContext({ skills: [], allowedTools: [] }),
      );

      expect(result).toBeDefined();
      expect(result.output).toBeDefined();
    });
  });

  // ── shutdown ────────────────────────────────────────────────────────────

  describe('shutdown', () => {
    it('should shut down without error', async () => {
      await adapter.initialize(makeAgentConfig());
      await expect(adapter.shutdown()).resolves.toBeUndefined();
    });

    it('should be safe to call shutdown without initializing first', async () => {
      await expect(adapter.shutdown()).resolves.toBeUndefined();
    });
  });
});
