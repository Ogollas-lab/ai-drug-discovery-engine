/**
 * RDKIT INTEGRATION — Local Descriptor Calculation
 * 
 * CRITICAL: This module provides LOCAL descriptor calculation using RDKit WASM.
 * PubChem is NO LONGER REQUIRED for molecular analysis.
 * 
 * Architecture:
 * 1. Parse SMILES with RDKit (source of truth)
 * 2. Compute descriptors locally (no API dependency)
 * 3. Optionally enrich with PubChem metadata
 * 
 * Installation required:
 * npm install @rdkit/rdkit
 */

import type { RDKitDescriptors } from './molecule-record';

// ============================================================================
// RDKIT INITIALIZATION
// ============================================================================

let RDKitModule: any = null;
let initPromise: Promise<void> | null = null;

/**
 * Initialize RDKit WASM module (call once at app startup)
 */
export async function initRDKit(): Promise<void> {
  if (RDKitModule) return;
  
  if (!initPromise) {
    initPromise = (async () => {
      try {
        // @ts-ignore - RDKit WASM module
        const initRDKitModule = (await import('@rdkit/rdkit')).default;
        RDKitModule = await initRDKitModule();
        console.log('[RDKit] Initialized successfully');
      } catch (error) {
        console.error('[RDKit] Initialization failed:', error);
        throw new Error('RDKit initialization failed. Install with: npm install @rdkit/rdkit');
      }
    })();
  }
  
  return initPromise;
}

/**
 * Get RDKit module (throws if not initialized)
 */
function getRDKit(): any {
  if (!RDKitModule) {
    throw new Error('RDKit not initialized. Call initRDKit() first.');
  }
  return RDKitModule;
}

// ============================================================================
// SMILES PARSING
// ============================================================================

export interface RDKitMolecule {
  mol: any;                      // RDKit Mol object
  canonicalSMILES: string;
  inchiKey: string | null;
  isValid: boolean;
  error: string | null;
}

/**
 * Parse SMILES string with RDKit
 * 
 * CRITICAL: This is the ONLY source of truth for molecule validity.
 * If RDKit can parse it, it's valid. Period.
 */
export function parseSMILES(smiles: string): RDKitMolecule {
  const rdkit = getRDKit();
  
  try {
    // Parse SMILES
    const mol = rdkit.get_mol(smiles);
    
    if (!mol || mol.is_valid() === 0) {
      return {
        mol: null,
        canonicalSMILES: '',
        inchiKey: null,
        isValid: false,
        error: 'Invalid SMILES structure',
      };
    }
    
    // Get canonical SMILES
    const canonicalSMILES = mol.get_smiles();
    
    // Get InChI key (for identity verification)
    let inchiKey: string | null = null;
    try {
      inchiKey = mol.get_inchi_key();
    } catch (e) {
      console.warn('[RDKit] Could not generate InChI key:', e);
    }
    
    return {
      mol,
      canonicalSMILES,
      inchiKey,
      isValid: true,
      error: null,
    };
  } catch (error) {
    return {
      mol: null,
      canonicalSMILES: '',
      inchiKey: null,
      isValid: false,
      error: error instanceof Error ? error.message : 'Unknown RDKit error',
    };
  }
}

// ============================================================================
// DESCRIPTOR CALCULATION
// ============================================================================

/**
 * Compute molecular descriptors using RDKit
 * 
 * CRITICAL: These are computed LOCALLY, no API dependency.
 * This is the PRIMARY source of descriptors for analysis.
 */
