import type { ThreadIsolationConfig } from '@agentorg/core';

export interface ThreadContext {
  agentId: string;
  threadId: string;
  createdAt: Date;
}

/**
 * ThreadIsolator manages isolated execution contexts for agent threads.
 * Enforces concurrency limits per agent and prevents cross-thread leakage.
 */
export class ThreadIsolator {
  private config: ThreadIsolationConfig;
  private contexts: Map<string, ThreadContext> = new Map();
  /** Maps agentId to a set of threadIds */
  private agentThreads: Map<string, Set<string>> = new Map();

  constructor(config: ThreadIsolationConfig) {
    this.config = config;
  }

  /**
   * Create an isolated context for a thread.
   * Throws if the agent has reached its max concurrent thread limit.
   */
  createContext(agentId: string, threadId: string): ThreadContext {
    // Enforce concurrency limit
    const agentSet = this.agentThreads.get(agentId);
    const currentCount = agentSet ? agentSet.size : 0;

    if (currentCount >= this.config.maxConcurrentPerAgent) {
      throw new Error(
        `Agent "${agentId}" has reached the maximum concurrent thread limit of ${this.config.maxConcurrentPerAgent}`,
      );
    }

    const ctx: ThreadContext = {
      agentId,
      threadId,
      createdAt: new Date(),
    };

    this.contexts.set(threadId, ctx);

    if (!this.agentThreads.has(agentId)) {
      this.agentThreads.set(agentId, new Set());
    }
    this.agentThreads.get(agentId)!.add(threadId);

    return ctx;
  }

  /**
   * Retrieve the context for a given thread ID, or undefined if not found.
   */
  getContext(threadId: string): ThreadContext | undefined {
    return this.contexts.get(threadId);
  }

  /**
   * Release a thread context, freeing up a concurrency slot for the agent.
   * Does nothing if the thread ID is not found.
   */
  releaseContext(threadId: string): void {
    const ctx = this.contexts.get(threadId);
    if (!ctx) return;

    this.contexts.delete(threadId);
    const agentSet = this.agentThreads.get(ctx.agentId);
    if (agentSet) {
      agentSet.delete(threadId);
    }
  }

  /**
   * Get the number of active threads for a given agent.
   */
  getActiveThreadCount(agentId: string): number {
    const agentSet = this.agentThreads.get(agentId);
    return agentSet ? agentSet.size : 0;
  }
}
