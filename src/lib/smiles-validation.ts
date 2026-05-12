/**
 * SMILES Validation & Input Classification
 * ────────────────────────────────────────────────────────────────────────────
 * Client-side SMILES validation without RDKit.
 * 
 * Purpose: Determine if user input is a SMILES string or a molecule name
 * BEFORE calling PubChem, to avoid unnecessary API failures.
 */

export type InputType = "smiles" | "name" | "invalid";

export interface InputClassification {
  type: InputType;
  confidence: "high" | "medium" | "low";
  reason: string;
}

/**
 * SMILES character set validation.
 * Valid SMILES characters: C, N, O, S, P, F, Cl, Br, I, c, n, o, s, p,
 * numbers (ring closures), =, #, -, +, @, [, ], (, ), /, \, %, .
 */
const SMILES_CHARS = /^[CNOSPFIBrcnospfib0-9=#\-+@\[\]()\/\\%.]+$/;

/**
 * Common SMILES patterns that indicate valid structure notation.
 */
const SMILES_PATTERNS = {
  // Aromatic rings: c1ccccc1, c1ccncc1
  aromaticRing: /c\d[cnos]+c\d/i,
  
  // Aliphatic rings: C1CCCCC1
  aliphaticRing: /C\d[CNOS]+C\d/i,
  
  // Double/triple bonds: C=C, C#N
  multipleBonds: /[CNOS]=[CNOS]|[CNOS]#[CNOS]/i,
  
  // Branching: C(C)C, C(=O)O
  branching: /\([^)]+\)/,
  
  // Ring closures: 1, 2, %10
  ringClosure: /\d{1,2}|%\d{2}/,
  
  // Stereochemistry: @, @@, /, \
  stereo: /@{1,2}|\/|\\/,
  
  // Charged atoms: [NH3+], [O-]
  chargedAtom: /\[[A-Z][a-z]?[0-9]*[+-]\]/,
};

/**
 * Patterns that indicate input is likely a molecule NAME, not SMILES.
 */
const NAME_PATTERNS = {
  // Contains spaces (SMILES never have spaces)
  hasSpaces: /\s/,
  
  // Starts with capital letter followed by lowercase (e.g., "Aspirin", "Gefitinib")
  properNoun: /^[A-Z][a-z]+/,
  
  // Contains common drug name suffixes
  drugSuffix: /(mab|nib|tinib|pril|olol|statin|mycin|cillin|oxacin)$/i,
  
  // Contains hyphens with spaces (e.g., "5-fluorouracil")
  hyphenatedName: /\w+-\w+/,
  
  // Common chemical name patterns (e.g., "2-methylpropane")
  chemicalName: /^\d+-[a-z]/i,
};

/**
 * Basic SMILES validation rules.
 */
function validateSMILESStructure(input: string): { valid: boolean; reason: string } {
  // Rule 1: Must contain only valid SMILES characters
  if (!SMILES_CHARS.test(input)) {
    return { valid: false, reason: "Contains invalid characters for SMILES" };
  }
  
  // Rule 2: Must have at least one atom (C, N, O, S, P, or aromatic)
  if (!/[CNOSPcnosp]/.test(input)) {
    return { valid: false, reason: "No atoms found" };
  }
  
  // Rule 3: Balanced brackets
  const openBrackets = (input.match(/\[/g) || []).length;
  const closeBrackets = (input.match(/\]/g) || []).length;
  if (openBrackets !== closeBrackets) {
    return { valid: false, reason: "Unbalanced square brackets" };
  }
  
  // Rule 4: Balanced parentheses
  const openParens = (input.match(/\(/g) || []).length;
  const closeParens = (input.match(/\)/g) || []).length;
  if (openParens !== closeParens) {
    return { valid: false, reason: "Unbalanced parentheses" };
  }
  
  // Rule 5: Must be at least 3 characters (e.g., "CCO" for ethanol)
  if (input.length < 3) {
    return { valid: false, reason: "Too short to be a valid SMILES" };
  }
  
  return { valid: true, reason: "Passes basic SMILES validation" };
}

/**
 * Calculate confidence score for SMILES classification.
 */
