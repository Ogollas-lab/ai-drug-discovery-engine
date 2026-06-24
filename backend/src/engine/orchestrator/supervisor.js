/**
 * LangGraph supervisor — DMTA-aligned multi-agent workflow.
 *
 * Flow: Discovery (descriptors) → Analysis (rules) → Safety → Reporting (LLM)
 */
'use strict';

const db = require('../db/client');
const { analyzeMolecule } = require('../analysis/molecule-analyzer');
const { evaluateSafety } = require('../safety/guardrail');
const { emitRunEvent } = require('../queue/job-queue');
const { gateway } = require('../models/gateway');
const { config } = require('../config');
const { runDiffDock } = require('../tools/diffdock-tool');
const { runMolMIM } = require('../tools/molmim-tool');
const { log } = require('../observability/logger');

async function runStep(runId, stepName, agentName, sequenceOrder, fn, traceId) {
  const step = await db.createRunStep({ runId, stepName, agentName, sequenceOrder });
  await db.updateRunStep(step.id, { status: 'running', started_at: new Date().toISOString() });
  emitRunEvent(runId, { type: 'step_start', step: stepName, agent: agentName, traceId });

  try {
    const output = await fn();
    await db.updateRunStep(step.id, {
      status: 'completed',
      output,
      completed_at: new Date().toISOString(),
    });
    emitRunEvent(runId, { type: 'step_complete', step: stepName, agent: agentName, output });
    await db.recordProvenanceActivity({
      runId,
      activityType: stepName,
      agentName,
      attributes: { outputSummary: typeof output === 'object' ? Object.keys(output) : 'text' },
    });
    return output;
  } catch (err) {
    await db.updateRunStep(step.id, {
      status: 'failed',
      output: { error: err.message },
      completed_at: new Date().toISOString(),
    });
    emitRunEvent(runId, { type: 'step_failed', step: stepName, error: err.message });
    throw err;
  }
}

async function generateReport(analysis, safety, targetName) {
  const model = await gateway.getReasoningModel();
  const { HumanMessage, SystemMessage } = require('@langchain/core/messages');

  const system = `You are a medicinal chemistry reporting agent for Pawanax AI.
You receive VALIDATED descriptors, QED/PAINS/Veber assessments, and rule-based outputs only.
NEVER invent Ki, IC50, or experimental binding data.
Label all claims: [EXPERIMENTAL], [PREDICTED], [INFERRED], [UNKNOWN].
If engagement source is heuristic_proxy, state clearly it is NOT a trained model.
Include uncertainty, recommended next experiments, and cite which data sources were used.`;

  const user = `Target: ${targetName || 'unspecified'}
Analysis: ${JSON.stringify(analysis, null, 2)}
Safety: ${JSON.stringify(safety, null, 2)}

Write a concise SAR-style report (3-4 paragraphs) with explicit uncertainty.`;

  const response = await model.invoke([
    new SystemMessage(system),
    new HumanMessage(user),
  ]);

  return {
    narrative: response.content,
    model: config.engine.defaultProvider,
    generatedAt: new Date().toISOString(),
  };
}

