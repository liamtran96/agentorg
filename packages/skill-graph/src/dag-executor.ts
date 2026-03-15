import type { WorkflowStep } from '@agentorg/core';
import { DependencyResolver } from './dependencies.js';

export interface StepExecutionResult {
  success: boolean;
  output: string;
}

export interface WorkflowResult {
  status: 'completed' | 'failed' | 'paused';
  completedSteps: string[];
  error?: string;
}

type StepExecutorFn = (step: WorkflowStep) => Promise<StepExecutionResult>;

/**
 * Executes a DAG of workflow steps, handling parallelism, gates, and timeouts.
 */
export class DAGExecutor {
  private pendingApprovals = new Map<string, () => void>();

  /**
   * Execute a workflow defined by a list of steps.
   * Steps with satisfied dependencies run in parallel.
   * @param steps - The workflow steps
   * @param executorFn - Function that executes a single step
   * @returns The workflow execution result
   */
  async execute(steps: WorkflowStep[], executorFn: StepExecutorFn): Promise<WorkflowResult> {
    const resolver = new DependencyResolver();
    // Validate the DAG and get topologically sorted steps (will throw on circular/missing deps)
    const sortedSteps = resolver.resolve(steps);

    const stepMap = new Map<string, WorkflowStep>();
    for (const step of sortedSteps) {
      stepMap.set(step.id, step);
    }

    const completed = new Set<string>();
    const completedSteps: string[] = [];
    const remaining = new Set(steps.map((s) => s.id));

    try {
      while (remaining.size > 0) {
        // Find all steps whose dependencies are satisfied
        const ready: WorkflowStep[] = [];
        for (const id of remaining) {
          const step = stepMap.get(id)!;
          const deps = step.dependsOn || [];
          if (deps.every((d) => completed.has(d))) {
            ready.push(step);
          }
        }

        if (ready.length === 0) {
          // No steps can proceed — shouldn't happen after validation
          throw new Error('Deadlock: no steps can proceed');
        }

        // Execute all ready steps in parallel
        const results = await Promise.all(
          ready.map(async (step) => {
            remaining.delete(step.id);

            if (step.type === 'gate' && step.gate?.type === 'approval') {
              // Wait for approval
              await this.waitForApproval(step.id);
              completedSteps.push(step.id);
              completed.add(step.id);
              return;
            }

            // Execute with optional timeout
            let result: StepExecutionResult;
            if (step.timeout != null && step.timeout > 0) {
              result = await this.executeWithTimeout(step, executorFn, step.timeout);
            } else {
              result = await executorFn(step);
            }

            if (!result.success) {
              throw new Error(`Step "${step.id}" failed: ${result.output}`);
            }

            completedSteps.push(step.id);
            completed.add(step.id);
          })
        );
      }

      return { status: 'completed', completedSteps };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { status: 'failed', completedSteps, error: message };
    }
  }

  /**
   * Approve a gate step, allowing the workflow to proceed.
   * @param stepId - The gate step ID
   * @param approver - The approver identity
   */
  approve(stepId: string, _approver: string): void {
    const resolver = this.pendingApprovals.get(stepId);
    if (resolver) {
      resolver();
      this.pendingApprovals.delete(stepId);
    }
  }

  private waitForApproval(stepId: string): Promise<void> {
    return new Promise<void>((resolve) => {
      this.pendingApprovals.set(stepId, resolve);
    });
  }

  private async executeWithTimeout(
    step: WorkflowStep,
    executorFn: StepExecutorFn,
    timeoutMs: number
  ): Promise<StepExecutionResult> {
    return new Promise<StepExecutionResult>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Timeout: step "${step.id}" exceeded ${timeoutMs}ms`));
      }, timeoutMs);

      executorFn(step)
        .then((result) => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch((err) => {
          clearTimeout(timer);
          reject(err);
        });
    });
  }
}
