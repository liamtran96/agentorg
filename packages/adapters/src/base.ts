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

/**
 * Create a default heartbeat result with zeroed counters.
 * @param agentId - The agent's ID
 * @param runtime - The runtime type of the adapter
 * @param intervalMs - Milliseconds until the next heartbeat
 */
export function createDefaultHeartbeatResult(
  agentId: string,
  runtime: RuntimeType,
  intervalMs: number,
): HeartbeatResult {
  const now = new Date();
  return {
    agentId,
    runtime,
    timestamp: now,
    checked: { taskQueue: 0, inbox: 0, deadlines: 0, alerts: 0 },
    acted: { tasksCompleted: 0, messagesReplied: 0, escalations: [], delegations: [] },
    tokensUsed: 0,
    nextHeartbeat: new Date(now.getTime() + intervalMs),
  };
}

/**
 * Create a failed task result from an unknown error.
 * @param err - The caught error value
 */
export function createFailedTaskResult(err: unknown): TaskResult {
  const message = err instanceof Error ? err.message : String(err);
  return {
    success: false,
    output: '',
    tokensUsed: 0,
    cost: 0,
    actions: [],
    error: message,
  };
}
