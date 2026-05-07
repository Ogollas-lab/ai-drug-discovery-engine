// GAT (Graph Attention Network) molecular affinity predictor — heuristic stand-in.
// STRICT CONTRACT:
//  - Output ONLY probabilistic predictions (0..1) + uncertainty.
//  - NO biological interpretation. NO mechanism inference.
//  - NO words like "strong binding" / "weak binding" anywhere in output.

import { fetchPubChemBySMILES, fetchPubChemByName, type PubChemResult } from "./pubchem";
import { applyCalibration } from "./training-pipeline";

export type Uncertainty = "Low" | "Medium" | "High";

export interface GATPredictionInput {
  query: string;          // SMILES or compound name
  targetId: string;       // arbitrary target identifier (e.g. UniProt ID, gene symbol)
}

export interface GATPredictionOutput {
  label: "MODEL PREDICTION";
  affinityScore: number;          // 0.0 .. 1.0
  uncertainty: Uncertainty;
  uncertaintyValue: number;       // 0..1 std-dev proxy
  ensembleSamples: number[];      // raw forward-pass samples
  graphFeatures: {
    nodes: number;                // heavy-atom count proxy
    edges: number;                // bond count proxy
    degree: number;               // mean degree proxy
    aromaticRings: number;
    polarSurface: number;
    rotBonds: number;
  };
  targetEmbeddingHash: string;    // deterministic per target id
  note: string;                   // mandatory disclaimer
}

// Deterministic 32-bit hash for stable per-(smiles,target) sampling.
function hash(str: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function targetEmbeddingHash(targetId: string): string {
  const h = hash(targetId.toUpperCase().trim());
  return `0x${h.toString(16).padStart(8, "0")}`;
}

// Approximate molecular graph features from PubChem-derived properties + SMILES.
function extractGraphFeatures(mol: PubChemResult, smiles: string) {
  const heavyAtoms = (smiles.match(/[A-Z]/g) ?? []).length || Math.round(mol.mw / 13);
  const ringChars = (smiles.match(/[1-9]/g) ?? []).length;
  const aromaticRings = Math.floor(ringChars / 2);
  const bonds = Math.max(heavyAtoms - 1, 0) + aromaticRings;
  return {
    nodes: heavyAtoms,
    edges: bonds,
    degree: heavyAtoms > 0 ? +(2 * bonds / heavyAtoms).toFixed(2) : 0,
    aromaticRings,
    polarSurface: mol.tpsa,
    rotBonds: mol.rotBonds,
  };
}

// Sigmoid squash for raw logits.
const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));

// Pseudo GAT forward pass: deterministic stochastic ensemble keyed by
// (molecular features, target embedding). Returns N samples in [0,1].
function ensembleForward(
  features: ReturnType<typeof extractGraphFeatures>,
  mol: PubChemResult,
  targetId: string,
  samples = 32,
): number[] {
  const seed = hash(`${mol.cid}|${targetId}|${features.nodes}|${features.edges}`);
  const rand = mulberry32(seed);

  // "Attention-weighted" feature contribution (purely heuristic).
  const logitBase =
    0.18 * features.aromaticRings +
    0.05 * features.degree +
    0.012 * (mol.logp ?? 0) -
    0.008 * features.polarSurface +
    0.07 * Math.log1p(mol.hAcceptors + mol.hDonors) -
    0.04 * features.rotBonds -
    0.6;

  const out: number[] = [];
  for (let i = 0; i < samples; i++) {
    // MC-dropout style noise.
    const noise = (rand() - 0.5) * 1.4;
    // Apply trained calibration (scale + bias) from the training pipeline.
    out.push(applyCalibration(sigmoid(logitBase + noise)));
  }
  return out;
}

function classifyUncertainty(stdev: number): Uncertainty {
  if (stdev < 0.07) return "Low";
  if (stdev < 0.15) return "Medium";
  return "High";
}

export async function runGATPrediction(
  input: GATPredictionInput,
): Promise<GATPredictionOutput | null> {
  const q = input.query.trim();
  if (!q || !input.targetId.trim()) return null;

  // Resolve molecule via PubChem (SMILES first, fall back to name lookup).
  const looksLikeSmiles = /[=#\(\)\[\]\\\/]/.test(q) || /[A-Z][a-z]?[0-9]/.test(q);
  const mol =
    (looksLikeSmiles ? await fetchPubChemBySMILES(q) : null) ??
    (await fetchPubChemByName(q));
  if (!mol) return null;

  const smilesForFeatures = looksLikeSmiles ? q : mol.formula || q;
  const features = extractGraphFeatures(mol, smilesForFeatures);
  const samples = ensembleForward(features, mol, input.targetId);

  const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
  const variance =
    samples.reduce((a, b) => a + (b - mean) ** 2, 0) / samples.length;
  const stdev = Math.sqrt(variance);

  return {
    label: "MODEL PREDICTION",
    affinityScore: +mean.toFixed(4),
    uncertainty: classifyUncertainty(stdev),
    uncertaintyValue: +stdev.toFixed(4),
    ensembleSamples: samples.map((s) => +s.toFixed(4)),
    graphFeatures: features,
    targetEmbeddingHash: targetEmbeddingHash(input.targetId),
    note: "This is not experimental evidence.",
  };
}
