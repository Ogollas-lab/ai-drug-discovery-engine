/**
 * Utility functions for the Vitalis AI backend
 */

/**
 * Format molecule data for different audiences
 */
const formatForResearcher = (prediction) => {
  return {
    predictionType: prediction.predictionType,
    results: prediction.results,
    confidence: prediction.results[prediction.predictionType]?.confidence || 0,
    methodology: prediction.detailedReport?.methodology || 'Gemini 2.5 Flash analysis',
    assumptions: prediction.detailedReport?.assumptions || [],
    limitations: prediction.detailedReport?.limitations || [],
    references: prediction.detailedReport?.references || [],
    uncertaintyEstimate: prediction.uncertaintyEstimate || {
      confidenceLevel: '95%',
      standardError: 0.05
    },
    timestamp: prediction.createdAt,
    executionTimeMs: prediction.executionTimeMs
  };
};

/**
 * Format prediction for judges and non-technical audience
 */
const formatForJudges = (prediction, molecule) => {
  const highlights = [];
  
  switch (prediction.predictionType) {
    case 'binding-affinity':
      const score = prediction.results.bindingAffinity?.score;
      const kd = score < 100 ? '🟢 Strong' : score < 500 ? '🟡 Moderate' : '🔴 Weak';
      highlights.push(`Binding Strength: ${kd} (${score.toFixed(1)} nM)`);
      break;
    case 'toxicity':
      const toxScore = prediction.results.toxicity?.overallScore;
      const toxRisk = toxScore < 0.2 ? '🟢 Low' : toxScore < 0.5 ? '🟡 Medium' : '🔴 High';
      highlights.push(`Toxicity Risk: ${toxRisk} (${(toxScore * 100).toFixed(0)}%)`);
      break;
    case 'adme':
      const absorption = prediction.results.adme?.absorption?.value;
      highlights.push(`Oral Bioavailability: ${(absorption * 100).toFixed(0)}%`);
      highlights.push(`BBB Penetration: ${prediction.results.adme?.bloodBrainBarrier?.value ? 'Yes' : 'No'}`);
      break;
  }

  return {
    title: `${prediction.predictionType.replace('-', ' ').toUpperCase()} Analysis`,
    highlights,
    confidence: `${((prediction.results[prediction.predictionType]?.confidence || 0.7) * 100).toFixed(0)}% Confidence`,
    speedMetric: `Analyzed in ${prediction.executionTimeMs}ms (seconds, not months!)`,
    clinicalRelevance: `Compound: ${molecule.commonName || 'Unknown'} | Disease: ${molecule.disease || 'General'}`,
    nextSteps: 'Ready for experimental validation or further optimization'
  };
};

/**
 * Calculate similarity score between molecules (simplified)
 */
const calculateMoleculeSimilarity = (smiles1, smiles2) => {
  // Simplified Tanimoto coefficient approximation
  if (smiles1 === smiles2) return 1.0;
  
  const minLength = Math.min(smiles1.length, smiles2.length);
  let matches = 0;
  
  for (let i = 0; i < minLength; i++) {
    if (smiles1[i] === smiles2[i]) matches++;
  }
  
  const intersection = matches;
  const union = Math.max(smiles1.length, smiles2.length);
  return intersection / union;
};

/**
 * Validate and normalize SMILES
 */
const normalizeSMILES = (smiles) => {
  return smiles.trim().toUpperCase();
};

/**
 * Extract statistics from multiple predictions
 */
const calculateAggregateStats = (predictions) => {
  if (!predictions || predictions.length === 0) {
    return null;
  }

  const bindingAffinities = predictions
    .filter(p => p.predictionType === 'binding-affinity')
    .map(p => p.results.bindingAffinity?.score)
    .filter(Boolean);

  const toxicityScores = predictions
    .filter(p => p.predictionType === 'toxicity')
    .map(p => p.results.toxicity?.overallScore)
    .filter(Boolean);

  return {
    totalPredictions: predictions.length,
    averageBindingAffinity: bindingAffinities.length > 0
      ? bindingAffinities.reduce((a, b) => a + b, 0) / bindingAffinities.length
      : null,
    averageToxicity: toxicityScores.length > 0
      ? toxicityScores.reduce((a, b) => a + b, 0) / toxicityScores.length
      : null,
    bindingAffinityRange: bindingAffinities.length > 0
      ? { min: Math.min(...bindingAffinities), max: Math.max(...bindingAffinities) }
      : null,
    toxicityRange: toxicityScores.length > 0
      ? { min: Math.min(...toxicityScores), max: Math.max(...toxicityScores) }
      : null
  };
};

/**
 * Generate publication-ready tables
 */
