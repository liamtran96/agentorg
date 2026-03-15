import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { AgentConfig, Task, TaskContext } from '@agentorg/core';
import { AnthropicAPIAdapter } from '../../../packages/adapters/src/anthropic-api.js';

// Mock the Anthropic SDK
const mockCreate = vi.fn();
vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: class Anthropic {
      messages = { create: mockCreate };
    },
  };
});

// ─── Fixtures ────────────────────────────────────────────────────────────────

function makeAgentConfig(overrides: Partial<AgentConfig> = {}): AgentConfig {
  return {
    id: 'agent-support-01',
    name: 'Support Bot',
    role: 'customer-support',
    runtime: 'anthropic-api',
    model: 'claude-sonnet-4-20250514',
    personality: 'Friendly and concise customer support agent.',
    budget: 50,
    reportsTo: 'ceo',
    skills: ['email', 'crm'],
    ...overrides,
  };
}

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-001',
    title: 'Reply to customer inquiry',
    description: 'Customer asks about refund policy. Reply with our standard policy.',
    assignedTo: 'agent-support-01',
    createdBy: 'ceo',
    status: 'pending',
    priority: 'normal',
    createdAt: new Date('2026-03-15T10:00:00Z'),
    updatedAt: new Date('2026-03-15T10:00:00Z'),
    ...overrides,
  };
}

function makeTaskContext(overrides: Partial<TaskContext> = {}): TaskContext {
  return {
    personality: 'Friendly and concise customer support agent.',
    model: 'claude-sonnet-4-20250514',
    skills: ['email', 'crm'],
    budget: 50,
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('AnthropicAPIAdapter', () => {
  let adapter: AnthropicAPIAdapter;

  beforeEach(() => {
    adapter = new AnthropicAPIAdapter();
    mockCreate.mockReset();
  });

  afterEach(async () => {
    await adapter.shutdown();
  });

  // ── runtime property ────────────────────────────────────────────────────

  it('should have runtime set to "anthropic-api"', () => {
    expect(adapter.runtime).toBe('anthropic-api');
  });

  // ── initialize ──────────────────────────────────────────────────────────

  describe('initialize', () => {
    it('should initialize with agent config without throwing', async () => {
      await expect(adapter.initialize(makeAgentConfig())).resolves.toBeUndefined();
    });

    it('should accept config with optional model field', async () => {
      await expect(
        adapter.initialize(makeAgentConfig({ model: undefined })),
      ).resolves.toBeUndefined();
    });
  });

  // ── executeTask ─────────────────────────────────────────────────────────

  describe('executeTask', () => {
    it('should return a TaskResult with success true when API responds', async () => {
      mockCreate.mockResolvedValue({
        id: 'msg_01',
        type: 'message',
        role: 'assistant',
        content: [{ type: 'text', text: 'Our refund policy allows returns within 30 days.' }],
        model: 'claude-sonnet-4-20250514',
        usage: { input_tokens: 120, output_tokens: 45 },
        stop_reason: 'end_turn',
      });

      await adapter.initialize(makeAgentConfig());
      const result = await adapter.executeTask(makeTask(), makeTaskContext());

      expect(result.success).toBe(true);
      expect(result.output).toContain('refund');
      expect(result.tokensUsed).toBeGreaterThanOrEqual(0);
      expect(result.cost).toBeGreaterThanOrEqual(0);
      expect(result.actions).toBeDefined();
      expect(Array.isArray(result.actions)).toBe(true);
    });

    it('should track token usage from the API response', async () => {
      mockCreate.mockResolvedValue({
        id: 'msg_02',
        type: 'message',
        role: 'assistant',
        content: [{ type: 'text', text: 'Done.' }],
        model: 'claude-sonnet-4-20250514',
        usage: { input_tokens: 200, output_tokens: 80 },
        stop_reason: 'end_turn',
      });

      await adapter.initialize(makeAgentConfig());
      const result = await adapter.executeTask(makeTask(), makeTaskContext());

      // TDD: The adapter SHOULD report real token usage from the API.
      // Once implemented, these should pass with actual values.
      expect(result.tokensUsed).toBe(280);
      expect(result.cost).toBeGreaterThan(0);
    });

    it('should call client.messages.create with the correct parameters', async () => {
      mockCreate.mockResolvedValue({
        id: 'msg_03',
        type: 'message',
        role: 'assistant',
        content: [{ type: 'text', text: 'Response' }],
        model: 'claude-sonnet-4-20250514',
        usage: { input_tokens: 50, output_tokens: 10 },
        stop_reason: 'end_turn',
      });

      await adapter.initialize(makeAgentConfig());
      const task = makeTask();
      const context = makeTaskContext();
      await adapter.executeTask(task, context);

      expect(mockCreate).toHaveBeenCalledTimes(1);
      const callArgs = mockCreate.mock.calls[0][0];
      expect(callArgs.model).toBe('claude-sonnet-4-20250514');
      expect(callArgs.messages).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ role: 'user', content: expect.stringContaining(task.description) }),
        ]),
      );
    });

    it('should handle API errors gracefully and return success: false', async () => {
      mockCreate.mockRejectedValue(new Error('API rate limit exceeded'));

      await adapter.initialize(makeAgentConfig());
      const result = await adapter.executeTask(makeTask(), makeTaskContext());

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('rate limit');
      expect(result.tokensUsed).toBe(0);
      expect(result.cost).toBe(0);
    });

    it('should compute cost based on token usage', async () => {
      mockCreate.mockResolvedValue({
        id: 'msg_04',
        type: 'message',
        role: 'assistant',
        content: [{ type: 'text', text: 'Here is the analysis.' }],
        model: 'claude-sonnet-4-20250514',
        usage: { input_tokens: 1000, output_tokens: 500 },
        stop_reason: 'end_turn',
      });

      await adapter.initialize(makeAgentConfig());
      const result = await adapter.executeTask(makeTask(), makeTaskContext());

      // TDD: Cost should be calculated from token counts.
      // Exact formula depends on model pricing, but cost must be positive.
      expect(result.tokensUsed).toBe(1500);
      expect(result.cost).toBeGreaterThan(0);
    });
  });

  // ── heartbeat ───────────────────────────────────────────────────────────

  describe('heartbeat', () => {
    it('should return a valid HeartbeatResult', async () => {
      await adapter.initialize(makeAgentConfig());
      const agent = makeAgentConfig();
      const result = await adapter.heartbeat(agent);

      expect(result.agentId).toBe(agent.id);
      expect(result.runtime).toBe('anthropic-api');
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.checked).toEqual(
        expect.objectContaining({
          taskQueue: expect.any(Number),
          inbox: expect.any(Number),
          deadlines: expect.any(Number),
          alerts: expect.any(Number),
        }),
      );
      expect(result.acted).toEqual(
        expect.objectContaining({
          tasksCompleted: expect.any(Number),
          messagesReplied: expect.any(Number),
          escalations: expect.any(Array),
          delegations: expect.any(Array),
        }),
      );
      expect(result.tokensUsed).toBeGreaterThanOrEqual(0);
      expect(result.nextHeartbeat).toBeInstanceOf(Date);
      expect(result.nextHeartbeat.getTime()).toBeGreaterThan(result.timestamp.getTime());
    });
  });

  // ── shutdown ────────────────────────────────────────────────────────────

  describe('shutdown', () => {
    it('should shut down without error', async () => {
      await adapter.initialize(makeAgentConfig());
      await expect(adapter.shutdown()).resolves.toBeUndefined();
    });

    it('should be safe to call shutdown before initialize', async () => {
      await expect(adapter.shutdown()).resolves.toBeUndefined();
    });
  });
});
