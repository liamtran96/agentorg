import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DAGExecutor } from '@agentorg/skill-graph';
import type { WorkflowStep } from '@agentorg/core';

describe('DAGExecutor', () => {
  let executor: DAGExecutor;

  beforeEach(() => {
    executor = new DAGExecutor();
  });

  it('should execute a linear workflow in order', async () => {
    const executionOrder: string[] = [];

    const steps: WorkflowStep[] = [
      { id: 'step1', name: 'Research', type: 'task' },
      { id: 'step2', name: 'Write', type: 'task', dependsOn: ['step1'] },
      { id: 'step3', name: 'Publish', type: 'task', dependsOn: ['step2'] },
    ];

    const mockExecutor = async (step: WorkflowStep) => {
      executionOrder.push(step.id);
      return { success: true, output: `${step.name} done` };
    };

    const result = await executor.execute(steps, mockExecutor);

    expect(result.status).toBe('completed');
    expect(executionOrder).toEqual(['step1', 'step2', 'step3']);
  });

  it('should execute parallel steps concurrently', async () => {
    const startTimes: Record<string, number> = {};

    const steps: WorkflowStep[] = [
      { id: 'step1', name: 'Start', type: 'task' },
      { id: 'step2a', name: 'Branch A', type: 'task', dependsOn: ['step1'] },
      { id: 'step2b', name: 'Branch B', type: 'task', dependsOn: ['step1'] },
      { id: 'step3', name: 'Merge', type: 'task', dependsOn: ['step2a', 'step2b'] },
    ];

    const mockExecutor = async (step: WorkflowStep) => {
      startTimes[step.id] = Date.now();
      await new Promise((resolve) => setTimeout(resolve, 10));
      return { success: true, output: `${step.name} done` };
    };

    const result = await executor.execute(steps, mockExecutor);

    expect(result.status).toBe('completed');
    // step2a and step2b should start at roughly the same time (both after step1)
    const timeDiff = Math.abs(startTimes['step2a'] - startTimes['step2b']);
    expect(timeDiff).toBeLessThan(50); // Should be near-simultaneous
  });

  it('should handle step failure and stop workflow', async () => {
    const executedSteps: string[] = [];

    const steps: WorkflowStep[] = [
      { id: 'step1', name: 'Start', type: 'task' },
      { id: 'step2', name: 'Fail here', type: 'task', dependsOn: ['step1'] },
      { id: 'step3', name: 'Never reached', type: 'task', dependsOn: ['step2'] },
    ];

    const mockExecutor = async (step: WorkflowStep) => {
      executedSteps.push(step.id);
      if (step.id === 'step2') {
        throw new Error('Step 2 failed: API timeout');
      }
      return { success: true, output: `${step.name} done` };
    };

    const result = await executor.execute(steps, mockExecutor);

    expect(result.status).toBe('failed');
    expect(result.error).toContain('Step 2 failed');
    expect(executedSteps).toContain('step1');
    expect(executedSteps).toContain('step2');
    expect(executedSteps).not.toContain('step3');
  });

  it('should pause on approval gates until approved', async () => {
    const steps: WorkflowStep[] = [
      { id: 'step1', name: 'Draft', type: 'task' },
      {
        id: 'step2',
        name: 'Approve draft',
        type: 'gate',
        dependsOn: ['step1'],
        gate: { type: 'approval', approver: 'ceo' },
      },
      { id: 'step3', name: 'Publish', type: 'task', dependsOn: ['step2'] },
    ];

    const mockExecutor = async (step: WorkflowStep) => {
      return { success: true, output: `${step.name} done` };
    };

    // Start execution — it should pause at the gate
    const execution = executor.execute(steps, mockExecutor);

    // Simulate approval after a delay
    setTimeout(() => {
      executor.approve('step2', 'ceo');
    }, 50);

    const result = await execution;

    expect(result.status).toBe('completed');
    expect(result.completedSteps).toContain('step3');
  });

  it('should timeout on stuck steps', async () => {
    const steps: WorkflowStep[] = [
      {
        id: 'step1',
        name: 'Stuck step',
        type: 'task',
        timeout: 100, // 100ms timeout
      },
    ];

    const mockExecutor = async (_step: WorkflowStep) => {
      // Simulate a stuck step that never resolves within timeout
      await new Promise((resolve) => setTimeout(resolve, 5000));
      return { success: true, output: 'done' };
    };

    const result = await executor.execute(steps, mockExecutor);

    expect(result.status).toBe('failed');
    expect(result.error).toMatch(/timeout/i);
  });

  it('should report completed steps in result', async () => {
    const steps: WorkflowStep[] = [
      { id: 'step1', name: 'First', type: 'task' },
      { id: 'step2', name: 'Second', type: 'task', dependsOn: ['step1'] },
    ];

    const mockExecutor = async (step: WorkflowStep) => {
      return { success: true, output: `${step.name} done` };
    };

    const result = await executor.execute(steps, mockExecutor);

    expect(result.completedSteps).toContain('step1');
    expect(result.completedSteps).toContain('step2');
  });
});
