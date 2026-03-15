import { Task } from './types';

/**
 * Task queue — manages work assignment and status tracking.
 */
export class TaskQueue {
  private tasks: Map<string, Task> = new Map();

  add(task: Task): void {
    this.tasks.set(task.id, task);
  }

  getForAgent(agentId: string): Task[] {
    return Array.from(this.tasks.values())
      .filter((t) => t.agentId === agentId && t.status !== 'completed')
      .sort((a, b) => b.priority - a.priority);
  }

  complete(taskId: string): void {
    const task = this.tasks.get(taskId);
    if (task) task.status = 'completed';
  }

  getPending(): Task[] {
    return Array.from(this.tasks.values()).filter((t) => t.status === 'pending');
  }
}
