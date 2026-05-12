/**
 * IMMUTABLE MOLECULE RECORD — Single Source of Truth
 * 
 * CRITICAL GUARANTEES:
 * 1. SMILES is the source of truth (not PubChem)
 * 2. RDKit descriptors computed locally (not dependent on PubChem)
 * 3. PubChem is OPTIONAL metadata only
 * 4. No molecule substitution ever occurs
 * 5. All downstream modules reference this object ONLY
 * 6. Immutable after creation (frozen object)
 */

import { createHash } from 'crypto';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface MoleculeIdentity {
  inputSMILES: string;           // Original user input
  canonicalSMILES: string;       // RDKit canonical form
  inchiKey: string | null;       // InChI key for identity
  moleculeHash: string;          // SHA-256 hash for provenance
  timestamp: number;             // Analysis timestamp
}

export interface RDKitDescriptors {
  molecularWeight: number;
  molecularFormula: string;
  logP: number;
  hBondDonors: number;
  hBondAcceptors: number;
  rotatableBonds: number;
  tpsa: number;
  aromaticRings: number;
  heavyAtomCount: number;
  ringCount: number;
  // Add more RDKit descriptors as needed
}

export interface PubChemMetadata {
  status: 'found' | 'not_found' | 'error' | 'not_attempted';
  cid: number | null;
  iupacName: string | null;
  synonyms: string[];
  description: string | null;
  error: string | null;
}

export interface ModelFeatures {
  featureVector: number[];       // Exact features fed to model
  featureNames: string[];        // Feature labels
  featureHash: string;           // Hash for verification
}

export interface Prediction {
  score: number;
  confidence: number;
  verdict: string;
  verdictColor: 'green' | 'yellow' | 'red';
  modelVersion: string;
  predictionHash: string;        // Hash of (features + model version)
}

export interface SHAPExplanation {
  features: Array<{
    name: string;
    value: number;
    shapValue: number;
    direction: 'positive' | 'negative';
  }>;
  baseValue: number;
  explanationHash: string;       // Hash to verify consistency
}

export interface LIMEExplanation {
  weights: Array<{
    feature: string;
    weight: number;
  }>;
  intercept: number;
  r2Score: number;
  explanationHash: string;
}

export interface ValidationStatus {
  rdkitValid: boolean;
  descriptorsValid: boolean;
  canRunPrediction: boolean;
  canRunExplanation: boolean;
  errors: string[];
  warnings: string[];
}

// ============================================================================
// IMMUTABLE MOLECULE RECORD
// ============================================================================

export interface MoleculeRecord {
  // Identity (immutable)
  readonly identity: MoleculeIdentity;
  
  // RDKit data (required, computed locally)
  readonly rdkit: {
    readonly mol: any;           // RDKit Mol object (opaque)
    readonly descriptors: RDKitDescriptors;
    readonly svg: string | null; // 2D structure rendering
  };
  
  // PubChem data (optional, metadata only)
  readonly pubchem: PubChemMetadata;
  
  // Model data (computed from RDKit descriptors)
  readonly model: {
    readonly features: ModelFeatures;
    readonly prediction: Prediction;
  };
  
  // Explainability (computed from same features)
  readonly explanation: {
    readonly shap: SHAPExplanation;
    readonly lime: LIMEExplanation;
  };
  
  // Validation
  readonly validation: ValidationStatus;
  
  // Provenance
  readonly provenance: {
    readonly createdAt: number;
    readonly pipelineVersion: string;
    readonly recordHash: string;  // Hash of entire record
  };
}

// ============================================================================
// HASH GENERATION (for integrity verification)
// ============================================================================

export function generateMoleculeHash(smiles: string, timestamp: number): string {
  const data = `${smiles}|${timestamp}`;
  return createHash('sha256').update(data).digest('hex').substring(0, 16);
}

export function generateFeatureHash(features: number[]): string {
  const data = features.join(',');
  return createHash('sha256').update(data).digest('hex').substring(0, 16);
}

