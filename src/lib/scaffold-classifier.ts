/**
 * Scaffold Classifier
 * ───────────────────
 * Detects scaffold class from a SMILES string using structural pattern matching.
 * No RDKit WASM required — operates on the string representation.
 *
 * Accuracy is sufficient for conditioning biological inference models.
 * It is NOT a replacement for full Bemis–Murcko decomposition.
 *
 * Classes detected:
 *   kinase      — ATP-competitive kinase inhibitor scaffolds (quinazoline, pyrimidine, indazole, etc.)
 *   nsaid       — NSAID/COX scaffolds (arylacetic acid, arylpropionic acid, salicylate)
 *   cns         — CNS-penetrant scaffolds (xanthine, benzodiazepine, phenothiazine, indole)
 *   ion_channel — Ion channel modulators (dihydropyridine, benzothiazepine, piperidine-heavy)
 *   steroid     — Steroidal scaffolds (tetracyclic ring system)
 *   unknown     — Does not match any known class
 */

export type ScaffoldClass =
  | "kinase"
  | "nsaid"
  | "cns"
  | "ion_channel"
  | "steroid"
  | "unknown";

export interface ScaffoldProfile {
  scaffoldClass: ScaffoldClass;
  confidence: "high" | "medium" | "low";
  features: {
    hasAromaticRings: boolean;
    hasHeterocycle: boolean;
    hasCarboxylicAcid: boolean;
    hasBasicNitrogen: boolean;
    hasSulfonamide: boolean;
    hasHalogen: boolean;
    ringCount: number;
    aromaticRingCount: number;
  };
  classRationale: string;
}

// ─── Feature extractors ───────────────────────────────────────────────────────

function countPattern(smiles: string, pattern: RegExp): number {
  return (smiles.match(pattern) ?? []).length;
}

function hasPattern(smiles: string, pattern: RegExp): boolean {
  return pattern.test(smiles);
}

// Estimate aromatic ring count from lowercase aromatic atoms in ring closures.
// Each ring closure digit pair = one ring. Aromatic rings have ≥3 lowercase atoms.
function estimateAromaticRings(smiles: string): number {
  // Count ring closure digits on aromatic atoms (c, n, o, s followed by digit)
  const aromaticClosures = (smiles.match(/[cnos]\d/g) ?? []).length;
  return Math.floor(aromaticClosures / 2);
}

function estimateTotalRings(smiles: string): number {
  // Ring closure digits: each unique digit appears twice (open + close)
  const digits = smiles.match(/\d/g) ?? [];
  return Math.floor(digits.length / 2);
}

// ─── Scaffold class detectors ─────────────────────────────────────────────────

/**
 * Kinase inhibitor signatures:
 * - Quinazoline core: c1cnc2 or c1nc(N pattern
 * - Pyrimidine with aniline: Nc1ccccn1 or Nc1cccnc1
 * - Indazole: c1cnn or c1[nH]n
 * - Pyridopyrimidine: bicyclic N-rich aromatic
 * - Hinge-binding NH: NC(=O) or NHc aromatic
 * - Typically MW 350–550, LogP 2–5, multiple aromatic rings
 */
function isKinaseLike(smiles: string): boolean {
  const quinazoline = /c1cnc2[cn]c/i.test(smiles) || /c1nc(N|n)/i.test(smiles);
  const pyrimidineAniline = /Nc1cc[cn]c[cn]1/i.test(smiles) || /Nc1ccc[cn]c1/i.test(smiles);
  const indazole = /c1[nH]nc2/i.test(smiles) || /c1nn[cH]/i.test(smiles);
  const pyridine = countPattern(smiles, /n/g) >= 2; // ≥2 ring nitrogens
  const multiAromatic = estimateAromaticRings(smiles) >= 2;
  const hingeNH = /NC\(=O\)|NHc|c\(N\)/i.test(smiles);

  // Kinase: needs N-rich aromatic system + multi-ring + hinge motif
  return (quinazoline || pyrimidineAniline || indazole) && multiAromatic ||
    (pyridine && multiAromatic && hingeNH);
}

/**
 * NSAID signatures:
 * - Arylacetic acid: c1ccccc1CC(=O)O or c1ccccc1C(=O)O
 * - Arylpropionic acid: c1ccccc1C(C)C(=O)O (ibuprofen-type)
 * - Salicylate: OC(=O)c1ccccc1O
 * - Acetylsalicylate: CC(=O)Oc1ccccc1C(=O)O
 * - Sulfonamide COX-2: S(=O)(=O)N
 * - Carboxylic acid on aromatic: C(=O)O attached to ring
 */
