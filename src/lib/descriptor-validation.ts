/**
 * Descriptor Validation Module
 * ────────────────────────────────────────────────────────────────────────────
 * Production-grade validation for molecular descriptors.
 * 
 * CRITICAL PRINCIPLE: NEVER show fake data. Always fail explicitly.
 * 
 * This module ensures:
 * 1. All descriptors are finite, positive numbers (where applicable)
 * 2. No silent zero-fallback logic
 * 3. Explicit error states for failed calculations
 * 4. Provenance tracking for all data sources
 * 5. Validation gates before AI reasoning layers
 */

import type { PubChemResult } from "./pubchem";

export type ProvenanceSource = "experimental" | "predicted" | "inferred" | "generated" | "failed";
export type ConfidenceLevel = "high" | "medium" | "low";

export interface ProvenanceMetadata {
  source: ProvenanceSource;
  confidence: ConfidenceLevel;
  method: string;
  timestamp: string;
  dataSource?: string;
}

export interface DescriptorValidation {
  valid: boolean;
  error: string | null;
  warnings: string[];
  provenance: ProvenanceMetadata;
}

export interface ValidatedDescriptor<T> {
  value: T;
  validation: DescriptorValidation;
}

// ─────────────────────────────────────────────────────────────────────────────
// Core Validation Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validate that a number is finite and within acceptable range.
 * Used for MW, TPSA, LogP, etc.
 */
function isValidNumber(value: number | null | undefined, min?: number, max?: number): boolean {
  if (value === null || value === undefined) return false;
  if (!isFinite(value)) return false;
  if (min !== undefined && value < min) return false;
  if (max !== undefined && value > max) return false;
  return true;
}

/**
 * Validate that an integer count is non-negative.
 * Used for H-bond donors/acceptors, rotatable bonds, etc.
 */
function isValidCount(value: number | null | undefined): boolean {
  if (value === null || value === undefined) return false;
  if (!Number.isInteger(value)) return false;
  if (value < 0) return false;
  return true;
}

/**
 * Validate molecular weight.
 * Must be: positive, finite, typically 50-2000 Da for drug-like molecules.
 */
function validateMolecularWeight(mw: number | null | undefined): { valid: boolean; error: string | null } {
  if (!isValidNumber(mw, 0)) {
    return { valid: false, error: "Molecular weight must be a positive finite number" };
  }
  if (mw! < 50) {
    return { valid: false, error: "Molecular weight too low (< 50 Da) — likely calculation error" };
  }
  if (mw! > 2000) {
    return { valid: false, error: "Molecular weight too high (> 2000 Da) — outside drug-like range" };
  }
  return { valid: true, error: null };
}

/**
 * Validate LogP (partition coefficient).
 * Can be negative, but must be finite. Typical drug range: -3 to +7.
 */
function validateLogP(logp: number | null | undefined): { valid: boolean; error: string | null; warning: string | null } {
  // LogP can be null for some compounds (salts, inorganics)
  if (logp === null || logp === undefined) {
    return { valid: true, error: null, warning: "LogP not available from PubChem (may be a salt or novel structure)" };
  }
  if (!isFinite(logp)) {
    return { valid: false, error: "LogP must be a finite number", warning: null };
  }
  if (logp < -5 || logp > 10) {
    return { valid: true, error: null, warning: `LogP = ${logp.toFixed(2)} is outside typical drug range (-3 to +7)` };
  }
  return { valid: true, error: null, warning: null };
}

/**
 * Validate TPSA (topological polar surface area).
 * Must be: non-negative, finite, typically 0-200 Ų for drug-like molecules.
 */
function validateTPSA(tpsa: number | null | undefined): { valid: boolean; error: string | null; warning: string | null } {
  if (!isValidNumber(tpsa, 0)) {
    return { valid: false, error: "TPSA must be a non-negative finite number", warning: null };
  }
  if (tpsa! > 200) {
    return { valid: true, error: null, warning: `TPSA = ${tpsa!.toFixed(1)} Ų is high — may have poor membrane permeability` };
  }
  return { valid: true, error: null, warning: null };
}

/**
 * Validate H-bond donor/acceptor counts.
 * Must be: non-negative integers.
 */
function validateHBondCount(count: number | null | undefined, label: string): { valid: boolean; error: string | null } {
  if (!isValidCount(count)) {
    return { valid: false, error: `${label} must be a non-negative integer` };
  }
  if (count! > 50) {
    return { valid: false, error: `${label} = ${count} is unrealistically high — likely calculation error` };
  }
  return { valid: true, error: null };
}

/**
 * Validate rotatable bond count.
 * Must be: non-negative integer, typically 0-20 for drug-like molecules.
 */
function validateRotatableBonds(rotBonds: number | null | undefined): { valid: boolean; error: string | null; warning: string | null } {
  if (!isValidCount(rotBonds)) {
    return { valid: false, error: "Rotatable bonds must be a non-negative integer", warning: null };
  }
  if (rotBonds! > 30) {
    return { valid: true, error: null, warning: `Rotatable bonds = ${rotBonds} is high — may have poor oral bioavailability` };
  }
  return { valid: true, error: null, warning: null };
}

