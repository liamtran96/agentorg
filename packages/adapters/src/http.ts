import type { AgentConfig, Task, TaskContext, TaskResult, HeartbeatResult } from '@agentorg/core';
import type { AgentAdapter } from './base.js';

/**
 * Generic HTTP adapter — plug in ANY agent runtime.
 * Works with: OpenClaw, Codex, Cursor, Devin, Manus, custom scripts.
 * If it has an HTTP endpoint, it's an agent.
 */
export class HTTPAdapter implements AgentAdapter {
  readonly runtime = 'http' as const;
  private config: AgentConfig | null = null;

  async initialize(config: AgentConfig): Promise<void> {
    this.config = config;
    if (!config.endpoint) {
      throw new Error(`HTTP adapter requires an endpoint for agent "${config.name}"`);
    }
  }

  async shutdown(): Promise<void> {
    this.config = null;
  }

  async executeTask(task: Task, context: TaskContext): Promise<TaskResult> {
    if (!this.config?.endpoint) {
      return { success: false, output: 'No endpoint configured', tokensUsed: 0, cost: 0, actions: [], error: 'NO_ENDPOINT' };
    }

    try {
      const response = await fetch(this.config.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: task.description,
          context: context.personality,
          skills: context.skills,
        }),
      });

      const data = await response.json() as Record<string, any>;

      return {
        success: response.ok,
        output: data.output || data.result || JSON.stringify(data),
        tokensUsed: data.tokensUsed || 0,
        cost: data.cost || 0,
        actions: [],
      };
    } catch (err) {
      return {
        success: false,
        output: '',
        tokensUsed: 0,
        cost: 0,
        actions: [],
        error: String(err),
      };
    }
  }

  async heartbeat(agent: AgentConfig): Promise<HeartbeatResult> {
    return {
      agentId: agent.id,
      runtime: this.runtime,
      timestamp: new Date(),
      checked: { taskQueue: 0, inbox: 0, deadlines: 0, alerts: 0 },
      acted: { tasksCompleted: 0, messagesReplied: 0, escalations: [], delegations: [] },
      tokensUsed: 0,
      nextHeartbeat: new Date(Date.now() + 60 * 60 * 1000),
    };
  }
}
