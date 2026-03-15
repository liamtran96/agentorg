import { Queue, Worker, type Job } from 'bullmq';

export interface JobQueueOptions {
  name?: string;
  connection?: { host: string; port: number };
}

/**
 * BullMQ-based persistent job queue for AgentOrg.
 * Wraps BullMQ to provide persistent task processing backed by Redis.
 * Replaces the in-memory TaskQueue for production use.
 */
export class JobQueue {
  private queue: Queue;
  private worker: Worker | null = null;
  private connection: { host: string; port: number };

  constructor(options: JobQueueOptions = {}) {
    this.connection = options.connection || { host: 'localhost', port: 6379 };
    this.queue = new Queue(options.name || 'agentorg', {
      connection: this.connection,
    });
  }

  /**
   * Enqueue a job for processing.
   * @param jobName - The name/type of the job
   * @param data - The job payload
   * @param opts - Optional BullMQ job options (priority, delay, etc.)
   * @returns The job ID
   */
  async enqueue(
    jobName: string,
    data: Record<string, unknown>,
    opts?: { priority?: number; delay?: number },
  ): Promise<string> {
    const job = await this.queue.add(jobName, data, opts);
    return job.id!;
  }

  /**
   * Register a handler to process jobs from the queue.
   * Creates a BullMQ Worker that invokes the handler for each job.
   * @param handler - Async function that processes a job
   */
  process(
    handler: (job: {
      id: string;
      name: string;
      data: Record<string, unknown>;
    }) => Promise<unknown>,
  ): void {
    this.worker = new Worker(
      this.queue.name,
      async (job: Job) => {
        return handler({ id: job.id!, name: job.name, data: job.data });
      },
      { connection: this.connection },
    );

    this.worker.on('failed', (job, err) => {
      console.error(`[job-queue] Job ${job?.id} failed:`, err.message);
    });
  }

  /**
   * Retrieve a job by its ID.
   * @param jobId - The job ID to look up
   * @returns The job, or null if not found
   */
  async getJob(jobId: string) {
    return this.queue.getJob(jobId);
  }

  /** Get all waiting jobs in the queue. */
  async getWaiting() {
    return this.queue.getWaiting();
  }

  /** Get all completed jobs in the queue. */
  async getCompleted() {
    return this.queue.getCompleted();
  }

  /** Get all failed jobs in the queue. */
  async getFailed() {
    return this.queue.getFailed();
  }

  /** Pause the queue (no new jobs will be processed). */
  async pause() {
    return this.queue.pause();
  }

  /** Resume a paused queue. */
  async resume() {
    return this.queue.resume();
  }

  /** Close the queue and worker, releasing all resources. */
  async close(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
    }
    await this.queue.close();
  }
}