function isNSAIDLike(smiles: string): boolean {
  const arylAcetic = /c1ccccc1CC\(=O\)O/i.test(smiles) || /c1ccc\(cc1\)CC\(=O\)O/i.test(smiles);
  const arylPropionic = /c1ccc\(cc1\)C\(C\)C\(=?O?\)=?O/i.test(smiles) || /c1ccccc1C\(C\)C\(O\)=O/i.test(smiles);
  const salicylate = /OC\(=O\)c1ccccc1O/i.test(smiles) || /CC\(=O\)Oc1ccccc1C\(=O\)O/i.test(smiles);
  const carboxylicAcid = /C\(=O\)O(?!C)/i.test(smiles) || /C\(O\)=O/i.test(smiles);
  const sulfonamideCOX2 = /S\(=O\)\(=O\)N/i.test(smiles);
  const singleRing = estimateAromaticRings(smiles) <= 2;

  return (arylAcetic || arylPropionic || salicylate) ||
    (carboxylicAcid && singleRing && !isKinaseLike(smiles)) ||
    (sulfonamideCOX2 && carboxylicAcid);
}

/**
 * CNS scaffold signatures:
 * - Xanthine: CN1C=NC2=C1C(=O)N (caffeine, theophylline)
 * - Benzodiazepine: c1ccc2c(c1)C(=O)N or C1=NC(=O)
 * - Phenothiazine: c1ccc2c(c1)Sc1ccccc1N2
 * - Indole: c1ccc2[nH]ccc2c1
 * - Tricyclic antidepressant: 3-ring system with N
 * - Diaryl ether: Ar-O-Ar (SSRI pharmacophore — fluoxetine, paroxetine)
 * - CNS lipophilic amine: secondary/tertiary amine + aromatic rings + no carboxylic acid
 * - Low TPSA profile (inferred from few polar groups)
 * - Typically: MW 150–400, LogP 1–4, TPSA < 90
 */
function isCNSLike(smiles: string): boolean {
  const xanthine = /CN1C=NC2=C1C\(=O\)N/i.test(smiles);
  const benzodiazepine = /C1=NC\(=O\)|c1ccc2c\(c1\)C\(=O\)N/i.test(smiles);
  const phenothiazine = /Sc1ccccc1N|c1ccc2c\(c1\)Sc/i.test(smiles);
  const indole = /c1ccc2\[nH\]ccc2c1/i.test(smiles) || /c1cc2cc\[nH\]c2cc1/i.test(smiles);
  const tricyclicN = estimateTotalRings(smiles) >= 3 && /N/i.test(smiles) && estimateAromaticRings(smiles) >= 2;
  
  // NEW: Diaryl ether detection (SSRI pharmacophore)
  const diarylEther = isDiarylEther(smiles);
  
  // NEW: CNS lipophilic amine detection (fluoxetine, atomoxetine, etc.)
  const lipophilicAmine = isCNSLipophilicAmine(smiles);

  return xanthine || benzodiazepine || phenothiazine || indole || tricyclicN || diarylEther || lipophilicAmine;
}

/**
 * Diaryl ether detection — SSRI pharmacophore.
 * Ar-O-Ar: two aromatic rings connected by oxygen.
 * Examples: fluoxetine, paroxetine, duloxetine.
 */
function isDiarylEther(smiles: string): boolean {
  // Pattern 1: c1ccccc1Oc1ccccc1 (simple diaryl ether)
  const simplePattern = /c1ccccc1Oc1ccccc1/i.test(smiles);
  
  // Pattern 2: c1ccc(Oc2ccccc2)cc1 (para-substituted diaryl ether)
  const paraPattern = /c1ccc\(Oc2ccccc2\)cc1/i.test(smiles);
  
  // Pattern 3: aromatic-O-aromatic (general)
  const generalPattern = /c[0-9]*c+Oc[0-9]*c+/i.test(smiles);
  
  return simplePattern || paraPattern || generalPattern;
}

/**
 * CNS lipophilic amine detection.
 * Secondary or tertiary amine + aromatic rings + no carboxylic acid.
 * Examples: fluoxetine, atomoxetine, sertraline.
 */
function isCNSLipophilicAmine(smiles: string): boolean {
  // Secondary amine patterns: CNCCC, CCNCC, C(N)C
  const secondaryAmine = /CNCCC|CCNCC|C\(N\)C|CNCC/i.test(smiles);
  
  // Tertiary amine patterns: CN(C)C, C(N(C)C)
  const tertiaryAmine = /CN\(C\)C|C\(N\(C\)C\)/i.test(smiles);
  
  // Must have at least one aromatic ring
  const hasAromaticRings = estimateAromaticRings(smiles) >= 1;
  
  // Must NOT have carboxylic acid (distinguishes from NSAIDs)
  const noCarboxylicAcid = !/C\(=O\)O(?!C)/i.test(smiles);
  
  return (secondaryAmine || tertiaryAmine) && hasAromaticRings && noCarboxylicAcid;
}