function calculateSMILESConfidence(input: string): "high" | "medium" | "low" {
  let score = 0;
  
  // High confidence indicators
  if (SMILES_PATTERNS.aromaticRing.test(input)) score += 3;
  if (SMILES_PATTERNS.aliphaticRing.test(input)) score += 3;
  if (SMILES_PATTERNS.multipleBonds.test(input)) score += 2;
  if (SMILES_PATTERNS.branching.test(input)) score += 2;
  if (SMILES_PATTERNS.ringClosure.test(input)) score += 2;
  if (SMILES_PATTERNS.stereo.test(input)) score += 1;
  if (SMILES_PATTERNS.chargedAtom.test(input)) score += 1;
  
  // Negative indicators (suggests it's a name)
  if (NAME_PATTERNS.hasSpaces.test(input)) score -= 5;
  if (NAME_PATTERNS.properNoun.test(input)) score -= 2;
  if (NAME_PATTERNS.drugSuffix.test(input)) score -= 3;
  
  if (score >= 5) return "high";
  if (score >= 2) return "medium";
  return "low";
}

/**
 * Classify user input as SMILES, name, or invalid.
 * 
 * @param input - User-provided string (SMILES or molecule name)
 * @returns Classification with confidence level
 */
export function classifyMoleculeInput(input: string): InputClassification {
  const trimmed = input.trim();
  
  // Empty input
  if (!trimmed) {
    return {
      type: "invalid",
      confidence: "high",
      reason: "Empty input",
    };
  }
  
  // Check for obvious name patterns first
  if (NAME_PATTERNS.hasSpaces.test(trimmed)) {
    return {
      type: "name",
      confidence: "high",
      reason: "Contains spaces (SMILES never have spaces)",
    };
  }
  
  if (NAME_PATTERNS.drugSuffix.test(trimmed) && NAME_PATTERNS.properNoun.test(trimmed)) {
    return {
      type: "name",
      confidence: "high",
      reason: "Matches drug name pattern",
    };
  }
  
  // Validate SMILES structure
  const validation = validateSMILESStructure(trimmed);
  
  if (!validation.valid) {
    // Failed SMILES validation, likely a name
    return {
      type: "name",
      confidence: "medium",
      reason: `Not valid SMILES: ${validation.reason}`,
    };
  }
  
  // Passed basic validation, calculate confidence
  const confidence = calculateSMILESConfidence(trimmed);
  
  return {
    type: "smiles",
    confidence,
    reason: validation.reason,
  };
}

/**
 * Normalize SMILES string for consistent processing.
 * Removes whitespace and converts to uppercase where appropriate.
 */
export function normalizeSMILES(smiles: string): string {
  return smiles.trim().replace(/\s+/g, "");
}

/**
 * Check if input looks like a PubChem CID (numeric ID).
 */
export function isPubChemCID(input: string): boolean {
  return /^\d+$/.test(input.trim()) && parseInt(input.trim()) > 0;
}

/**
 * Comprehensive input classification with all checks.
 */
export interface MoleculeInputAnalysis {
  classification: InputClassification;
  normalized: string;
  isPubChemCID: boolean;
  suggestions: string[];
}

export function analyzeMoleculeInput(input: string): MoleculeInputAnalysis {
  const normalized = normalizeSMILES(input);
  const classification = classifyMoleculeInput(normalized);
  const isCID = isPubChemCID(normalized);
  const suggestions: string[] = [];
  
  // Generate suggestions based on classification
  if (classification.type === "smiles" && classification.confidence === "low") {
    suggestions.push("SMILES confidence is low. If this is a molecule name, try searching by name instead.");
  }
  
  if (classification.type === "name" && classification.confidence === "low") {
    suggestions.push("Input looks like a name but confidence is low. If this is SMILES, check for typos.");
  }
  
  if (classification.type === "invalid") {
    suggestions.push("Input is invalid. Please provide a valid SMILES string or molecule name.");
  }
  
  if (isCID) {
    suggestions.push("Input looks like a PubChem CID. Will search by CID.");
  }
  
  return {
    classification,
    normalized,
    isPubChemCID: isCID,
    suggestions,
  };
}
