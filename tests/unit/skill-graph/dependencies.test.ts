import { describe, it, expect, beforeEach } from 'vitest';
import { DependencyResolver } from '@agentorg/skill-graph';
import type { WorkflowStep } from '@agentorg/core';

describe('DependencyResolver', () => {
  let resolver: DependencyResolver;

  beforeEach(() => {
    resolver = new DependencyResolver();
  });

  it('should resolve steps with no dependencies', () => {
    const steps: WorkflowStep[] = [
      { id: 'step1', name: 'Write draft', type: 'task', skill: 'writing' },
      { id: 'step2', name: 'Design image', type: 'task', skill: 'design' },
    ];

    const ordered = resolver.resolve(steps);

    expect(ordered).toHaveLength(2);
  });

  it('should order steps by dependency chain', () => {
    const steps: WorkflowStep[] = [
      { id: 'step3', name: 'Publish', type: 'task', skill: 'publishing', dependsOn: ['step2'] },
      { id: 'step1', name: 'Research', type: 'task', skill: 'research' },
      { id: 'step2', name: 'Write', type: 'task', skill: 'writing', dependsOn: ['step1'] },
    ];

    const ordered = resolver.resolve(steps);

    const ids = ordered.map((s) => s.id);
    expect(ids.indexOf('step1')).toBeLessThan(ids.indexOf('step2'));
    expect(ids.indexOf('step2')).toBeLessThan(ids.indexOf('step3'));
  });

  it('should detect circular dependencies and throw', () => {
    const steps: WorkflowStep[] = [
      { id: 'a', name: 'Step A', type: 'task', dependsOn: ['c'] },
      { id: 'b', name: 'Step B', type: 'task', dependsOn: ['a'] },
      { id: 'c', name: 'Step C', type: 'task', dependsOn: ['b'] },
    ];

    expect(() => resolver.resolve(steps)).toThrow(/circular/i);
  });

  it('should handle missing dependencies with helpful error', () => {
    const steps: WorkflowStep[] = [
      { id: 'step1', name: 'Write', type: 'task', dependsOn: ['nonexistent'] },
    ];

    expect(() => resolver.resolve(steps)).toThrow(/nonexistent/i);
  });

  it('should handle complex diamond dependencies', () => {
    //       step1
    //      /     \
    //   step2   step3
    //      \     /
    //       step4
    const steps: WorkflowStep[] = [
      { id: 'step1', name: 'Start', type: 'task' },
      { id: 'step2', name: 'Branch A', type: 'task', dependsOn: ['step1'] },
      { id: 'step3', name: 'Branch B', type: 'task', dependsOn: ['step1'] },
      { id: 'step4', name: 'Merge', type: 'task', dependsOn: ['step2', 'step3'] },
    ];

    const ordered = resolver.resolve(steps);
    const ids = ordered.map((s) => s.id);

    expect(ids.indexOf('step1')).toBeLessThan(ids.indexOf('step2'));
    expect(ids.indexOf('step1')).toBeLessThan(ids.indexOf('step3'));
    expect(ids.indexOf('step2')).toBeLessThan(ids.indexOf('step4'));
    expect(ids.indexOf('step3')).toBeLessThan(ids.indexOf('step4'));
  });

  it('should return single step when no dependencies exist', () => {
    const steps: WorkflowStep[] = [
      { id: 'only', name: 'Solo step', type: 'task' },
    ];

    const ordered = resolver.resolve(steps);
    expect(ordered).toHaveLength(1);
    expect(ordered[0].id).toBe('only');
  });
});