// ─────────────────────────────────────────────────────────────────────────────
// Comprehensive Descriptor Validation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validate all descriptors from a PubChem result.
 * Returns validation state with explicit errors and warnings.
 * 
 * CRITICAL: This function NEVER returns fake data.
 * If validation fails, the caller MUST show an error state.
 */
export function validateDescriptors(result: PubChemResult | null): DescriptorValidation {
  if (!result) {
    return {
      valid: false,
      error: "PubChem lookup failed — no descriptor data available",
      warnings: [],
      provenance: {
        source: "failed",
        confidence: "low",
        method: "PubChem PUG REST API",
        timestamp: new Date().toISOString(),
      },
    };
  }

  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate molecular weight
  const mwValidation = validateMolecularWeight(result.mw);
  if (!mwValidation.valid) errors.push(mwValidation.error!);

  // Validate LogP (can be null, but if present must be finite)
  const logpValidation = validateLogP(result.logp);
  if (!logpValidation.valid) errors.push(logpValidation.error!);
  if (logpValidation.warning) warnings.push(logpValidation.warning);

  // Validate TPSA
  const tpsaValidation = validateTPSA(result.tpsa);
  if (!tpsaValidation.valid) errors.push(tpsaValidation.error!);
  if (tpsaValidation.warning) warnings.push(tpsaValidation.warning);

  // Validate H-bond donors
  const hDonorsValidation = validateHBondCount(result.hDonors, "H-bond donors");
  if (!hDonorsValidation.valid) errors.push(hDonorsValidation.error!);

  // Validate H-bond acceptors
  const hAcceptorsValidation = validateHBondCount(result.hAcceptors, "H-bond acceptors");
  if (!hAcceptorsValidation.valid) errors.push(hAcceptorsValidation.error!);

  // Validate rotatable bonds
  const rotBondsValidation = validateRotatableBonds(result.rotBonds);
  if (!rotBondsValidation.valid) errors.push(rotBondsValidation.error!);
  if (rotBondsValidation.warning) warnings.push(rotBondsValidation.warning);

  // Check for atom count (CID = 0 means PubChem didn't recognize the structure)
  if (result.cid === 0) {
    errors.push("PubChem did not recognize this structure (CID = 0)");
  }

  const valid = errors.length === 0;

  return {
    valid,
    error: errors.length > 0 ? errors.join("; ") : null,
    warnings,
    provenance: {
      source: valid ? "experimental" : "failed",
      confidence: valid ? "high" : "low",
      method: "PubChem PUG REST API",
      timestamp: new Date().toISOString(),
      dataSource: "PubChem",
    },
  };
}

/**
 * Validate that two descriptor sets are comparable.
 * Used before computing deltas in analog comparison.
 */
export function validateComparison(
  original: PubChemResult | null,
  modified: PubChemResult | null
): { valid: boolean; error: string | null } {
  const origValidation = validateDescriptors(original);
  const modValidation = validateDescriptors(modified);

  if (!origValidation.valid) {
    return { valid: false, error: `Original molecule validation failed: ${origValidation.error}` };
  }

  if (!modValidation.valid) {
    return { valid: false, error: `Modified molecule validation failed: ${modValidation.error}` };
  }

  return { valid: true, error: null };
}

/**
 * Safe accessor for descriptor values.
 * Returns null if value is invalid, forcing caller to handle missing data explicitly.
 * 
 * CRITICAL: This function NEVER returns a fake zero value.
 */
export function safeDescriptorValue(value: number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  if (!isFinite(value)) return null;
  return value;
}

/**
 * Format descriptor value for display with provenance badge.
 */
export function formatDescriptorWithProvenance(
  value: number | null,
  unit: string,
  decimals: number,
  provenance: ProvenanceMetadata
): string {
  if (value === null) {
    return `N/A [${provenance.source}]`;
  }
  return `${value.toFixed(decimals)} ${unit} [${provenance.source}]`;
}

/**
 * Validation gate for AI reasoning layers.
 * Returns true only if ALL descriptors are valid and safe to send to Gemini.
 * 
 * CRITICAL: Gemini must NEVER receive corrupted descriptor data.
 */
export function canCallGemini(
  original: PubChemResult | null,
  modified: PubChemResult | null
): { allowed: boolean; reason: string | null } {
  const comparison = validateComparison(original, modified);
  
  if (!comparison.valid) {
    return {
      allowed: false,
      reason: `Descriptor validation failed: ${comparison.error}. Cannot generate AI reasoning with invalid data.`,
    };
  }

  return { allowed: true, reason: null };
}

/**
 * Generate error telemetry for failed descriptor calculations.
 * Used for production monitoring and debugging.
 */
export interface DescriptorErrorTelemetry {
  timestamp: string;
  smiles: string;
  errorType: "pubchem_lookup_failed" | "validation_failed" | "sanitization_failed";
  errorMessage: string;
  descriptorSnapshot: Partial<PubChemResult> | null;
}

export function generateErrorTelemetry(
  smiles: string,
  errorType: DescriptorErrorTelemetry["errorType"],
  errorMessage: string,
  descriptorSnapshot: Partial<PubChemResult> | null = null
): DescriptorErrorTelemetry {
  return {
    timestamp: new Date().toISOString(),
    smiles,
    errorType,
    errorMessage,
    descriptorSnapshot,
  };
}
