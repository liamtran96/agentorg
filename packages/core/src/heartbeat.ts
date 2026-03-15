import { Agent, RuntimeType } from './types';

export interface HeartbeatResult {
  agentId: string;
  runtime: RuntimeType;
  timestamp: Date;
  checked: {
    taskQueue: number;
    inbox: number;
    deadlines: number;
    alerts: number;
  };
  acted: {
    tasksCompleted: number;
    messagesReplied: number;
    escalations: string[];
    delegations: string[];
  };
  tokensUsed: number;
  nextHeartbeat: Date;
}

/**
 * Heartbeat scheduler — wakes agents on schedule or on events.
 * The engine that makes the company alive.
 */
export class HeartbeatScheduler {
  private schedules: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Start scheduled heartbeats for an agent.
   * Uses cron-like scheduling.
   */
  start(agent: Agent, callback: (agent: Agent) => Promise<HeartbeatResult>): void {
    // TODO: Implement cron-based scheduling
    console.log(`[heartbeat] Scheduled ${agent.name} (${agent.heartbeat.schedule})`);
  }

  /**
   * Trigger a reactive heartbeat immediately.
   * Used when events require immediate agent attention.
   */
  async triggerReactive(
    agent: Agent,
    trigger: string,
    callback: (agent: Agent) => Promise<HeartbeatResult>,
  ): Promise<HeartbeatResult> {
    console.log(`[heartbeat] Reactive wake: ${agent.name} <- ${trigger}`);
    return callback(agent);
  }

  stop(agentId: string): void {
    const timer = this.schedules.get(agentId);
    if (timer) {
      clearInterval(timer);
      this.schedules.delete(agentId);
    }
  }

  stopAll(): void {
    for (const [id] of this.schedules) {
      this.stop(id);
    }
  }
}