export function computeDescriptors(mol: any): RDKitDescriptors {
  const rdkit = getRDKit();
  
  try {
    // Get descriptor calculator
    const descriptors = JSON.parse(mol.get_descriptors());
    
    // Extract standard descriptors
    return {
      molecularWeight: descriptors.exactmw || descriptors.amw || 0,
      molecularFormula: mol.get_molblock().split('\n')[0] || 'Unknown',
      logP: descriptors.CrippenClogP || 0,
      hBondDonors: descriptors.NumHDonors || 0,
      hBondAcceptors: descriptors.NumHAcceptors || 0,
      rotatableBonds: descriptors.NumRotatableBonds || 0,
      tpsa: descriptors.TPSA || 0,
      aromaticRings: descriptors.NumAromaticRings || 0,
      heavyAtomCount: descriptors.NumHeavyAtoms || 0,
      ringCount: descriptors.RingCount || 0,
    };
  } catch (error) {
    console.error('[RDKit] Descriptor calculation failed:', error);
    throw new Error('Failed to compute molecular descriptors');
  }
}

/**
 * Get molecular formula from RDKit
 */
export function getMolecularFormula(mol: any): string {
  try {
    const descriptors = JSON.parse(mol.get_descriptors());
    return descriptors.MolecularFormula || 'Unknown';
  } catch (error) {
    console.error('[RDKit] Formula extraction failed:', error);
    return 'Unknown';
  }
}

/**
 * Generate 2D structure SVG
 */
export function generateSVG(mol: any, width: number = 300, height: number = 300): string | null {
  try {
    return mol.get_svg(width, height);
  } catch (error) {
    console.error('[RDKit] SVG generation failed:', error);
    return null;
  }
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate RDKit descriptors
 */
export function validateDescriptors(descriptors: RDKitDescriptors): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Critical checks
  if (!descriptors.molecularWeight || descriptors.molecularWeight <= 0) {
    errors.push('Invalid molecular weight');
  }
  
  if (!descriptors.molecularFormula || descriptors.molecularFormula === 'Unknown') {
    errors.push('Missing molecular formula');
  }
  
  if (!isFinite(descriptors.molecularWeight)) {
    errors.push('Non-finite molecular weight');
  }
  
  if (descriptors.tpsa < 0 || !isFinite(descriptors.tpsa)) {
    errors.push('Invalid TPSA value');
  }
  
  // Warnings
  if (descriptors.logP < -5 || descriptors.logP > 10) {
    warnings.push('LogP outside typical drug-like range');
  }
  
  if (descriptors.molecularWeight > 1000) {
    warnings.push('Molecular weight exceeds typical drug range');
  }
  
  if (descriptors.hBondDonors > 10) {
    warnings.push('High number of H-bond donors');
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================================================
// FALLBACK FOR BROWSER WITHOUT RDKIT
// ============================================================================

/**
 * Check if RDKit is available
 */
export function isRDKitAvailable(): boolean {
  return RDKitModule !== null;
}

/**
 * Fallback descriptor calculation using heuristics (ONLY if RDKit unavailable)
 * 
 * WARNING: This is a LAST RESORT and should NOT be used in production.
 * Always prefer RDKit calculation.
 */
export function computeDescriptorsFallback(smiles: string): RDKitDescriptors {
  console.warn('[RDKit] Using fallback descriptor calculation - results may be inaccurate');
  
  // Very basic heuristic estimation
  const heavyAtoms = (smiles.match(/[A-Z]/g) || []).length;
  const estimatedMW = heavyAtoms * 13; // Rough estimate
  
  return {
    molecularWeight: estimatedMW,
    molecularFormula: 'Unknown',
    logP: 0,
    hBondDonors: (smiles.match(/[OH]/g) || []).length,
    hBondAcceptors: (smiles.match(/[ON]/g) || []).length,
    rotatableBonds: (smiles.match(/[^=](-)[^=]/g) || []).length,
    tpsa: 0,
    aromaticRings: (smiles.match(/c/g) || []).length / 6,
    heavyAtomCount: heavyAtoms,
    ringCount: (smiles.match(/[0-9]/g) || []).length / 2,
  };
}

// ============================================================================
// CLEANUP
// ============================================================================

/**
 * Delete RDKit molecule object (free memory)
 */
export function deleteMol(mol: any): void {
  try {
    if (mol && typeof mol.delete === 'function') {
      mol.delete();
    }
  } catch (error) {
    console.warn('[RDKit] Failed to delete molecule:', error);
  }
}
