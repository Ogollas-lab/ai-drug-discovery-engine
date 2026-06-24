/**
 * Database client — Neon Postgres with in-memory fallback for local dev.
 */
'use strict';

const { config, isDatabaseConfigured } = require('../config');

let pool = null;
const memoryStore = {
  campaigns: new Map(),
  runs: new Map(),
  runSteps: new Map(),
  molecules: new Map(),
  predictions: new Map(),
  provenanceEntities: new Map(),
  provenanceActivities: new Map(),
  hitlApprovals: new Map(),
  auditEvents: [],
};

function uuid() {
  const { randomUUID } = require('crypto');
  return randomUUID();
}

async function initDatabase() {
  if (!isDatabaseConfigured()) {
    console.log('⚙️  Engine DB: in-memory fallback (set DATABASE_URL for Neon Postgres)');
    return { mode: 'memory' };
  }

  const { Pool } = require('pg');
  pool = new Pool({
    connectionString: config.databaseUrl,
    ssl: config.databaseUrl.includes('neon') ? { rejectUnauthorized: false } : undefined,
  });

  await pool.query('SELECT 1');
  await migrate();
  console.log('✓ Engine DB: Neon Postgres connected');
  return { mode: 'postgres' };
}

async function migrate() {
  const fs = require('fs');
  const path = require('path');
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(schema);
}

function getPool() {
  return pool;
}

function isPostgres() {
  return pool !== null;
}

// ─── Run repository ─────────────────────────────────────────────────────────

async function createRun({ campaignId, workflowType, input }) {
  const id = uuid();
  const now = new Date().toISOString();
  const row = {
    id,
    campaign_id: campaignId || null,
    status: 'pending',
    workflow_type: workflowType || 'molecule_analysis',
    input: input || {},
    output: null,
    error: null,
    created_at: now,
    updated_at: now,
    completed_at: null,
  };

  if (isPostgres()) {
    const res = await pool.query(
      `INSERT INTO runs (id, campaign_id, status, workflow_type, input)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [id, row.campaign_id, row.status, row.workflow_type, JSON.stringify(row.input)]
    );
    return res.rows[0];
  }

  memoryStore.runs.set(id, row);
  return row;
}

async function updateRun(id, patch) {
  if (isPostgres()) {
    const fields = [];
    const values = [];
    let i = 1;
    for (const [k, v] of Object.entries(patch)) {
      fields.push(`${k} = $${i++}`);
      values.push(typeof v === 'object' && v !== null && !(v instanceof Date) ? JSON.stringify(v) : v);
    }
    fields.push(`updated_at = NOW()`);
    values.push(id);
    const res = await pool.query(
      `UPDATE runs SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
      values
    );
    return res.rows[0];
  }

  const existing = memoryStore.runs.get(id);
  if (!existing) return null;
  const updated = { ...existing, ...patch, updated_at: new Date().toISOString() };
  memoryStore.runs.set(id, updated);
  return updated;
}

async function getRun(id) {
  if (isPostgres()) {
    const res = await pool.query('SELECT * FROM runs WHERE id = $1', [id]);
    return res.rows[0] || null;
  }
  return memoryStore.runs.get(id) || null;
}

async function createRunStep({ runId, stepName, agentName, sequenceOrder, input }) {
  const id = uuid();
  const row = {
    id,
    run_id: runId,
    step_name: stepName,
    agent_name: agentName || null,
    status: 'pending',
    input: input || {},
    output: null,
    uncertainty: null,
    sequence_order: sequenceOrder || 0,
    started_at: null,
    completed_at: null,
  };

  if (isPostgres()) {
    const res = await pool.query(
      `INSERT INTO run_steps (id, run_id, step_name, agent_name, sequence_order, input)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [id, runId, stepName, agentName, sequenceOrder || 0, JSON.stringify(input || {})]
    );
    return res.rows[0];
  }

  memoryStore.runSteps.set(id, row);
  return row;
}

async function updateRunStep(id, patch) {
  if (isPostgres()) {
    const fields = [];
    const values = [];
    let i = 1;
    for (const [k, v] of Object.entries(patch)) {
      fields.push(`${k} = $${i++}`);
      values.push(typeof v === 'object' && v !== null && !(v instanceof Date) ? JSON.stringify(v) : v);
    }
    values.push(id);
    const res = await pool.query(
      `UPDATE run_steps SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
      values
    );
    return res.rows[0];
  }

  const existing = memoryStore.runSteps.get(id);
  if (!existing) return null;
  const updated = { ...existing, ...patch };
  memoryStore.runSteps.set(id, updated);
  return updated;
}

