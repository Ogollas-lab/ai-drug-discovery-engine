/**
 * Rigorous rule-based medicinal chemistry assessment.
 * Deterministic — no ML claims. Suitable for researcher workflows.
 */
'use strict';

/** Common PAINS / reactive substructure alerts (simplified SMARTS-like patterns) */
const PAINS_PATTERNS = [
  { id: 'rhodanine', pattern: /S=C1NC\(=O\)C\(=O\)N1/, severity: 'high', label: 'Rhodanine (PAINS)' },
  { id: 'catechol', pattern: /c1ccc\(O\)c\(O\)c1|c\(O\)c\(O\)/, severity: 'medium', label: 'Catechol motif' },
  { id: 'quinone', pattern: /C1=CC\(=O\)C=CC1=O/, severity: 'high', label: 'Quinone-like' },
  { id: 'hydrazine', pattern: /NN/, severity: 'medium', label: 'Hydrazine / diazo' },
  { id: 'michael', pattern: /C=CC\(=O\)/, severity: 'low', label: 'Potential Michael acceptor' },
  { id: 'sulfonyl_halide', pattern: /S\(=O\)\(=O\)Cl/, severity: 'high', label: 'Reactive sulfonyl halide' },
];

/** Estimate QED (Quantitative Estimate of Drug-likeness) from descriptors — Bickerton et al. proxy */
function estimateQED(descriptors) {
  const mw = descriptors.molecularWeight ?? 400;
  const logP = descriptors.logP ?? 2.5;
  const hbd = descriptors.hBondDonors ?? 2;
  const hba = descriptors.hBondAcceptors ?? 4;
  const rot = descriptors.rotatableBonds ?? 4;
  const tpsa = descriptors.tpsa ?? 60;
  const arom = countAromaticRings(descriptors.smiles || '');

  const mwScore = gaussian(mw, 300, 150);
  const logPScore = gaussian(logP, 2.5, 1.5);
  const hbdScore = step(hbd, 0, 5);
  const hbaScore = step(hba, 0, 10);
  const rotScore = step(rot, 0, 8);
  const tpsaScore = gaussian(tpsa, 70, 40);
  const aromScore = step(arom, 0, 3);

  const qed = (mwScore + logPScore + hbdScore + hbaScore + rotScore + tpsaScore + aromScore) / 7;
  return {
    value: Math.round(Math.min(0.95, Math.max(0.05, qed)) * 1000) / 1000,
    interpretation: qed >= 0.67 ? 'high_drug_likeness' : qed >= 0.49 ? 'moderate' : 'low',
    method: 'descriptor_proxy_bickerton_2012',
    disclaimer: 'QED estimated from PubChem descriptors — not RDKit-computed. Validate with cheminformatics toolkit.',
  };
}

function gaussian(x, mu, sigma) {
  return Math.exp(-0.5 * ((x - mu) / sigma) ** 2);
}

function step(x, lo, hi) {
  if (x <= lo) return 1;
  if (x >= hi) return 0;
  return 1 - (x - lo) / (hi - lo);
}

function countAromaticRings(smiles) {
  const matches = smiles.match(/c1/gi);
  return matches ? Math.min(6, matches.length) : 0;
}

function screenPAINS(smiles) {
  const hits = [];
  for (const p of PAINS_PATTERNS) {
    if (p.pattern.test(smiles)) {
      hits.push({ id: p.id, label: p.label, severity: p.severity });
    }
  }
  return {
    passed: hits.length === 0,
    alerts: hits,
    method: 'pains_lite_v1',
    disclaimer: 'Simplified PAINS screen — not exhaustive. Use RDKit PAINS filters for publication.',
  };
}

/** Veber rules: rotatable bonds ≤ 10, TPSA ≤ 140 */
function applyVeberRules(descriptors) {
  const rotOk = (descriptors.rotatableBonds ?? 99) <= 10;
  const tpsaOk = (descriptors.tpsa ?? 999) <= 140;
  const passed = rotOk && tpsaOk;
  return {
    passed,
    rotatableBonds: descriptors.rotatableBonds,
    tpsa: descriptors.tpsa,
    status: passed ? 'compliant' : 'non-compliant',
    reasoning: passed
      ? 'Meets Veber oral bioavailability criteria (rot ≤ 10, TPSA ≤ 140 Å²)'
      : `Fails Veber: ${!rotOk ? 'rotatable bonds > 10' : ''}${!rotOk && !tpsaOk ? '; ' : ''}${!tpsaOk ? 'TPSA > 140' : ''}`,
  };
}

/** hERG liability heuristic (Cavalli et al. inspired) */
function assessHerGRisk(descriptors) {
  const logP = descriptors.logP ?? 0;
  const mw = descriptors.molecularWeight ?? 0;
  const basicN = /N[^=]/i.test(descriptors.smiles || '') && !/NC\(=O\)/.test(descriptors.smiles || '');

  let risk = 'low';
  let score = 0.15;
  if (logP > 3.7 && mw > 350) { risk = 'moderate'; score = 0.45; }
  if (logP > 4.5 && basicN) { risk = 'elevated'; score = 0.65; }
  if (logP > 5 && mw > 400 && basicN) { risk = 'high'; score = 0.82; }

  return {
    risk,
    score,
    method: 'herg_heuristic_cavalli_inspired',
    disclaimer: 'Rule-based hERG flag — not validated ML model. Run patch-clamp or in silico hERG prediction for decisions.',
  };
}

function buildScientificSummary(smiles, descriptors) {
  const qed = estimateQED({ ...descriptors, smiles });
  const pains = screenPAINS(smiles);
  const veber = applyVeberRules(descriptors);
  const herg = assessHerGRisk({ ...descriptors, smiles });

  const flags = [];
  if (!pains.passed) flags.push({ type: 'pains', severity: 'high', count: pains.alerts.length });
  if (!veber.passed) flags.push({ type: 'veber', severity: 'medium' });
  if (herg.risk === 'high' || herg.risk === 'elevated') flags.push({ type: 'herg', severity: herg.risk });

  return {
    qed,
    pains,
    veber,
    herg,
    overallRisk: flags.some((f) => f.severity === 'high') ? 'elevated' : flags.length ? 'moderate' : 'standard',
    flags,
    citations: [
      'Bickerton et al. (2012) QED — Nature Chemistry',
      'Veber et al. (2002) oral bioavailability — J Med Chem',
      'Baell & Holloway (2010) PAINS — J Med Chem',
    ],
  };
}

module.exports = {
  estimateQED,
  screenPAINS,
  applyVeberRules,
  assessHerGRisk,
  buildScientificSummary,
};
