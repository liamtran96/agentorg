import type { PerformanceMetrics, AgentPerformanceReport } from './types.js';

/** Internal record of a completed task's metrics */
interface TaskMetricRecord {
  agentId: string;
  responseTime: number;
  tokensUsed: number;
  cost: number;
  timestamp: Date;
}

/** Internal record of a failed task */
interface FailureRecord {
  agentId: string;
  timestamp: Date;
}

/**
 * MetricsCollector — Collects performance metrics per agent.
 * Tracks task completions, failures, response times, token usage, and costs.
 * Generates reports with summaries and recommendations.
 */
export class MetricsCollector {
  private completions: TaskMetricRecord[] = [];
  private failures: FailureRecord[] = [];

  /** Record a successful task completion */
  recordTaskCompletion(
    agentId: string,
    responseTime: number,
    tokensUsed: number,
    cost: number,
  ): void {
    this.completions.push({
      agentId,
      responseTime,
      tokensUsed,
      cost,
      timestamp: new Date(),
    });
  }

  /** Record a task failure */
  recordTaskFailure(agentId: string): void {
    this.failures.push({
      agentId,
      timestamp: new Date(),
    });
  }

  /** Get aggregated metrics for an agent within a period */
  getMetrics(agentId: string, start: Date, end: Date): PerformanceMetrics {
    const agentCompletions = this.completions.filter(
      (c) => c.agentId === agentId && c.timestamp >= start && c.timestamp <= end,
    );
    const agentFailures = this.failures.filter(
      (f) => f.agentId === agentId && f.timestamp >= start && f.timestamp <= end,
    );

    const tasksCompleted = agentCompletions.length;
    const tasksFailed = agentFailures.length;
    const tokensUsed = agentCompletions.reduce((sum, c) => sum + c.tokensUsed, 0);
    const totalCost = agentCompletions.reduce((sum, c) => sum + c.cost, 0);
    const avgResponseTime =
      tasksCompleted > 0
        ? agentCompletions.reduce((sum, c) => sum + c.responseTime, 0) / tasksCompleted
        : 0;

    return {
      agentId,
      period: { start, end },
      tasksCompleted,
      tasksFailed,
      avgResponseTime,
      tokensUsed,
      totalCost,
    };
  }

  /** Generate a performance report for an agent */
  generateReport(
    agentId: string,
    start: Date,
    end: Date,
  ): AgentPerformanceReport {
    const metrics = this.getMetrics(agentId, start, end);
    const totalTasks = metrics.tasksCompleted + metrics.tasksFailed;
    const successRate =
      totalTasks > 0 ? (metrics.tasksCompleted / totalTasks) * 100 : 0;

    const summary = `Agent ${agentId} completed ${metrics.tasksCompleted} tasks with ${metrics.tasksFailed} failures (${successRate.toFixed(1)}% success rate). Average response time: ${metrics.avgResponseTime}ms. Total cost: $${metrics.totalCost.toFixed(2)}.`;

    const recommendations: string[] = [];

    if (successRate < 80 && totalTasks > 0) {
      recommendations.push(
        'High failure rate detected. Review error logs and consider additional training data.',
      );
    }

    if (metrics.avgResponseTime > 5000) {
      recommendations.push(
        'Response time is above threshold. Consider model optimization or task simplification.',
      );
    }

    if (metrics.totalCost > 0 && metrics.tasksCompleted > 0) {
      const costPerTask = metrics.totalCost / metrics.tasksCompleted;
      if (costPerTask > 0.10) {
        recommendations.push(
          'Cost per task is elevated. Consider using a smaller model for routine tasks.',
        );
      }
    }

    if (recommendations.length === 0) {
      recommendations.push('Performance is within acceptable parameters.');
    }

    return {
      agentId,
      agentName: agentId,
      period: { start, end },
      metrics,
      summary,
      recommendations,
    };
  }

  /** Reset all collected metrics */
  reset(): void {
    this.completions = [];
    this.failures = [];
  }
}
