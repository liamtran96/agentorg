import { describe, it, expect, beforeEach } from 'vitest';
import { MetricsCollector } from '@agentorg/core';
import type { PerformanceMetrics, AgentPerformanceReport } from '@agentorg/core';

describe('MetricsCollector', () => {
  let collector: MetricsCollector;
  const periodStart = new Date('2026-03-01T00:00:00Z');
  const periodEnd = new Date('2026-03-31T23:59:59Z');

  beforeEach(() => {
    collector = new MetricsCollector();
  });

  it('should record task completion', () => {
    collector.recordTaskCompletion('writer', 1500, 200, 0.05);

    const metrics = collector.getMetrics('writer', periodStart, periodEnd);
    expect(metrics.tasksCompleted).toBe(1);
  });

  it('should record task failure', () => {
    collector.recordTaskFailure('writer');

    const metrics = collector.getMetrics('writer', periodStart, periodEnd);
    expect(metrics.tasksFailed).toBe(1);
  });

  it('should get metrics for agent in period', () => {
    collector.recordTaskCompletion('writer', 1000, 150, 0.03);

    const metrics = collector.getMetrics('writer', periodStart, periodEnd);

    expect(metrics).toBeDefined();
    expect(metrics.agentId).toBe('writer');
    expect(metrics.period.start).toEqual(periodStart);
    expect(metrics.period.end).toEqual(periodEnd);
  });

  it('should return correct completed and failed counts', () => {
    collector.recordTaskCompletion('writer', 1000, 150, 0.03);
    collector.recordTaskCompletion('writer', 2000, 300, 0.06);
    collector.recordTaskCompletion('writer', 1500, 200, 0.04);
    collector.recordTaskFailure('writer');
    collector.recordTaskFailure('writer');

    const metrics = collector.getMetrics('writer', periodStart, periodEnd);
    expect(metrics.tasksCompleted).toBe(3);
    expect(metrics.tasksFailed).toBe(2);
  });

  it('should calculate average response time', () => {
    collector.recordTaskCompletion('writer', 1000, 100, 0.02);
    collector.recordTaskCompletion('writer', 2000, 100, 0.02);
    collector.recordTaskCompletion('writer', 3000, 100, 0.02);

    const metrics = collector.getMetrics('writer', periodStart, periodEnd);
    expect(metrics.avgResponseTime).toBe(2000); // (1000 + 2000 + 3000) / 3
  });

  it('should sum tokens and cost', () => {
    collector.recordTaskCompletion('writer', 1000, 150, 0.03);
    collector.recordTaskCompletion('writer', 2000, 250, 0.05);
    collector.recordTaskCompletion('writer', 1500, 100, 0.02);

    const metrics = collector.getMetrics('writer', periodStart, periodEnd);
    expect(metrics.tokensUsed).toBe(500); // 150 + 250 + 100
    expect(metrics.totalCost).toBeCloseTo(0.10); // 0.03 + 0.05 + 0.02
  });

  it('should generate report for agent', () => {
    collector.recordTaskCompletion('writer', 1000, 150, 0.03);
    collector.recordTaskCompletion('writer', 2000, 250, 0.05);
    collector.recordTaskFailure('writer');

    const report = collector.generateReport('writer', periodStart, periodEnd);

    expect(report).toBeDefined();
    expect(report.agentId).toBe('writer');
    expect(report.period.start).toEqual(periodStart);
    expect(report.period.end).toEqual(periodEnd);
    expect(report.metrics).toBeDefined();
    expect(report.metrics.tasksCompleted).toBe(2);
    expect(report.metrics.tasksFailed).toBe(1);
  });

  it('should include summary and recommendations in report', () => {
    collector.recordTaskCompletion('writer', 1000, 150, 0.03);
    collector.recordTaskFailure('writer');

    const report = collector.generateReport('writer', periodStart, periodEnd);

    expect(report.summary).toBeDefined();
    expect(typeof report.summary).toBe('string');
    expect(report.summary.length).toBeGreaterThan(0);

    expect(report.recommendations).toBeDefined();
    expect(Array.isArray(report.recommendations)).toBe(true);
  });

  it('should reset metrics', () => {
    collector.recordTaskCompletion('writer', 1000, 150, 0.03);
    collector.recordTaskCompletion('editor', 2000, 250, 0.05);

    collector.reset();

    const writerMetrics = collector.getMetrics('writer', periodStart, periodEnd);
    expect(writerMetrics.tasksCompleted).toBe(0);
    expect(writerMetrics.tasksFailed).toBe(0);
    expect(writerMetrics.tokensUsed).toBe(0);
    expect(writerMetrics.totalCost).toBe(0);

    const editorMetrics = collector.getMetrics('editor', periodStart, periodEnd);
    expect(editorMetrics.tasksCompleted).toBe(0);
  });
});
