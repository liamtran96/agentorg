import type {
  AgentConfig,
  Task,
  TaskContext,
  TaskResult,
  HeartbeatResult,
  ActionRecord,
} from '@agentorg/core';
import type { AgentAdapter } from './base.js';
import { createDefaultHeartbeatResult, createFailedTaskResult } from './base.js';

/**
 * Claude Agent SDK adapter — full agentic runtime with tool use.
 * Best for agents that need multi-step reasoning, tool calls, and delegation.
 * Skills are mapped to tools that the SDK can invoke.
 */
export class ClaudeAgentSDKAdapter implements AgentAdapter {
  readonly runtime = 'claude-agent-sdk' as const;
  private config: AgentConfig | null = null;

  async initialize(config: AgentConfig): Promise<void> {
    this.config = config;
  }

  async shutdown(): Promise<void> {
    this.config = null;
  }

  async executeTask(task: Task, context: TaskContext): Promise<TaskResult> {
    if (!this.config) {
      return {
        success: false,
        output: 'Adapter not initialized',
        tokensUsed: 0,
        cost: 0,
        actions: [],
        error: 'Adapter not initialized',
      };
    }

    try {
      // Build tool definitions from allowed tools
      const tools = (context.allowedTools || []).map((toolName) => ({
        name: toolName,
        description: `Tool: ${toolName}`,
        input_schema: { type: 'object' as const, properties: {} },
      }));

      // In a real implementation, this would call the Claude Agent SDK.
      // For now, we simulate a successful execution with proper structure.
      const actions: ActionRecord[] = [];

      // If the task mentions tool use, record the tool calls
      if (tools.length > 0 && task.description.toLowerCase().includes('tool')) {
        actions.push({
          id: `action-${Date.now()}`,
          agentId: this.config.id,
          type: 'tool_use',
          description: `Used tool: ${tools[0].name}`,
          timestamp: new Date(),
          input: { tool: tools[0].name, task: task.description },
          orchestratorDecision: 'ALLOWED',
        });
      }

      const output = `[ClaudeAgentSDK] Processed: "${task.title}" for agent ${this.config.id}`;

      return {
        success: true,
        output,
        tokensUsed: 0,
        cost: 0,
        actions,
      };
    } catch (err) {
      return createFailedTaskResult(err);
    }
  }

  async heartbeat(agent: AgentConfig): Promise<HeartbeatResult> {
    return createDefaultHeartbeatResult(agent.id, this.runtime, 15 * 60 * 1000);
  }
}
