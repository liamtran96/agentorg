import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { AgentConfig, Task, TaskContext } from '@agentorg/core';
import { HTTPAdapter } from '../../../packages/adapters/src/http.js';

// ─── Fixtures ────────────────────────────────────────────────────────────────

function makeAgentConfig(overrides: Partial<AgentConfig> = {}): AgentConfig {
  return {
    id: 'agent-webhook-01',
    name: 'Webhook Agent',
    role: 'integrations',
    runtime: 'http',
    personality: 'A reliable integration agent.',
    budget: 20,
    reportsTo: 'ceo',
    skills: ['webhook'],
    endpoint: 'https://my-agent.example.com/execute',
    ...overrides,
  };
}

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-http-001',
    title: 'Process webhook event',
    description: 'Handle the incoming Stripe payment webhook.',
    assignedTo: 'agent-webhook-01',
    createdBy: 'ceo',
    status: 'pending',
    priority: 'high',
    createdAt: new Date('2026-03-15T12:00:00Z'),
    updatedAt: new Date('2026-03-15T12:00:00Z'),
    ...overrides,
  };
}

function makeTaskContext(overrides: Partial<TaskContext> = {}): TaskContext {
  return {
    personality: 'A reliable integration agent.',
    model: 'external',
    skills: ['webhook'],
    budget: 20,
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('HTTPAdapter', () => {
  let adapter: HTTPAdapter;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    adapter = new HTTPAdapter();
    // Reset fetch mock before each test
    globalThis.fetch = vi.fn();
  });

  afterEach(async () => {
    await adapter.shutdown();
    globalThis.fetch = originalFetch;
  });

  // ── runtime property ────────────────────────────────────────────────────

  it('should have runtime set to "http"', () => {
    expect(adapter.runtime).toBe('http');
  });

  // ── initialize ──────────────────────────────────────────────────────────

  describe('initialize', () => {
    it('should initialize with valid config containing an endpoint', async () => {
      await expect(adapter.initialize(makeAgentConfig())).resolves.toBeUndefined();
    });

    it('should throw if endpoint is missing', async () => {
      const configNoEndpoint = makeAgentConfig({ endpoint: undefined });
      await expect(adapter.initialize(configNoEndpoint)).rejects.toThrow(/endpoint/i);
    });

    it('should throw if endpoint is empty string', async () => {
      const configEmptyEndpoint = makeAgentConfig({ endpoint: '' });
      // Empty string is falsy, so the adapter should reject it
      await expect(adapter.initialize(configEmptyEndpoint)).rejects.toThrow(/endpoint/i);
    });
  });

  // ── executeTask ─────────────────────────────────────────────────────────

  describe('executeTask', () => {
    it('should send a POST request to the configured endpoint', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          output: 'Payment processed successfully.',
          tokensUsed: 0,
          cost: 0,
        }),
      };
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);

      await adapter.initialize(makeAgentConfig());
      await adapter.executeTask(makeTask(), makeTaskContext());

      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        'https://my-agent.example.com/execute',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
          body: expect.any(String),
        }),
      );
    });

    it('should include task description and context in the request body', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ output: 'Done.' }),
      };
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);

      const task = makeTask();
      const context = makeTaskContext();
      await adapter.initialize(makeAgentConfig());
      await adapter.executeTask(task, context);

      const callArgs = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.task).toBe(task.description);
      expect(body.context).toBe(context.personality);
      expect(body.skills).toEqual(context.skills);
    });

    it('should parse a successful response into a TaskResult', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          output: 'Webhook handled.',
          tokensUsed: 42,
          cost: 0.001,
        }),
      };
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);

      await adapter.initialize(makeAgentConfig());
      const result = await adapter.executeTask(makeTask(), makeTaskContext());

      expect(result.success).toBe(true);
      expect(result.output).toBe('Webhook handled.');
      expect(result.tokensUsed).toBe(42);
      expect(result.cost).toBe(0.001);
      expect(result.actions).toEqual([]);
    });

    it('should use "result" field as fallback if "output" is missing', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          result: 'Fallback output from result field.',
        }),
      };
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);

      await adapter.initialize(makeAgentConfig());
      const result = await adapter.executeTask(makeTask(), makeTaskContext());

      expect(result.success).toBe(true);
      expect(result.output).toBe('Fallback output from result field.');
    });

    it('should handle network errors gracefully (fetch throws)', async () => {
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Network unreachable'),
      );

      await adapter.initialize(makeAgentConfig());
      const result = await adapter.executeTask(makeTask(), makeTaskContext());

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('Network unreachable');
      expect(result.tokensUsed).toBe(0);
      expect(result.cost).toBe(0);
    });

    it('should handle non-200 responses by setting success to false', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        json: vi.fn().mockResolvedValue({
          output: 'Internal Server Error',
        }),
      };
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);

      await adapter.initialize(makeAgentConfig());
      const result = await adapter.executeTask(makeTask(), makeTaskContext());

      expect(result.success).toBe(false);
      expect(result.output).toContain('Internal Server Error');
    });

    it('should return error result if not initialized (no endpoint)', async () => {
      // Do not call initialize
      const result = await adapter.executeTask(makeTask(), makeTaskContext());

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should JSON-stringify response data when output and result fields are absent', async () => {
      const responseData = { status: 'ok', detail: 'no output field' };
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue(responseData),
      };
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);

      await adapter.initialize(makeAgentConfig());
      const result = await adapter.executeTask(makeTask(), makeTaskContext());

      expect(result.success).toBe(true);
      expect(result.output).toBe(JSON.stringify(responseData));
    });
  });

  // ── heartbeat ───────────────────────────────────────────────────────────

  describe('heartbeat', () => {
    it('should return a valid HeartbeatResult', async () => {
      await adapter.initialize(makeAgentConfig());
      const agent = makeAgentConfig();
      const result = await adapter.heartbeat(agent);

      expect(result.agentId).toBe(agent.id);
      expect(result.runtime).toBe('http');
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
      expect(result.nextHeartbeat).toBeInstanceOf(Date);
      expect(result.nextHeartbeat.getTime()).toBeGreaterThan(Date.now());
    });
  });

  // ── shutdown ────────────────────────────────────────────────────────────

  describe('shutdown', () => {
    it('should shut down without error', async () => {
      await adapter.initialize(makeAgentConfig());
      await expect(adapter.shutdown()).resolves.toBeUndefined();
    });
  });
});
