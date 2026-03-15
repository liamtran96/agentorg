import { Agent, Task, TaskResult, RuntimeType } from '@agentorg/core';
import { HeartbeatResult } from '@agentorg/core';

/**
 * Base adapter interface — every runtime implements this.
 * The orchestrator doesn't care what's behind the adapter.
 */
export interface AgentAdapter {
  runtime: RuntimeType;

  initialize(config: Record<string, unknown>): Promise<void>;
  shutdown(): Promise<void>;

  executeTask(task: Task, agent: Agent): Promise<TaskResult>;
  heartbeat(agent: Agent): Promise<HeartbeatResult>;

  getAvailableSkills(): string[];
  getLastTokenUsage(): { input: number; output: number; cost: number };
}