/**
 * Ion channel modulator signatures:
 * - Dihydropyridine (CCB): C1=C(C(=O)OC)NC(C)=C(C(=O)OC)C1
 * - Piperidine-heavy (hERG-like): N1CCCCC1 with aromatic
 * - Benzothiazepine: c1ccc2c(c1)SC(=O)N2
 * - Basic nitrogen + high aromatic count (hERG pharmacophore)
 */
function isIonChannelLike(smiles: string): boolean {
  const dihydropyridine = /C1=C\(C\(=O\)O\w\)NC\(C\)=C/i.test(smiles);
  const piperidine = /N1CCCCC1/i.test(smiles) && estimateAromaticRings(smiles) >= 1;
  const benzothiazepine = /c1ccc2c\(c1\)SC\(=O\)N2/i.test(smiles);
  const hergPharmacophore = /N1CCCCC1|N1CCNCC1/i.test(smiles) && estimateAromaticRings(smiles) >= 2;

  return dihydropyridine || benzothiazepine || (piperidine && !isKinaseLike(smiles)) || hergPharmacophore;
}

/**
 * Steroid signatures:
 * - Tetracyclic ring system: 4 fused rings
 * - Characteristic ABCD ring pattern
 */
function isSteroidLike(smiles: string): boolean {
  return estimateTotalRings(smiles) >= 4 && !isKinaseLike(smiles) && !isCNSLike(smiles);
}

// ─── Main classifier ──────────────────────────────────────────────────────────

export function classifyScaffold(smiles: string): ScaffoldProfile {
  const s = smiles.trim();

  const features = {
    hasAromaticRings: /[cnos]/.test(s),
    hasHeterocycle: /[nNsS]/.test(s) && /\d/.test(s),
    hasCarboxylicAcid: /C\(=O\)O(?!C)/i.test(s) || /C\(O\)=O/i.test(s),
    hasBasicNitrogen: /\bN\b(?!\(=O\))/.test(s) || /\[NH\]|\[NH2\]/.test(s),
    hasSulfonamide: /S\(=O\)\(=O\)N/i.test(s),
    hasHalogen: /[FClBrI]/.test(s),
    ringCount: estimateTotalRings(s),
    aromaticRingCount: estimateAromaticRings(s),
  };

  // Priority order: kinase > NSAID > CNS > ion_channel > steroid > unknown
  if (isKinaseLike(s)) {
    return {
      scaffoldClass: "kinase",
      confidence: "high",
      features,
      classRationale: "N-rich bicyclic aromatic system with hinge-binding motif — consistent with ATP-competitive kinase inhibitor pharmacophore",
    };
  }
  if (isNSAIDLike(s)) {
    return {
      scaffoldClass: "nsaid",
      confidence: "high",
      features,
      classRationale: "Aryl carboxylic acid or sulfonamide motif on aromatic ring — consistent with COX-inhibitor pharmacophore",
    };
  }
  if (isCNSLike(s)) {
    // Determine specific CNS subclass for better rationale
    const isDiaryl = isDiarylEther(s);
    const isLipophilicAmine = isCNSLipophilicAmine(s);
    
    let rationale = "CNS-penetrant scaffold detected";
    let confidence: "high" | "medium" | "low" = "medium";
    
    if (isDiaryl && isLipophilicAmine) {
      rationale = "Diaryl ether with lipophilic amine — consistent with SSRI/SNRI pharmacophore (fluoxetine-like)";
      confidence = "high";
    } else if (isDiaryl) {
      rationale = "Diaryl ether scaffold — consistent with CNS-active pharmacophore";
      confidence = "high";
    } else if (isLipophilicAmine) {
      rationale = "Lipophilic amine with aromatic system — consistent with CNS-penetrant pharmacophore";
      confidence = "medium";
    } else if (/CN1C=NC2=C1C\(=O\)N/i.test(s)) {
      rationale = "Xanthine scaffold — consistent with CNS stimulant pharmacophore (caffeine-like)";
      confidence = "high";
    } else {
      rationale = "Xanthine, indole, or tricyclic N-containing scaffold — consistent with CNS-penetrant pharmacophore";
    }
    
    return {
      scaffoldClass: "cns",
      confidence,
      features,
      classRationale: rationale,
    };
  }
  if (isIonChannelLike(s)) {
    return {
      scaffoldClass: "ion_channel",
      confidence: "medium",
      features,
      classRationale: "Piperidine or dihydropyridine motif with aromatic system — consistent with ion channel modulator pharmacophore",
    };
  }
  if (isSteroidLike(s)) {
    return {
      scaffoldClass: "steroid",
      confidence: "medium",
      features,
      classRationale: "Tetracyclic ring system — consistent with steroidal scaffold",
    };
  }

  return {
    scaffoldClass: "unknown",
    confidence: "low",
    features,
    classRationale: "No recognised pharmacophore pattern detected — using physicochemical property-based inference only",
  };
}
