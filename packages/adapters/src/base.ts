import type { AgentConfig, Task, TaskContext, TaskResult, HeartbeatResult, RuntimeType } from '@agentorg/core';

/**
 * Base adapter interface — every runtime implements this.
 * The orchestrator doesn't care what's behind the adapter.
 */
export interface AgentAdapter {
  readonly runtime: RuntimeType;

  /** Initialize the adapter with agent config */
  initialize(config: AgentConfig): Promise<void>;

  /** Shut down gracefully */
  shutdown(): Promise<void>;

  /** Execute a task */
  executeTask(task: Task, context: TaskContext): Promise<TaskResult>;

  /** Heartbeat: agent wakes, checks work, acts, reports */
  heartbeat(agent: AgentConfig): Promise<HeartbeatResult>;
}
