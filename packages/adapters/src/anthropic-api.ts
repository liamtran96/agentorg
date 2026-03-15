import type { AgentConfig, Task, TaskContext, TaskResult, HeartbeatResult } from '@agentorg/core';
import type { AgentAdapter } from './base.js';

/**
 * Anthropic API adapter — direct Messages API.
 * Cheapest runtime for simple Q&A agents (support, social).
 * Your native skills are exposed via function calling.
 */
export class AnthropicAPIAdapter implements AgentAdapter {
  readonly runtime = 'anthropic-api' as const;
  private config: AgentConfig | null = null;

  async initialize(config: AgentConfig): Promise<void> {
    this.config = config;
  }

  async shutdown(): Promise<void> {
    this.config = null;
  }

  async executeTask(task: Task, context: TaskContext): Promise<TaskResult> {
    // Phase 1: placeholder — will use @anthropic-ai/sdk
    const startTime = Date.now();

    // TODO: Implement actual Anthropic Messages API call
    // const response = await client.messages.create({
    //   model: context.model,
    //   system: context.personality,
    //   messages: [{ role: 'user', content: task.description }],
    //   tools: context.skills.map(s => s.getToolDefinition()),
    // });

    return {
      success: true,
      output: `[AnthropicAPI] Would process: "${task.title}"`,
      tokensUsed: 0,
      cost: 0,
      actions: [],
    };
  }

  async heartbeat(agent: AgentConfig): Promise<HeartbeatResult> {
    return {
      agentId: agent.id,
      runtime: this.runtime,
      timestamp: new Date(),
      checked: { taskQueue: 0, inbox: 0, deadlines: 0, alerts: 0 },
      acted: { tasksCompleted: 0, messagesReplied: 0, escalations: [], delegations: [] },
      tokensUsed: 0,
      nextHeartbeat: new Date(Date.now() + 15 * 60 * 1000),
    };
  }
}
