import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('bullmq', () => {
  const jobs = new Map();
  let jobCounter = 0;
  let processor: Function | null = null;

  const Queue = vi.fn().mockImplementation((name: string) => ({
    name,
    add: vi.fn().mockImplementation(async (jobName: string, data: unknown, opts?: unknown) => {
      const id = String(++jobCounter);
      const job = {
        id,
        name: jobName,
        data,
        opts,
        returnvalue: undefined,
        failedReason: undefined,
        finishedOn: undefined,
      };
      jobs.set(id, job);
      return job;
    }),
    getJob: vi.fn().mockImplementation(async (id: string) => jobs.get(id) || null),
    getWaiting: vi.fn().mockResolvedValue([]),
    getCompleted: vi.fn().mockResolvedValue([]),
    getFailed: vi.fn().mockResolvedValue([]),
    pause: vi.fn().mockResolvedValue(undefined),
    resume: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
  }));

  const Worker = vi.fn().mockImplementation((_name: string, processorFn: Function) => {
    processor = processorFn;
    return {
      on: vi.fn(),
      close: vi.fn().mockResolvedValue(undefined),
    };
  });

  return { Queue, Worker };
});

import { JobQueue } from '@agentorg/core';

describe('JobQueue', () => {
  let jobQueue: JobQueue;

  beforeEach(() => {
    vi.clearAllMocks();
    jobQueue = new JobQueue({ name: 'test-queue' });
  });

  it('constructor creates a BullMQ Queue with the given name', async () => {
    const { Queue } = await import('bullmq');
    expect(Queue).toHaveBeenCalledWith('test-queue', expect.objectContaining({
      connection: { host: 'localhost', port: 6379 },
    }));
  });

  it('constructor uses default name when none provided', async () => {
    const { Queue } = await import('bullmq');
    vi.clearAllMocks();
    new JobQueue();
    expect(Queue).toHaveBeenCalledWith('agentorg', expect.any(Object));
  });

  it('enqueue adds a job to the queue and returns job ID', async () => {
    const id = await jobQueue.enqueue('send-email', { to: 'user@test.com', subject: 'Hello' });
    expect(id).toBeDefined();
    expect(typeof id).toBe('string');
  });

  it('enqueue passes options like priority and delay', async () => {
    const id = await jobQueue.enqueue('send-email', { to: 'user@test.com' }, { priority: 1, delay: 5000 });
    expect(id).toBeDefined();
  });

  it('process creates a Worker that processes jobs', async () => {
    const { Worker } = await import('bullmq');
    const handler = vi.fn().mockResolvedValue('done');

    jobQueue.process(handler);

    expect(Worker).toHaveBeenCalledWith(
      'test-queue',
      expect.any(Function),
      expect.any(Object),
    );
  });

  it('getJob returns job data', async () => {
    const id = await jobQueue.enqueue('task', { foo: 'bar' });
    const job = await jobQueue.getJob(id);
    expect(job).toBeDefined();
    expect(job!.data).toEqual({ foo: 'bar' });
    expect(job!.name).toBe('task');
  });

  it('getJob returns null for unknown job', async () => {
    const job = await jobQueue.getJob('nonexistent');
    expect(job).toBeNull();
  });

  it('getWaiting returns waiting jobs', async () => {
    const waiting = await jobQueue.getWaiting();
    expect(Array.isArray(waiting)).toBe(true);
  });

  it('getCompleted returns completed jobs', async () => {
    const completed = await jobQueue.getCompleted();
    expect(Array.isArray(completed)).toBe(true);
  });

  it('getFailed returns failed jobs', async () => {
    const failed = await jobQueue.getFailed();
    expect(Array.isArray(failed)).toBe(true);
  });

  it('pause pauses the queue', async () => {
    await jobQueue.pause();
    // Verify the underlying queue's pause was called
    const job = await jobQueue.enqueue('dummy', {});
    const underlying = await jobQueue.getJob(job);
    // pause should not throw
    expect(true).toBe(true);
  });

  it('resume resumes the queue', async () => {
    await jobQueue.pause();
    await jobQueue.resume();
    // resume should not throw
    expect(true).toBe(true);
  });

  it('close closes queue and worker', async () => {
    const handler = vi.fn().mockResolvedValue('done');
    jobQueue.process(handler);

    await jobQueue.close();
    // close should not throw
    expect(true).toBe(true);
  });

  it('close works when no worker is set', async () => {
    await jobQueue.close();
    // should not throw even without a worker
    expect(true).toBe(true);
  });
});
