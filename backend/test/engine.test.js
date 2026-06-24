'use strict';

const { analyzeMolecule, computeHeuristicEngagement } = require('../src/engine/analysis/molecule-analyzer');
const { evaluateSafety } = require('../src/engine/safety/guardrail');
const db = require('../src/engine/db/client');
const { executeWorkflow } = require('../src/engine/orchestrator/supervisor');
const { emitRunEvent } = require('../src/engine/queue/job-queue');

describe('Molecule Analyzer', () => {
  const aspirin = 'CC(=O)Oc1ccccc1C(=O)O';

  test('analyzeMolecule returns PubChem descriptors for aspirin', async () => {
    const result = await analyzeMolecule({ smiles: aspirin, targetName: 'COX-2' });
    expect(result.success).toBe(true);
    expect(result.analysis.descriptors.molecularWeight).toBeGreaterThan(100);
    expect(result.analysis.engagement).toBeDefined();
    expect(result.analysis.engagement.label).toBeTruthy();
    expect(result.analysis.scientific).toBeDefined();
    expect(result.analysis.scientific.qed.value).toBeGreaterThan(0);
  }, 30000);

  test('heuristic engagement is bounded 0.05-0.95', () => {
    const e = computeHeuristicEngagement(aspirin, { molecularWeight: 180, logP: 1.2 }, 'aromatic');
    expect(e.value).toBeGreaterThanOrEqual(0.05);
    expect(e.value).toBeLessThanOrEqual(0.95);
    expect(e.source).toBe('heuristic_proxy');
  });

  test('safety guardrail flags high MW', () => {
    const safety = evaluateSafety({
      smiles: aspirin,
      descriptors: { molecularWeight: 650, logP: 2 },
      engagement: { confidence: 0.3, source: 'heuristic_proxy', value: 0.5 },
      rules: { lipinski: { status: 'non-compliant' } },
    });
    expect(safety.requiresHitl).toBe(true);
    expect(safety.issues.length).toBeGreaterThan(0);
  });
});

describe('Engine DB (memory)', () => {
  beforeEach(() => db.resetMemoryStore());

  test('create and update run', async () => {
    const run = await db.createRun({
      workflowType: 'test',
      input: { smiles: 'C' },
    });
    expect(run.id).toBeDefined();
    expect(run.status).toBe('pending');

    const updated = await db.updateRun(run.id, { status: 'completed' });
    expect(updated.status).toBe('completed');
  });
});

describe('DMTA Workflow', () => {
  beforeEach(() => db.resetMemoryStore());

  test('executeWorkflow completes for aspirin', async () => {
    const run = await db.createRun({
      workflowType: 'molecule_analysis',
      input: { smiles: 'CC(=O)Oc1ccccc1C(=O)O' },
    });

    const output = await executeWorkflow({
      runId: run.id,
      smiles: 'CC(=O)Oc1ccccc1C(=O)O',
      targetName: 'COX-2',
    });

    expect(output.analysis).toBeDefined();
    expect(output.safety).toBeDefined();
    expect(output.report.narrative).toBeTruthy();

    const finalRun = await db.getRun(run.id);
    expect(['completed', 'awaiting_hitl']).toContain(finalRun.status);
  }, 120000);
});

describe('LangGraph DMTA Graph', () => {
  test('runDMTAGraph completes discovery through reporting', async () => {
    const { runDMTAGraph } = require('../src/engine/orchestrator/dmta-graph');
    const result = await runDMTAGraph({
      smiles: 'CC(=O)Oc1ccccc1C(=O)O',
      targetName: 'COX-2',
    });
    expect(result.analysis).toBeDefined();
    expect(result.safety).toBeDefined();
    expect(result.report.narrative).toBeTruthy();
  }, 120000);
});
