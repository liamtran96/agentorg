import type { Task, TaskStatus } from '../types.js';

/**
 * In-memory task queue. Phase 2 will add SQLite persistence + BullMQ.
 */
export class TaskQueue {
  private tasks: Map<string, Task> = new Map();
  private counter = 0;

  /** Create a new task */
  create(params: {
    title: string;
    description: string;
    assignedTo: string;
    createdBy: string;
    priority?: Task['priority'];
    dueAt?: Date;
  }): Task {
    const id = `task_${++this.counter}`;
    const task: Task = {
      id,
      title: params.title,
      description: params.description,
      assignedTo: params.assignedTo,
      createdBy: params.createdBy,
      status: 'pending',
      priority: params.priority || 'normal',
      createdAt: new Date(),
      updatedAt: new Date(),
      dueAt: params.dueAt,
    };
    this.tasks.set(id, task);
    return task;
  }

  /** Get tasks for an agent */
  getForAgent(agentId: string, status?: TaskStatus): Task[] {
    return [...this.tasks.values()]
      .filter((t) => t.assignedTo === agentId && (!status || t.status === status))
      .sort((a, b) => {
        const pri = { urgent: 0, high: 1, normal: 2, low: 3 };
        return pri[a.priority] - pri[b.priority];
      });
  }

  /** Update task status */
  updateStatus(taskId: string, status: TaskStatus, result?: string): void {
    const task = this.tasks.get(taskId);
    if (!task) return;
    task.status = status;
    task.updatedAt = new Date();
    if (result) task.result = result;
  }

  /** Get a task by ID */
  get(taskId: string): Task | undefined {
    return this.tasks.get(taskId);
  }

  /** Get all tasks */
  getAll(): Task[] {
    return [...this.tasks.values()];
  }

  /** Get count by status */
  countByStatus(): Record<TaskStatus, number> {
    const counts: Record<string, number> = {
      pending: 0, in_progress: 0, completed: 0, failed: 0, blocked: 0, review: 0,
    };
    for (const task of this.tasks.values()) {
      counts[task.status] = (counts[task.status] || 0) + 1;
    }
    return counts as Record<TaskStatus, number>;
  }
}
