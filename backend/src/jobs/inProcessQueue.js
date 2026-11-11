const EventEmitter = require('events');
const cron = require('node-cron');
const logger = require('../utils/logger');

const sleep = (ms) => new Promise((resolve) => {
  const timer = setTimeout(resolve, ms);
  if (typeof timer.unref === 'function') {
    timer.unref();
  }
});

/**
 * Lightweight in-process job queue backed by async promises and node-cron (no Redis).
 */
class InProcessQueue extends EventEmitter {
  constructor(name) {
    super();
    this.name = name;
    this.handler = null;
    this.counter = 0;
    this.schedules = new Map();
    this.pending = new Set();
  }

  /**
   * Register the processor function for queued jobs.
   */
  process(handler) {
    if (typeof handler !== 'function') {
      throw new TypeError('Queue processor must be a function');
    }
    this.handler = handler;
  }

  /**
   * Execute a job with configured retry and backoff settings.
   */
  async _executeWithRetry(job, options = {}) {
    const maxAttempts = Math.max(1, Number(options.attempts) || 1);
    const backoffDelay = Number(options.backoff?.delay) || 0;
    const isExponential = options.backoff?.type === 'exponential';

    let lastError;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const result = await this.handler(job);
        this.emit('completed', job, result);
        return result;
      } catch (error) {
        lastError = error;
        if (attempt < maxAttempts && backoffDelay > 0) {
          const waitMs = isExponential
            ? backoffDelay * Math.pow(2, attempt - 1)
            : backoffDelay;
          await sleep(waitMs);
        }
      }
    }

    this.emit('failed', job, lastError);
    throw lastError;
  }

  /**
   * Queue a job for asynchronous in-process execution.
   */
  async add(data, options = {}) {
    if (!this.handler) {
      throw new Error(`No processor registered for queue "${this.name}"`);
    }

    const id = options.jobId || `${this.name}-${++this.counter}`;
    const job = { id, data, options };

    const finished = Promise.resolve().then(() => this._executeWithRetry(job, options));
    // Prevent unhandled rejection crashes when callers fire-and-forget queue.add()
    finished.catch(() => {});

    this.pending.add(finished);
    finished.finally(() => this.pending.delete(finished)).catch(() => {});

    job.finished = () => finished;
    return job;
  }

  /**
   * Schedule a recurring job using node-cron.
   */
  schedule(scheduleId, cronExpression, dataOrFactory, options = {}) {
    if (this.schedules.has(scheduleId)) {
      this.schedules.get(scheduleId).stop();
      this.schedules.delete(scheduleId);
    }

    const task = cron.schedule(
      cronExpression,
      () => {
        const payload = typeof dataOrFactory === 'function' ? dataOrFactory() : dataOrFactory;
        this.add(payload, { jobId: scheduleId, ...options.jobOptions }).catch((err) => {
          logger.error(`Scheduled job "${scheduleId}" dispatch error:`, { error: err.message });
        });
      },
      {
        timezone: options.timezone || 'Africa/Addis_Ababa',
        scheduled: options.scheduled !== false
      }
    );

    this.schedules.set(scheduleId, task);
    return task;
  }

  /**
   * Stop all recurring cron schedules registered on this queue.
   */
  stopSchedules() {
    for (const task of this.schedules.values()) {
      task.stop();
    }
    this.schedules.clear();
  }

  /**
   * Wait for in-flight jobs to settle and stop scheduled tasks.
   */
  async close() {
    this.stopSchedules();
    await Promise.allSettled(Array.from(this.pending));
  }
}

module.exports = InProcessQueue;
