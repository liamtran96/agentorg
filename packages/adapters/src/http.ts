import type { AgentConfig, Task, TaskContext, TaskResult, HeartbeatResult } from '@agentorg/core';
import type { AgentAdapter } from './base.js';
import { createDefaultHeartbeatResult, createFailedTaskResult } from './base.js';

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

      const output = data.output || data.result || JSON.stringify(data);

      if (!response.ok) {
        return {
          success: false,
          output,
          tokensUsed: data.tokensUsed || 0,
          cost: data.cost || 0,
          actions: [],
          error: `HTTP ${response.status}`,
        };
      }

      return {
        success: true,
        output,
        tokensUsed: data.tokensUsed || 0,
        cost: data.cost || 0,
        actions: [],
      };
    } catch (err) {
      return createFailedTaskResult(err);
    }
  }

  async heartbeat(agent: AgentConfig): Promise<HeartbeatResult> {
    return createDefaultHeartbeatResult(agent.id, this.runtime, 60 * 60 * 1000);
  }
}