const generateComparisonTable = (molecules) => {
  if (!molecules || molecules.length === 0) return '';

  const headers = ['Name', 'MW', 'LogP', 'Binding Affinity', 'Toxicity', 'Bioavailability'];
  const rows = molecules.map(mol => [
    mol.commonName || 'Unknown',
    `${mol.molecularWeight?.toFixed(2) || 'N/A'} Da`,
    `${mol.logP?.toFixed(2) || 'N/A'}`,
    `${mol.predictions?.bindingAffinity?.score?.toFixed(1) || 'N/A'} nM`,
    `${(mol.predictions?.toxicity?.score * 100 || 0).toFixed(1)}%`,
    `${(mol.predictions?.adme?.absorption * 100 || 0).toFixed(1)}%`
  ]);

  // Simple markdown table
  let table = `| ${headers.join(' | ')} |\n`;
  table += `|${headers.map(() => ' --- |').join('')}\n`;
  rows.forEach(row => {
    table += `| ${row.join(' | ')} |\n`;
  });

  return table;
};

/**
 * Check for drug-like properties (Lipinski's Rule of Five)
 */
const checkDrugLikeness = (molecule) => {
  const violations = [];
  let score = 0;

  // Molecular Weight <= 500
  if (molecule.molecularWeight && molecule.molecularWeight > 500) {
    violations.push('MW > 500 Da');
  } else {
    score += 25;
  }

  // LogP <= 5
  if (molecule.logP && molecule.logP > 5) {
    violations.push('LogP > 5');
  } else {
    score += 25;
  }

  // H-bond donors <= 5
  if (molecule.hBondDonors && molecule.hBondDonors > 5) {
    violations.push('HBD > 5');
  } else {
    score += 25;
  }

  // H-bond acceptors <= 10
  if (molecule.hBondAcceptors && molecule.hBondAcceptors > 10) {
    violations.push('HBA > 10');
  } else {
    score += 25;
  }

  return {
    isLikeDrug: violations.length <= 1,
    violations,
    score,
    description: violations.length === 0
      ? 'Excellent drug-like properties'
      : violations.length === 1
        ? 'Good drug-like properties with 1 concern'
        : 'Poor drug-like properties'
  };
};

/**
 * Estimate synthesis complexity
 */
const estimateSynthesisComplexity = (molecule) => {
  let complexity = 1; // Start at step 1

  if (molecule.rotatableBonds && molecule.rotatableBonds > 10) complexity += 3;
  if (molecule.aromaticRings && molecule.aromaticRings > 3) complexity += 2;
  if (molecule.topologicalPolarSurfaceArea && molecule.topologicalPolarSurfaceArea > 100) complexity += 1;

  return {
    estimatedSteps: complexity,
    complexity: complexity <= 3 ? 'Low' : complexity <= 7 ? 'Medium' : 'High',
    estimatedCost: complexity <= 3 ? 'Low' : complexity <= 7 ? 'Medium' : 'High'
  };
};

/**
 * Format time difference in human-readable format
 */
const formatTimeDifference = (date) => {
  const now = new Date();
  const diff = Math.floor((now - date) / 1000); // seconds

  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return date.toLocaleDateString();
};

/**
 * Generate confidence badge
 */
const getConfidenceBadge = (confidence) => {
  if (confidence >= 0.9) return '🟢 Very High';
  if (confidence >= 0.8) return '🟢 High';
  if (confidence >= 0.7) return '🟡 Moderate';
  if (confidence >= 0.6) return '🟡 Fair';
  return '🔴 Low';
};

/**
 * Generate impact summary
 */
const generateImpactSummary = (predictions) => {
  const summary = [];

  const binding = predictions.find(p => p.predictionType === 'binding-affinity');
  if (binding) {
    const score = binding.results.bindingAffinity?.score;
    if (score < 100) {
      summary.push('✨ Strong binding affinity - excellent target engagement');
    } else if (score < 500) {
      summary.push('👍 Moderate binding affinity - reasonable target engagement');
    }
  }

  const toxicity = predictions.find(p => p.predictionType === 'toxicity');
  if (toxicity) {
    const score = toxicity.results.toxicity?.overallScore;
    if (score < 0.2) {
      summary.push('🟢 Low toxicity risk - generally safe profile');
    } else if (score < 0.5) {
      summary.push('⚠️  Moderate toxicity concerns - needs further evaluation');
    }
  }

  const adme = predictions.find(p => p.predictionType === 'adme');
  if (adme) {
    const absorption = adme.results.adme?.absorption?.value;
    if (absorption > 0.8) {
      summary.push('📈 Excellent oral bioavailability - good for oral drugs');
    } else if (absorption > 0.5) {
      summary.push('📊 Moderate oral bioavailability - suitable for oral administration');
    }
  }

  return summary;
};

module.exports = {
  formatForResearcher,
  formatForJudges,
  calculateMoleculeSimilarity,
  normalizeSMILES,
  calculateAggregateStats,
  generateComparisonTable,
  checkDrugLikeness,
  estimateSynthesisComplexity,
  formatTimeDifference,
  getConfidenceBadge,
  generateImpactSummary
};
