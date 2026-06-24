/**
 * Engine bootstrap — initialize DB, queue, mount routes.
 */
'use strict';

const engineRoutes = require('./routes/engine');
const db = require('./db/client');
const { initQueue } = require('./queue/job-queue');
const { executeWorkflow } = require('./orchestrator/supervisor');

async function initEngine(app) {
  await db.initDatabase();

  await initQueue(async (data) => {
    await executeWorkflow(data);
  });

  app.use('/api/engine', engineRoutes);

  console.log('✓ Pawanax AI Engine initialized (LangChain + DMTA + MolMIM)');
}

module.exports = { initEngine };
