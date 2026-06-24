/**
 * Real-time event bus + optional BullMQ job queue.
 */
'use strict';

const EventEmitter = require('events');
const { isRedisConfigured } = require('../config');

const runEvents = new EventEmitter();
runEvents.setMaxListeners(100);

let queue = null;
let worker = null;

function emitRunEvent(runId, event) {
  const payload = { runId, timestamp: new Date().toISOString(), ...event };
  runEvents.emit(`run:${runId}`, payload);
  runEvents.emit('run:*', payload);
}

async function initQueue(processor) {
  if (!isRedisConfigured()) {
    console.log('⚙️  Engine queue: in-process (set REDIS_URL for BullMQ)');
    return { mode: 'memory' };
  }

  const { Queue, Worker } = require('bullmq');
  const IORedis = require('ioredis');
  const connection = new IORedis(process.env.REDIS_URL, { maxRetriesPerRequest: null });

  queue = new Queue('vitalis-engine', { connection });
  worker = new Worker(
    'vitalis-engine',
    async (job) => processor(job.data),
    { connection, concurrency: 2 }
  );

  worker.on('failed', (job, err) => {
    console.error(`Job ${job?.id} failed:`, err.message);
  });

  console.log('✓ Engine queue: BullMQ connected');
  return { mode: 'bullmq' };
}

async function enqueueJob(name, data) {
  if (queue) {
    const job = await queue.add(name, data, {
      attempts: 2,
      backoff: { type: 'exponential', delay: 1000 },
    });
    return { jobId: job.id, mode: 'bullmq' };
  }

  // In-process async execution
  setImmediate(async () => {
    try {
      const { executeWorkflow } = require('../orchestrator/supervisor');
      await executeWorkflow(data);
    } catch (err) {
      emitRunEvent(data.runId, { type: 'error', message: err.message });
    }
  });
  return { jobId: data.runId, mode: 'memory' };
}

function subscribeRunEvents(runId, callback) {
  const handler = (payload) => callback(payload);
  runEvents.on(`run:${runId}`, handler);
  return () => runEvents.off(`run:${runId}`, handler);
}

async function closeQueue() {
  if (worker) await worker.close();
  if (queue) await queue.close();
}

module.exports = {
  emitRunEvent,
  initQueue,
  enqueueJob,
  subscribeRunEvents,
  closeQueue,
};