async function getRunSteps(runId) {
  if (isPostgres()) {
    const res = await pool.query(
      'SELECT * FROM run_steps WHERE run_id = $1 ORDER BY sequence_order',
      [runId]
    );
    return res.rows;
  }
  return [...memoryStore.runSteps.values()].filter((s) => s.run_id === runId);
}

async function recordAuditEvent({ runId, eventType, payload }) {
  const id = uuid();
  const row = { id, run_id: runId, event_type: eventType, payload: payload || {}, created_at: new Date().toISOString() };

  if (isPostgres()) {
    await pool.query(
      'INSERT INTO audit_events (id, run_id, event_type, payload) VALUES ($1, $2, $3, $4)',
      [id, runId, eventType, JSON.stringify(payload || {})]
    );
    return row;
  }

  memoryStore.auditEvents.push(row);
  return row;
}

async function recordProvenanceActivity({ runId, activityType, agentName, attributes }) {
  const id = uuid();
  const row = {
    id,
    run_id: runId,
    activity_type: activityType,
    agent_name: agentName,
    attributes: attributes || {},
    started_at: new Date().toISOString(),
    ended_at: new Date().toISOString(),
  };

  if (isPostgres()) {
    await pool.query(
      `INSERT INTO provenance_activities (id, run_id, activity_type, agent_name, attributes, ended_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [id, runId, activityType, agentName, JSON.stringify(attributes || {})]
    );
    return row;
  }

  memoryStore.provenanceActivities.set(id, row);
  return row;
}

async function savePrediction({ runId, moleculeId, predictionType, value, confidence, modelId, modelVersion, provenance }) {
  const id = uuid();
  const row = {
    id,
    run_id: runId,
    molecule_id: moleculeId,
    prediction_type: predictionType,
    value,
    confidence,
    model_id: modelId,
    model_version: modelVersion,
    provenance: provenance || {},
    created_at: new Date().toISOString(),
  };

  if (isPostgres()) {
    const res = await pool.query(
      `INSERT INTO predictions (id, run_id, molecule_id, prediction_type, value, confidence, model_id, model_version, provenance)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [id, runId, moleculeId, predictionType, JSON.stringify(value), confidence, modelId, modelVersion, JSON.stringify(provenance || {})]
    );
    return res.rows[0];
  }

  memoryStore.predictions.set(id, row);
  return row;
}

async function createHitlApproval({ runId, stepId, reason }) {
  const id = uuid();
  const row = {
    id,
    run_id: runId,
    step_id: stepId || null,
    status: 'pending',
    reason: reason || null,
    decided_by: null,
    decided_at: null,
    created_at: new Date().toISOString(),
  };

  if (isPostgres()) {
    const res = await pool.query(
      `INSERT INTO hitl_approvals (id, run_id, step_id, status, reason)
       VALUES ($1, $2, $3, 'pending', $4) RETURNING *`,
      [id, runId, stepId, reason]
    );
    return res.rows[0];
  }

  memoryStore.hitlApprovals.set(id, row);
  return row;
}

async function decideHitlApproval({ runId, decision, decidedBy, rationale }) {
  const pending = isPostgres()
    ? (await pool.query(
        `SELECT * FROM hitl_approvals WHERE run_id = $1 AND status = 'pending' ORDER BY created_at DESC LIMIT 1`,
        [runId]
      )).rows[0]
    : [...memoryStore.hitlApprovals.values()].find((h) => h.run_id === runId && h.status === 'pending');

  if (!pending) return null;

  const patch = {
    status: decision,
    decided_by: decidedBy || 'user',
    decided_at: new Date().toISOString(),
    reason: rationale || pending.reason,
  };

  if (isPostgres()) {
    const res = await pool.query(
      `UPDATE hitl_approvals SET status = $1, decided_by = $2, decided_at = NOW(), reason = $3
       WHERE id = $4 RETURNING *`,
      [patch.status, patch.decided_by, patch.reason, pending.id]
    );
    return res.rows[0];
  }

  const updated = { ...pending, ...patch };
  memoryStore.hitlApprovals.set(pending.id, updated);
  return updated;
}

function resetMemoryStore() {
  for (const key of Object.keys(memoryStore)) {
    if (Array.isArray(memoryStore[key])) memoryStore[key].length = 0;
    else memoryStore[key].clear();
  }
}

module.exports = {
  initDatabase,
  getPool,
  isPostgres,
  createRun,
  updateRun,
  getRun,
  createRunStep,
  updateRunStep,
  getRunSteps,
  recordAuditEvent,
  recordProvenanceActivity,
  savePrediction,
  createHitlApproval,
  decideHitlApproval,
  resetMemoryStore,
};