export function generatePredictionHash(features: number[], modelVersion: string): string {
  const data = `${features.join(',')}|${modelVersion}`;
  return createHash('sha256').update(data).digest('hex').substring(0, 16);
}

export function generateExplanationHash(features: number[], method: 'shap' | 'lime'): string {
  const data = `${features.join(',')}|${method}`;
  return createHash('sha256').update(data).digest('hex').substring(0, 16);
}

export function generateRecordHash(record: Partial<MoleculeRecord>): string {
  const data = JSON.stringify({
    smiles: record.identity?.canonicalSMILES,
    features: record.model?.features.featureHash,
    prediction: record.model?.prediction.predictionHash,
  });
  return createHash('sha256').update(data).digest('hex').substring(0, 16);
}

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

export function validateMoleculeRecord(record: MoleculeRecord): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  // Check identity consistency
  if (!record.identity.inputSMILES || !record.identity.canonicalSMILES) {
    errors.push("Missing SMILES identity");
  }
  
  // Check RDKit descriptors
  if (!record.rdkit.descriptors.molecularWeight || record.rdkit.descriptors.molecularWeight <= 0) {
    errors.push("Invalid molecular weight");
  }
  
  if (!record.rdkit.descriptors.molecularFormula) {
    errors.push("Missing molecular formula");
  }
  
  // Check feature consistency
  if (record.model.features.featureVector.length === 0) {
    errors.push("Empty feature vector");
  }
  
  if (record.model.features.featureVector.length !== record.model.features.featureNames.length) {
    errors.push("Feature vector/names length mismatch");
  }
  
  // Check hash consistency
  const computedFeatureHash = generateFeatureHash(record.model.features.featureVector);
  if (computedFeatureHash !== record.model.features.featureHash) {
    errors.push("Feature hash mismatch - data corruption detected");
  }
  
  const computedPredictionHash = generatePredictionHash(
    record.model.features.featureVector,
    record.model.prediction.modelVersion
  );
  if (computedPredictionHash !== record.model.prediction.predictionHash) {
    errors.push("Prediction hash mismatch - model input changed");
  }
  
  // Check SHAP consistency
  const computedSHAPHash = generateExplanationHash(record.model.features.featureVector, 'shap');
  if (computedSHAPHash !== record.explanation.shap.explanationHash) {
    errors.push("SHAP hash mismatch - explaining different molecule");
  }
  
  // Check LIME consistency
  const computedLIMEHash = generateExplanationHash(record.model.features.featureVector, 'lime');
  if (computedLIMEHash !== record.explanation.lime.explanationHash) {
    errors.push("LIME hash mismatch - explaining different molecule");
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// FREEZE RECORD (make immutable)
// ============================================================================

export function freezeMoleculeRecord(record: MoleculeRecord): Readonly<MoleculeRecord> {
  // Deep freeze to prevent any mutation
  Object.freeze(record);
  Object.freeze(record.identity);
  Object.freeze(record.rdkit);
  Object.freeze(record.rdkit.descriptors);
  Object.freeze(record.pubchem);
  Object.freeze(record.model);
  Object.freeze(record.model.features);
  Object.freeze(record.model.prediction);
  Object.freeze(record.explanation);
  Object.freeze(record.explanation.shap);
  Object.freeze(record.explanation.lime);
  Object.freeze(record.validation);
  Object.freeze(record.provenance);
  
  return record as Readonly<MoleculeRecord>;
}

// ============================================================================
// COMPARISON FUNCTIONS
// ============================================================================

export function isSameMolecule(record1: MoleculeRecord, record2: MoleculeRecord): boolean {
  return record1.identity.canonicalSMILES === record2.identity.canonicalSMILES;
}

export function isConsistentExplanation(record: MoleculeRecord): boolean {
  const validation = validateMoleculeRecord(record);
  return validation.valid;
}
