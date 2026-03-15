import type { Task, AgentConfig, TaskResult, HeartbeatResult, RuntimeType } from '@agentorg/core';

/**
 * Options for creating a custom adapter via the SDK.
 */
export interface CreateAdapterOptions {
  runtime: RuntimeType | string;
  initialize?: (config: Record<string, unknown>) => Promise<void>;
  executeTask: (task: Task, context: AgentConfig) => Promise<TaskResult>;
  heartbeat: (agent: AgentConfig) => Promise<HeartbeatResult>;
}

/**
 * An adapter instance returned by createAdapter.
 */
export interface Adapter {
  runtime: string;
  initialize: (config: Record<string, unknown>) => Promise<void>;
  executeTask: (task: Task, context: AgentConfig) => Promise<TaskResult>;
  heartbeat: (agent: AgentConfig) => Promise<HeartbeatResult>;
}

/**
 * Creates a new adapter from the provided options.
 * Validates required fields and returns an Adapter object.
 */
export function createAdapter(options: CreateAdapterOptions): Adapter {
  if (!options.executeTask) {
    throw new Error('Adapter executeTask handler is required');
  }
  if (!options.heartbeat) {
    throw new Error('Adapter heartbeat handler is required');
  }

  const initialize = options.initialize ?? (async () => {});

  return {
    runtime: options.runtime,
    initialize,
    executeTask: options.executeTask,
    heartbeat: options.heartbeat,
  };
}
