import { describe, it, expect, beforeEach } from 'vitest';
import { TaskQueue } from '@agentorg/core';
import type { Task } from '@agentorg/core';

describe('TaskQueue', () => {
  let queue: TaskQueue;

  beforeEach(() => {
    queue = new TaskQueue();
  });

  it('should create a task with auto-generated ID', () => {
    const task = queue.create({
      title: 'Write blog post',
      description: 'Write a 1000-word blog post about AI agents',
      assignedTo: 'writer',
      createdBy: 'ceo',
      priority: 'normal',
    });

    expect(task.id).toMatch(/^task_\d+$/);
    expect(task.title).toBe('Write blog post');
    expect(task.status).toBe('pending');
    expect(task.assignedTo).toBe('writer');
    expect(task.createdAt).toBeInstanceOf(Date);
    expect(task.updatedAt).toBeInstanceOf(Date);
  });

  it('should generate unique sequential IDs', () => {
    const t1 = queue.create({
      title: 'Task 1',
      description: 'First task',
      assignedTo: 'writer',
      createdBy: 'ceo',
      priority: 'normal',
    });
    const t2 = queue.create({
      title: 'Task 2',
      description: 'Second task',
      assignedTo: 'writer',
      createdBy: 'ceo',
      priority: 'normal',
    });

    expect(t1.id).not.toBe(t2.id);
  });

  it('should get tasks for agent sorted by priority (urgent first)', () => {
    queue.create({
      title: 'Low priority task',
      description: 'Not urgent',
      assignedTo: 'writer',
      createdBy: 'ceo',
      priority: 'low',
    });
    queue.create({
      title: 'Urgent task',
      description: 'Do this now',
      assignedTo: 'writer',
      createdBy: 'ceo',
      priority: 'urgent',
    });
    queue.create({
      title: 'Normal task',
      description: 'Regular work',
      assignedTo: 'writer',
      createdBy: 'ceo',
      priority: 'normal',
    });

    const tasks = queue.getForAgent('writer');
    expect(tasks).toHaveLength(3);
    expect(tasks[0].priority).toBe('urgent');
    expect(tasks[tasks.length - 1].priority).toBe('low');
  });

  it('should filter tasks by agent (not return other agents tasks)', () => {
    queue.create({
      title: 'Writer task',
      description: 'For writer',
      assignedTo: 'writer',
      createdBy: 'ceo',
      priority: 'normal',
    });
    queue.create({
      title: 'Editor task',
      description: 'For editor',
      assignedTo: 'editor',
      createdBy: 'ceo',
      priority: 'normal',
    });

    const writerTasks = queue.getForAgent('writer');
    expect(writerTasks).toHaveLength(1);
    expect(writerTasks[0].assignedTo).toBe('writer');
  });

  it('should filter tasks by status', () => {
    const task = queue.create({
      title: 'Task to complete',
      description: 'Will be completed',
      assignedTo: 'writer',
      createdBy: 'ceo',
      priority: 'normal',
    });
    queue.updateStatus(task.id, 'completed', 'Done');

    queue.create({
      title: 'Pending task',
      description: 'Still pending',
      assignedTo: 'writer',
      createdBy: 'ceo',
      priority: 'normal',
    });

    const pending = queue.getForAgent('writer', 'pending');
    expect(pending).toHaveLength(1);
    expect(pending[0].title).toBe('Pending task');
  });

  it('should update task status', () => {
    const task = queue.create({
      title: 'Task',
      description: 'A task',
      assignedTo: 'writer',
      createdBy: 'ceo',
      priority: 'normal',
    });

    queue.updateStatus(task.id, 'in_progress');
    const updated = queue.get(task.id);
    expect(updated).toBeDefined();
    expect(updated!.status).toBe('in_progress');
  });

  it('should store result when updating status', () => {
    const task = queue.create({
      title: 'Task',
      description: 'A task',
      assignedTo: 'writer',
      createdBy: 'ceo',
      priority: 'normal',
    });

    queue.updateStatus(task.id, 'completed', 'Blog post written successfully');
    const updated = queue.get(task.id);
    expect(updated!.result).toBe('Blog post written successfully');
  });

  it('should get a task by ID', () => {
    const task = queue.create({
      title: 'Findable task',
      description: 'Can be found',
      assignedTo: 'writer',
      createdBy: 'ceo',
      priority: 'high',
    });

    const found = queue.get(task.id);
    expect(found).toBeDefined();
    expect(found!.title).toBe('Findable task');
  });

  it('should return undefined for unknown task ID', () => {
    expect(queue.get('task_999')).toBeUndefined();
  });

  it('should return all tasks', () => {
    queue.create({ title: 'T1', description: 'd', assignedTo: 'a', createdBy: 'b', priority: 'low' });
    queue.create({ title: 'T2', description: 'd', assignedTo: 'a', createdBy: 'b', priority: 'low' });
    queue.create({ title: 'T3', description: 'd', assignedTo: 'c', createdBy: 'b', priority: 'low' });

    expect(queue.getAll()).toHaveLength(3);
  });

  it('should count tasks by status', () => {
    queue.create({ title: 'T1', description: 'd', assignedTo: 'a', createdBy: 'b', priority: 'low' });
    const t2 = queue.create({ title: 'T2', description: 'd', assignedTo: 'a', createdBy: 'b', priority: 'low' });
    const t3 = queue.create({ title: 'T3', description: 'd', assignedTo: 'a', createdBy: 'b', priority: 'low' });

    queue.updateStatus(t2.id, 'in_progress');
    queue.updateStatus(t3.id, 'completed', 'done');

    const counts = queue.countByStatus();
    expect(counts.pending).toBe(1);
    expect(counts.in_progress).toBe(1);
    expect(counts.completed).toBe(1);
    expect(counts.failed).toBe(0);
    expect(counts.blocked).toBe(0);
    expect(counts.review).toBe(0);
  });
});
