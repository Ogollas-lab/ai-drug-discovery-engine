'use strict';

const { buildScientificSummary, estimateQED, screenPAINS } = require('../src/engine/analysis/scientific-assessment');

describe('Scientific Assessment', () => {
  const aspirin = 'CC(=O)Oc1ccccc1C(=O)O';
  const descriptors = {
    molecularWeight: 180.16,
    logP: 1.19,
    hBondDonors: 1,
    hBondAcceptors: 4,
    rotatableBonds: 3,
    tpsa: 63.6,
  };

  test('QED is bounded and has interpretation', () => {
    const qed = estimateQED({ ...descriptors, smiles: aspirin });
    expect(qed.value).toBeGreaterThan(0.05);
    expect(qed.value).toBeLessThanOrEqual(0.95);
    expect(qed.interpretation).toBeTruthy();
  });

  test('aspirin passes PAINS screen', () => {
    const pains = screenPAINS(aspirin);
    expect(pains.passed).toBe(true);
  });

  test('buildScientificSummary returns full assessment', () => {
    const summary = buildScientificSummary(aspirin, descriptors);
    expect(summary.qed).toBeDefined();
    expect(summary.veber.passed).toBe(true);
    expect(summary.herg.risk).toBeTruthy();
    expect(summary.citations.length).toBeGreaterThan(0);
  });
});
