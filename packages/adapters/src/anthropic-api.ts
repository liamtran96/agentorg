import type { AgentConfig, Task, TaskContext, TaskResult, HeartbeatResult } from '@agentorg/core';
import type { AgentAdapter } from './base.js';
import { createDefaultHeartbeatResult, createFailedTaskResult } from './base.js';
import Anthropic from '@anthropic-ai/sdk';

/** Cost per token by model family (rough estimates in USD) */
const TOKEN_COSTS: Record<string, { input: number; output: number }> = {
  'claude-sonnet-4-20250514': { input: 3 / 1_000_000, output: 15 / 1_000_000 },
  'claude-opus-4-20250514': { input: 15 / 1_000_000, output: 75 / 1_000_000 },
  'claude-haiku': { input: 0.25 / 1_000_000, output: 1.25 / 1_000_000 },
};

const DEFAULT_COST = { input: 3 / 1_000_000, output: 15 / 1_000_000 };

/**
 * Anthropic API adapter — direct Messages API.
 * Cheapest runtime for simple Q&A agents (support, social).
 * Your native skills are exposed via function calling.
 */
export class AnthropicAPIAdapter implements AgentAdapter {
  readonly runtime = 'anthropic-api' as const;
  private config: AgentConfig | null = null;
  private client: Anthropic | null = null;

  async initialize(config: AgentConfig): Promise<void> {
    this.config = config;
    this.client = new Anthropic();
  }

  async shutdown(): Promise<void> {
    this.config = null;
    this.client = null;
  }

  async executeTask(task: Task, context: TaskContext): Promise<TaskResult> {
    if (!this.client || !this.config) {
      return {
        success: false,
        output: '',
        tokensUsed: 0,
        cost: 0,
        actions: [],
        error: 'Adapter not initialized',
      };
    }

    try {
      const model = context.model || this.config.model || 'claude-sonnet-4-20250514';

      const response = await this.client.messages.create({
        model,
        max_tokens: 4096,
        system: context.personality,
        messages: [
          {
            role: 'user',
            content: `Task: ${task.title}\n\n${task.description}`,
          },
        ],
      });

      const outputText = response.content
        .filter((block: any) => block.type === 'text')
        .map((block: any) => block.text)
        .join('\n');

      const inputTokens = response.usage?.input_tokens ?? 0;
      const outputTokens = response.usage?.output_tokens ?? 0;
      const tokensUsed = inputTokens + outputTokens;

      const pricing = TOKEN_COSTS[model] || DEFAULT_COST;
      const cost = inputTokens * pricing.input + outputTokens * pricing.output;

      return {
        success: true,
        output: outputText,
        tokensUsed,
        cost,
        actions: [],
      };
    } catch (err) {
      return createFailedTaskResult(err);
    }
  }

  async heartbeat(agent: AgentConfig): Promise<HeartbeatResult> {
    return createDefaultHeartbeatResult(agent.id, this.runtime, 15 * 60 * 1000);
  }
}
