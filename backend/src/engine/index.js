/**
 * Engine bootstrap — initialize DB, queue, mount routes.
 */
'use strict';

const engineRoutes = require('./routes/engine');
const chatRoutes = require('./routes/chat');
const db = require('./db/client');
const { initQueue } = require('./queue/job-queue');
const { executeWorkflow } = require('./orchestrator/supervisor');

async function initEngine(app) {
  await db.initDatabase();

  await initQueue(async (data) => {
    await executeWorkflow(data);
  });

  app.use('/api/engine', engineRoutes);
  app.use('/api/engine/chat', chatRoutes);

  console.log('✓ Vitalis Drug Engine + Pawanax Chat initialized');
}

module.exports = { initEngine };
