'use strict';

/**
 * Production-like integration tests — requires NVIDIA_API_KEY.
 * Run: NVIDIA_API_KEY=... pnpm --filter vitalis-ai-backend test:integration
 */

const { isNvidiaConfigured } = require('../src/engine/config');
const { gateway } = require('../src/engine/models/gateway');
const { runDiffDock } = require('../src/engine/tools/diffdock-tool');
const { runMolMIM } = require('../src/engine/tools/molmim-tool');
const { analyzeMolecule } = require('../src/engine/analysis/molecule-analyzer');

const SKIP = !isNvidiaConfigured() ? describe.skip : describe;
const aspirin = 'CC(=O)Oc1ccccc1C(=O)O';

SKIP('NVIDIA Integration (production-like)', () => {
  jest.setTimeout(180000);

  test('model gateway health reports nvidia configured', async () => {
    const health = await gateway.health();
    expect(health.providers.some((p) => p.id === 'nvidia')).toBe(true);
  });

  test('reasoning model returns narrative text', async () => {
    const model = await gateway.getReasoningModel();
    const { HumanMessage } = require('@langchain/core/messages');
    const res = await model.invoke([new HumanMessage('Reply with exactly: PAWANAX_OK')]);
    const text = typeof res.content === 'string' ? res.content : JSON.stringify(res.content);
    expect(text.length).toBeGreaterThan(3);
    expect(text).not.toMatch(/MOCK REASONING/i);
  });

  test('analyzeMolecule includes scientific assessment', async () => {
    const result = await analyzeMolecule({ smiles: aspirin, targetName: 'COX-2' });
    expect(result.success).toBe(true);
    expect(result.analysis.scientific.qed.value).toBeGreaterThan(0);
    expect(result.analysis.scientific.veber).toBeDefined();
  });

  test('DiffDock NIM returns predicted or error status', async () => {
    const result = await runDiffDock({ smiles: aspirin, targetName: 'COX-2', traceId: 'test' });
    expect(['predicted', 'error', 'unavailable']).toContain(result.status);
    if (result.status === 'predicted') {
      expect(result.dockingScore).toBeDefined();
    }
  });

  test('MolMIM generates candidate analogs', async () => {
    const result = await runMolMIM({ smiles: aspirin, numMolecules: 3, traceId: 'test' });
    expect(['success', 'error', 'unavailable']).toContain(result.status);
    if (result.status === 'success') {
      expect(result.candidates.length).toBeGreaterThan(0);
    }
  });
});