async function executeWorkflow({ runId, smiles, targetId, targetName, traceId }) {
  await db.updateRun(runId, { status: 'running' });
  emitRunEvent(runId, { type: 'run_start', smiles, targetName, traceId });
  log('info', 'workflow_start', { runId, traceId, smiles: smiles.slice(0, 40) });

  try {
    const discovery = await runStep(runId, 'discovery', 'discovery-agent', 1, async () => {
      const result = await analyzeMolecule({ smiles, targetId, targetName });
      if (!result.success) throw new Error(result.error);
      return result;
    }, traceId);

    const analysis = discovery.analysis;

    const optimization = await runStep(runId, 'optimization', 'discovery-agent', 2, async () => {
      return runMolMIM({ smiles, numMolecules: 3, propertyName: 'QED', traceId });
    }, traceId);

    const docking = await runStep(runId, 'docking', 'analysis-agent', 3, async () => {
      return runDiffDock({ smiles, targetName, traceId });
    }, traceId);

    await db.savePrediction({
      runId,
      predictionType: 'docking',
      value: docking,
      confidence: docking.confidence ?? 0,
      modelId: docking.modelId,
      modelVersion: config.engine.pipelineVersion,
      provenance: docking.provenance || { traceId },
    });

    const analysisOut = await runStep(runId, 'analysis', 'analysis-agent', 4, async () => ({
      descriptors: analysis.descriptors,
      rules: analysis.rules,
      recommendations: analysis.recommendations,
      engagement: analysis.engagement,
      scaffold: analysis.scaffold,
      scientific: analysis.scientific,
      docking,
      optimization,
    }), traceId);

    const safety = await runStep(runId, 'safety', 'safety-guardrail', 5, async () => {
      return evaluateSafety(analysis);
    }, traceId);

    if (safety.requiresHitl) {
      await db.createHitlApproval({ runId, reason: 'Safety guardrail requires human review' });
      await db.updateRun(runId, { status: 'awaiting_hitl' });
      emitRunEvent(runId, { type: 'hitl_required', safety, traceId });
    }

    const report = await runStep(runId, 'reporting', 'reporting-agent', 6, async () => {
      return generateReport({ ...analysis, docking, optimization }, safety, targetName);
    }, traceId);

    await db.savePrediction({
      runId,
      predictionType: 'engagement_proxy',
      value: analysis.engagement,
      confidence: analysis.engagement.confidence,
      modelId: analysis.engagement.modelId,
      modelVersion: analysis.engagement.modelVersion,
      provenance: discovery.provenance,
    });

    const output = {
      analysis,
      analysisOut,
      docking,
      optimization,
      safety,
      report,
      provenance: discovery.provenance,
      pipelineVersion: config.engine.pipelineVersion,
      traceId,
    };

    const finalStatus = safety.requiresHitl ? 'awaiting_hitl' : 'completed';
    await db.updateRun(runId, {
      status: finalStatus,
      output,
      completed_at: new Date().toISOString(),
    });

    emitRunEvent(runId, { type: 'run_complete', status: finalStatus, output, traceId });
    await db.recordAuditEvent({ runId, eventType: 'run_complete', payload: { status: finalStatus, traceId } });
    log('info', 'workflow_complete', { runId, traceId, status: finalStatus });

    return output;
  } catch (err) {
    await db.updateRun(runId, { status: 'failed', error: err.message });
    emitRunEvent(runId, { type: 'run_failed', error: err.message, traceId });
    log('error', 'workflow_failed', { runId, traceId, error: err.message });
    await db.recordAuditEvent({ runId, eventType: 'run_failed', payload: { error: err.message, traceId } });
    throw err;
  }
}

async function resolveHitl({ runId, decision, decidedBy, rationale }) {
  const run = await db.getRun(runId);
  if (!run) throw new Error('Run not found');
  if (run.status !== 'awaiting_hitl') throw new Error(`Run is not awaiting HITL (status: ${run.status})`);

  await db.decideHitlApproval({ runId, decision, decidedBy, rationale });

  if (decision === 'approved') {
    await db.updateRun(runId, {
      status: 'completed',
      completed_at: new Date().toISOString(),
    });
    emitRunEvent(runId, { type: 'hitl_resolved', decision: 'approved' });
    await db.recordAuditEvent({ runId, eventType: 'hitl_approved', payload: { decidedBy, rationale } });
    return { status: 'completed' };
  }

  await db.updateRun(runId, { status: 'cancelled', error: rationale || 'Rejected by human reviewer' });
  emitRunEvent(runId, { type: 'hitl_resolved', decision: 'rejected' });
  await db.recordAuditEvent({ runId, eventType: 'hitl_rejected', payload: { decidedBy, rationale } });
  return { status: 'cancelled' };
}

/**
 * LangGraph-style agent with tools (for direct agent invocation).
 */
async function createSupervisorAgent() {
  const { createReactAgent } = require('@langchain/langgraph/prebuilt');
  const tools = await require('../tools/engine-tools').createEngineTools();
  const model = await gateway.getChatModel();
  return createReactAgent({ llm: model, tools });
}

module.exports = {
  executeWorkflow,
  createSupervisorAgent,
  generateReport,
  resolveHitl,
};

// LangGraph compiled graph (Phase 4)
module.exports.runDMTAGraph = require('./dmta-graph').runDMTAGraph;
