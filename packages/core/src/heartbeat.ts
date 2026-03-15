import type { AgentConfig, HeartbeatResult } from './types.js';

/**
 * Heartbeat scheduler — wakes agents on schedule or on events.
 * The engine that makes the company alive.
 */
export class HeartbeatScheduler {
  private schedules: Map<string, { stop: () => void }> = new Map();
  private cronModule: typeof import('node-cron') | null = null;

  /**
   * Start scheduled heartbeats for an agent.
   * Uses cron-like scheduling via node-cron.
   */
  async start(
    agent: AgentConfig,
    callback: (agent: AgentConfig) => Promise<HeartbeatResult>,
  ): Promise<void> {
    if (!agent.heartbeat) {
      throw new Error(`Agent "${agent.name}" has no heartbeat config`);
    }

    // Lazy-load node-cron
    if (!this.cronModule) {
      this.cronModule = await import('node-cron');
    }

    const task = this.cronModule.schedule(agent.heartbeat.schedule, async () => {
      try {
        await callback(agent);
      } catch (err) {
        console.error(`[heartbeat] Error in ${agent.name} heartbeat:`, err);
      }
    });

    this.schedules.set(agent.id, { stop: () => task.stop() });
    console.log(`[heartbeat] Scheduled ${agent.name} (${agent.heartbeat.schedule})`);
  }

  /**
   * Trigger a reactive heartbeat immediately.
   * Used when events require immediate agent attention.
   */
  async triggerReactive(
    agent: AgentConfig,
    trigger: string,
    callback: (agent: AgentConfig) => Promise<HeartbeatResult>,
  ): Promise<HeartbeatResult> {
    console.log(`[heartbeat] Reactive wake: ${agent.name} <- ${trigger}`);
    return callback(agent);
  }

  /** Stop heartbeat for a single agent */
  stop(agentId: string): void {
    const scheduled = this.schedules.get(agentId);
    if (scheduled) {
      scheduled.stop();
      this.schedules.delete(agentId);
    }
  }

  /** Stop all heartbeats */
  stopAll(): void {
    for (const [id] of this.schedules) {
      this.stop(id);
    }
  }

  /** Check if an agent has an active heartbeat */
  isRunning(agentId: string): boolean {
    return this.schedules.has(agentId);
  }
}
