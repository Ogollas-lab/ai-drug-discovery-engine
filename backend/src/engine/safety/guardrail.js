/**
 * Safety guardrail — blocks high-risk recommendations before downstream actions.
 */
'use strict';

const BLOCKED_SUBSTRUCTURES = [
  { pattern: /N=N/, name: 'azo', reason: 'Azo compounds may have metabolic toxicity concerns' },
  { pattern: /N\[O\+\]/, name: 'nitroso', reason: 'Potential reactive metabolite' },
];

const HIGH_UNCERTAINTY_THRESHOLD = 0.4;

function evaluateSafety(analysis) {
  const issues = [];
  const warnings = [];
  let blocked = false;
  let requiresHitl = false;

  const smiles = analysis.smiles || '';
  for (const sub of BLOCKED_SUBSTRUCTURES) {
    if (sub.pattern.test(smiles)) {
      issues.push({ type: 'substructure', name: sub.name, reason: sub.reason });
      requiresHitl = true;
    }
  }

  const engagement = analysis.engagement;
  if (engagement?.confidence != null && engagement.confidence < HIGH_UNCERTAINTY_THRESHOLD) {
    warnings.push({
      type: 'low_confidence',
      message: `Engagement proxy confidence ${engagement.confidence} below threshold ${HIGH_UNCERTAINTY_THRESHOLD}`,
    });
    requiresHitl = true;
  }

  if (engagement?.source === 'heuristic_proxy' && engagement.value > 0.7) {
    warnings.push({
      type: 'heuristic_high_score',
      message: 'High heuristic score without experimental binding data — do not prioritize for synthesis without validation.',
    });
    requiresHitl = true;
  }

  const lipinski = analysis.rules?.lipinski;
  if (lipinski?.status === 'non-compliant') {
    warnings.push({ type: 'lipinski', message: 'Fails Lipinski Rule of Five — lead optimization recommended before synthesis.' });
  }

  if (analysis.descriptors?.molecularWeight > 600) {
    issues.push({ type: 'mw', reason: 'Molecular weight > 600 Da — poor oral bioavailability likely' });
    requiresHitl = true;
  }

  return {
    passed: !blocked,
    blocked,
    requiresHitl,
    issues,
    warnings,
    evaluatedAt: new Date().toISOString(),
  };
}

module.exports = { evaluateSafety, HIGH_UNCERTAINTY_THRESHOLD };
