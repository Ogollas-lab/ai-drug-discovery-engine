'use strict';

const { resolveHitl } = require('../src/engine/orchestrator/supervisor');
const { runDiffDock } = require('../src/engine/tools/diffdock-tool');
const db = require('../src/engine/db/client');

describe('DiffDock tool', () => {
  test('returns unavailable when NVIDIA not configured', async () => {
    const result = await runDiffDock({ smiles: 'CC(=O)Oc1ccccc1C(=O)O', targetName: 'COX-2' });
    expect(result.status).toBe('unavailable');
    expect(result.disclaimer).toMatch(/DiffDock|NIM/i);
  });
});

describe('HITL resolution', () => {
  beforeEach(() => db.resetMemoryStore());

  test('approve transitions awaiting_hitl to completed', async () => {
    const run = await db.createRun({ workflowType: 'test', input: {} });
    await db.updateRun(run.id, { status: 'awaiting_hitl' });
    await db.createHitlApproval({ runId: run.id, reason: 'test' });

    const result = await resolveHitl({
      runId: run.id,
      decision: 'approved',
      decidedBy: 'tester',
      rationale: 'ok',
    });

    expect(result.status).toBe('completed');
    const updated = await db.getRun(run.id);
    expect(updated.status).toBe('completed');
  });

  test('reject transitions to cancelled', async () => {
    const run = await db.createRun({ workflowType: 'test', input: {} });
    await db.updateRun(run.id, { status: 'awaiting_hitl' });
    await db.createHitlApproval({ runId: run.id, reason: 'test' });

    const result = await resolveHitl({
      runId: run.id,
      decision: 'rejected',
      decidedBy: 'tester',
      rationale: 'unsafe',
    });

    expect(result.status).toBe('cancelled');
  });
});
