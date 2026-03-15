import type { WorkflowStep } from '@agentorg/core';

/**
 * Resolves workflow step dependencies using topological sort.
 * Detects circular dependencies and missing dependency references.
 */
export class DependencyResolver {
  /**
   * Resolve workflow steps into execution order via topological sort.
   * @param steps - The workflow steps to resolve
   * @returns Steps ordered so that dependencies come before dependents
   * @throws Error if circular or missing dependencies are detected
   */
  resolve(steps: WorkflowStep[]): WorkflowStep[] {
    const stepMap = new Map<string, WorkflowStep>();
    for (const step of steps) {
      stepMap.set(step.id, step);
    }

    // Check for missing dependencies
    for (const step of steps) {
      if (step.dependsOn) {
        for (const dep of step.dependsOn) {
          if (!stepMap.has(dep)) {
            throw new Error(
              `Missing dependency: step "${step.id}" depends on "${dep}" which does not exist`
            );
          }
        }
      }
    }

    // Kahn's algorithm for topological sort
    const inDegree = new Map<string, number>();
    const adjacency = new Map<string, string[]>();

    for (const step of steps) {
      inDegree.set(step.id, 0);
      adjacency.set(step.id, []);
    }

    for (const step of steps) {
      if (step.dependsOn) {
        inDegree.set(step.id, step.dependsOn.length);
        for (const dep of step.dependsOn) {
          adjacency.get(dep)!.push(step.id);
        }
      }
    }

    const queue: string[] = [];
    for (const [id, degree] of inDegree) {
      if (degree === 0) {
        queue.push(id);
      }
    }

    const result: WorkflowStep[] = [];
    let queueIndex = 0;

    while (queueIndex < queue.length) {
      const current = queue[queueIndex++];
      result.push(stepMap.get(current)!);

      for (const neighbor of adjacency.get(current)!) {
        const newDegree = inDegree.get(neighbor)! - 1;
        inDegree.set(neighbor, newDegree);
        if (newDegree === 0) {
          queue.push(neighbor);
        }
      }
    }

    if (result.length !== steps.length) {
      throw new Error('Circular dependency detected in workflow steps');
    }

    return result;
  }
}
