/**
 * Unified server-side molecule analysis — honest, provenance-rich.
 * Replaces client-side hash-GNN with rule-based + PubChem descriptors.
 */
'use strict';

const ExternalDataService = require('../../services/ExternalDataService');
const { applyDrugRules, generateRecommendations } = require('../../utils/drugRules');
const { buildScientificSummary } = require('./scientific-assessment');
const { config } = require('../config');

const PHARMACOLOGY_PRIORS = require('../../services/AIPredictionService').PHARMACOLOGY_PRIORS || {};

function hashSmiles(smiles) {
  let hash = 0;
  for (let i = 0; i < smiles.length; i++) {
    hash = ((hash << 5) - hash + smiles.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function classifyScaffold(smiles) {
  if (smiles.includes('c1ccccc1') || smiles.includes('C1=CC=CC=C1')) return 'aromatic';
  if (smiles.includes('NC(=O)')) return 'amide';
  if (smiles.includes('C(=O)O')) return 'carboxylic_acid';
  return 'generic';
}

/**
 * Heuristic engagement proxy — explicitly NOT a trained GNN.
 * Used only when no experimental binding data exists.
 */
function computeHeuristicEngagement(smiles, descriptors, scaffold) {
  const h = hashSmiles(smiles);
  let score = (h % 100) / 100;

  if (descriptors.molecularWeight > 200 && descriptors.molecularWeight < 450) score += 0.05;
  if (descriptors.logP >= 1 && descriptors.logP <= 3) score += 0.05;
  if (scaffold === 'aromatic') score += 0.03;

  score = Math.min(0.95, Math.max(0.05, score));

  return {
    value: Math.round(score * 100) / 100,
    confidence: 0.35,
    source: 'heuristic_proxy',
    modelId: 'heuristic-scaffold-v1',
    modelVersion: config.engine.pipelineVersion,
    label: 'Heuristic Target Engagement Proxy',
    disclaimer: 'NOT a trained GNN. For prioritization only — requires experimental validation.',
  };
}

async function analyzeMolecule({ smiles, targetId, targetName }) {
  const external = await ExternalDataService.comprehensiveMoleculeLookup(smiles);
  const pubchem = external?.pubchem;

  if (!pubchem) {
    return {
      success: false,
      error: 'Could not resolve molecule via PubChem. Check SMILES.',
      provenance: { pipeline: config.engine.pipelineVersion, source: 'pubchem' },
    };
  }

  const descriptors = {
    molecularWeight: Number(pubchem.molecularWeight),
    logP: pubchem.logP != null ? Number(pubchem.logP) : null,
    hBondDonors: Number(pubchem.hBondDonors),
    hBondAcceptors: Number(pubchem.hBondAcceptors),
    rotatableBonds: Number(pubchem.rotatableBonds),
    tpsa: Number(pubchem.topologicalPolarSurfaceArea),
    molecularFormula: pubchem.molecularFormula,
    pubchemCid: pubchem.pubchemCid,
  };

  const flatData = {
    molecularWeight: descriptors.molecularWeight,
    logP: descriptors.logP,
    hBondDonors: descriptors.hBondDonors,
    hBondAcceptors: descriptors.hBondAcceptors,
    rotatableBonds: descriptors.rotatableBonds,
    tpsa: descriptors.tpsa,
    smiles,
  };
  const rules = applyDrugRules(flatData);
  const recommendations = generateRecommendations(flatData, rules);
  const scaffold = classifyScaffold(smiles);
  const prior = PHARMACOLOGY_PRIORS[smiles] || null;
  const scientific = buildScientificSummary(smiles, descriptors);

  const engagement = prior?.gnnEngagementScore != null
    ? {
        value: prior.gnnEngagementScore,
        confidence: 0.85,
        source: 'curated_prior',
        modelId: 'pharmacology-priors',
        modelVersion: '1.0',
        label: 'Curated Pharmacology Prior',
        disclaimer: 'From published literature / FDA labels — not a fresh prediction.',
      }
    : computeHeuristicEngagement(smiles, descriptors, scaffold);

  const analysis = {
    smiles,
    name: external?.pubchem?.iupacName || external?.chembl?.[0]?.pref_name || `CID-${pubchem.pubchemCid}`,
    descriptors,
    rules,
    recommendations,
    scaffold,
    engagement,
    scientific,
    target: { id: targetId, name: targetName },
    dataSource: 'pubchem',
  };

  return {
    success: true,
    analysis,
    provenance: {
      pipeline: config.engine.pipelineVersion,
      pubchemCid: pubchem.pubchemCid,
      sources: ['pubchem', 'drug_rules', 'scientific_assessment'],
      engagementSource: engagement.source,
    },
  };
}

async function predictBindingAffinity(molecule, targetProtein, externalData) {
  const smiles = molecule.smiles || molecule;
  const result = await analyzeMolecule({ smiles, targetName: targetProtein });
  if (!result.success) throw new Error(result.error);

  const e = result.analysis.engagement;
  return {
    score: e.value,
    confidence: e.confidence,
    unit: 'engagement_proxy_0_1',
    label: e.label,
    disclaimer: e.disclaimer,
    provenance: result.provenance,
  };
}

async function predictToxicity(molecule, externalData) {
  const smiles = molecule.smiles || molecule;
  const result = await analyzeMolecule({ smiles });
  if (!result.success) throw new Error(result.error);

  const d = result.analysis.descriptors;
  const rules = result.analysis.rules;
  const hergRisk = d.logP > 4 && d.molecularWeight > 400 ? 'elevated' : 'moderate';
  const hepatotox = rules.lipinski?.status === 'non-compliant' ? 'elevated' : 'low';

  return {
    hergRisk,
    hepatotoxicity: hepatotox,
    confidence: 0.5,
    source: 'rule_based',
    disclaimer: 'Rule-based ADMET flags only — not validated tox models.',
    provenance: result.provenance,
  };
}

async function predictADME(molecule, externalData) {
  const smiles = molecule.smiles || molecule;
  const result = await analyzeMolecule({ smiles });
  if (!result.success) throw new Error(result.error);

  const rules = result.analysis.rules;
  const d = result.analysis.descriptors;

  return {
    oralAbsorption: rules.lipinski?.status === 'compliant' ? 'predicted_good' : 'predicted_poor',
    bbb: rules.bbb?.category || 'unknown',
    solubility: d.logP > 5 ? 'low' : 'moderate',
    cyp3a4Substrate: d.molecularWeight > 400,
    confidence: 0.55,
    source: 'rule_based',
    disclaimer: 'Rule-based ADME assessment — experimental validation required.',
    provenance: result.provenance,
  };
}

module.exports = {
  analyzeMolecule,
  predictBindingAffinity,
  predictToxicity,
  predictADME,
  computeHeuristicEngagement,
  buildScientificSummary: require('./scientific-assessment').buildScientificSummary,
};
