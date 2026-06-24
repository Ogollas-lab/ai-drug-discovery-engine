/**
 * Engine API routes — runs, analysis, SSE events, health, HITL.
 */
'use strict';

const express = require('express');
const db = require('../db/client');
const { analyzeMolecule } = require('../analysis/molecule-analyzer');
const { enqueueJob, subscribeRunEvents } = require('../queue/job-queue');
const { gateway } = require('../models/gateway');
const { config } = require('../config');
const { traceMiddleware, createTraceId } = require('../observability/logger');
const { resolveHitl } = require('../orchestrator/supervisor');

const router = express.Router();
router.use(traceMiddleware);

router.get('/health', async (req, res) => {
  const modelHealth = await gateway.health();
  res.json({
    success: true,
    engine: config.engine.pipelineVersion,
    database: db.isPostgres() ? 'neon_postgres' : 'memory',
    queue: process.env.REDIS_URL ? 'bullmq' : 'in-process',
    models: modelHealth,
    traceId: req.traceId,
  });
});

router.post('/analyze', async (req, res) => {
  try {
    const { smiles, targetId, targetName } = req.body;
    if (!smiles) {
      return res.status(400).json({ success: false, message: 'smiles is required' });
    }

    const result = await analyzeMolecule({ smiles, targetId, targetName });
    if (!result.success) {
      return res.status(422).json({ success: false, message: result.error });
    }

    res.json({ success: true, traceId: req.traceId, ...result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/runs', async (req, res) => {
  try {
    const { smiles, targetId, targetName, campaignId } = req.body;
    if (!smiles) {
      return res.status(400).json({ success: false, message: 'smiles is required' });
    }

    const traceId = req.traceId || createTraceId();

    const run = await db.createRun({
      campaignId,
      workflowType: 'molecule_analysis',
      input: { smiles, targetId, targetName, traceId },
    });

    await db.recordAuditEvent({
      runId: run.id,
      eventType: 'run_created',
      payload: { smiles, targetId, targetName, traceId },
    });

    const job = await enqueueJob('molecule_analysis', {
      runId: run.id,
      smiles,
      targetId,
      targetName,
      traceId,
    });

    res.status(202).json({
      success: true,
      runId: run.id,
      status: 'pending',
      traceId,
      job,
      eventsUrl: `/api/engine/runs/${run.id}/events`,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/runs/:id', async (req, res) => {
  const run = await db.getRun(req.params.id);
  if (!run) {
    return res.status(404).json({ success: false, message: 'Run not found' });
  }
  const steps = await db.getRunSteps(run.id);
  res.json({ success: true, run, steps, traceId: req.traceId });
});

router.post('/runs/:id/approve', async (req, res) => {
  try {
    const { rationale, decidedBy } = req.body;
    const result = await resolveHitl({
      runId: req.params.id,
      decision: 'approved',
      decidedBy: decidedBy || 'reviewer',
      rationale,
    });
    res.json({ success: true, ...result, traceId: req.traceId });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.post('/runs/:id/reject', async (req, res) => {
  try {
    const { rationale, decidedBy } = req.body;
    const result = await resolveHitl({
      runId: req.params.id,
      decision: 'rejected',
      decidedBy: decidedBy || 'reviewer',
      rationale,
    });
    res.json({ success: true, ...result, traceId: req.traceId });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.get('/runs/:id/events', (req, res) => {
  const runId = req.params.id;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Trace-Id', req.traceId);
  res.flushHeaders();

  const send = (payload) => {
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  };

  send({ type: 'connected', runId, traceId: req.traceId });

  const unsubscribe = subscribeRunEvents(runId, send);

  req.on('close', () => {
    unsubscribe();
  });
});

module.exports = router;
