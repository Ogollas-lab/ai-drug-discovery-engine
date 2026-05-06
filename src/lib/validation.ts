/**
 * Drug Discovery Validation Scientist
 *
 * Cross-checks the three pipeline stages and produces a conservative
 * final classification with explicit failure-mode reasoning.
 *
 *   Stage 1: Grounding         (experimental evidence — ChEMBL/PubChem/UniProt)
 *   Stage 2: Compatibility     (target-class pharmacophore profile)
 *   Stage 3: GAT model score   (probabilistic only; not biological truth)
 */

import { groundMoleculeTarget, type GroundingReport } from "./grounding";
import { evaluateCompatibility, type CompatibilityReport } from "./compatibility";
import { runGATPrediction, type GATPredictionOutput } from "./gat-predictor";

export type BindingLikelihood =
  | "Very High"
  | "High"
  | "Moderate"
  | "Low"
  | "Unlikely";

export type ValidationConfidence = "High" | "Medium" | "Low";

export interface Contradiction {
  severity: "critical" | "warning" | "info";
  flag: "FLAGGED" | "UNRELIABLE" | "NOTE";
  message: string;
}

export interface KnownLigandComparison {
  chemblId: string;
  similarity: number;       // 0..100
  smiles?: string;
  name?: string;
  verdict: "highly similar" | "moderately similar" | "weakly similar";
}

export interface ValidationReport {
  query: { molecule: string; target: string };

  grounding: GroundingReport;
  compatibility: CompatibilityReport | null;
  gat: GATPredictionOutput | null;

  /** Final, evidence-aware verdict */
  bindingLikelihood: BindingLikelihood;
  confidence: ValidationConfidence;

  /** ML score actually relied on after biological-plausibility filtering */
  adjustedScore: number; // 0..1

  consistency: {
    matchesEvidence: boolean | null;     // null = no evidence to compare against
    matchesLigandClass: boolean;
  };
  contradictions: Contradiction[];
  reasoning: string[];
  whyWrong: string[];                    // "Why this prediction may be wrong"
  ligandComparisons: KnownLigandComparison[];
  classMismatch: boolean;
  sources: string[];
}

// ---------- helpers ----------

function classifyLikelihood(args: {
  knownInteraction: boolean;
  bestSimilarity: number | null;     // 0..100
  compatibility: number | null;       // 0..100
  classMismatch: boolean;
  adjusted: number;                   // 0..1
}): { likelihood: BindingLikelihood; confidence: ValidationConfidence } {
  if (args.classMismatch) {
    return { likelihood: "Unlikely", confidence: "High" };
  }

  // Very High requires direct experimental support
  if (args.knownInteraction && args.adjusted >= 0.6) {
    return { likelihood: "Very High", confidence: "High" };
  }
  if (args.knownInteraction) {
    return { likelihood: "High", confidence: "High" };
  }

  // No experimental evidence — must lean on similarity + compatibility
  const sim = args.bestSimilarity ?? 0;
  const compat = args.compatibility ?? 0;

  if (sim >= 75 && compat >= 60) {
    return { likelihood: "High", confidence: "Medium" };
  }
  if (sim >= 50 || compat >= 60) {
    return { likelihood: "Moderate", confidence: "Medium" };
  }
  if (sim >= 30 || compat >= 40) {
    return { likelihood: "Low", confidence: "Low" };
  }
  return { likelihood: "Unlikely", confidence: "Low" };
}

function applyPlausibilityFilter(args: {
  rawScore: number;
  knownInteraction: boolean;
  bestSimilarity: number | null;
  compatibility: number | null;
  classMismatch: boolean;
}): number {
  let s = args.rawScore;
  if (args.classMismatch) return Math.min(s, 0.15);
  if (!args.knownInteraction) s *= 0.6;
  if (args.bestSimilarity == null) s *= 0.85;
  else if (args.bestSimilarity < 30) s *= 0.5;
  else if (args.bestSimilarity < 50) s *= 0.8;
  if (args.compatibility != null && args.compatibility < 40) s *= 0.7;
  return Math.max(0, Math.min(1, s));
}

function buildContradictions(args: {
  rawScore: number;
  adjusted: number;
  knownInteraction: boolean;
  compatibilityScore: number | null;
  bestSimilarity: number | null;
  classMismatch: boolean;
}): Contradiction[] {
  const out: Contradiction[] = [];

  if (args.classMismatch) {
    out.push({
      severity: "critical",
      flag: "FLAGGED",
      message:
        "Molecule class does not match the ligand class typical for this target — any high score should be considered unreliable.",
    });
  }

  if (args.rawScore >= 0.7 && !args.knownInteraction) {
    out.push({
      severity: "critical",
      flag: "FLAGGED",
      message:
        "High ML score with no experimental evidence in ChEMBL/BindingDB. Treat as a hypothesis, not a result.",
    });
  }

  if (
    args.rawScore >= 0.6 &&
    args.compatibilityScore != null &&
    args.compatibilityScore < 40
  ) {
    out.push({
      severity: "warning",
      flag: "UNRELIABLE",
      message:
        "ML score is elevated but the molecule's physicochemistry / pharmacophore profile is poorly matched to the target class.",
    });
  }

  if (
    args.rawScore >= 0.6 &&
    args.bestSimilarity != null &&
    args.bestSimilarity < 30
  ) {
    out.push({
      severity: "warning",
      flag: "UNRELIABLE",
      message: `ML score is elevated but structural similarity to known actives is low (Tanimoto ${Math.round(args.bestSimilarity)}%).`,
    });
  }

  if (args.knownInteraction && args.rawScore < 0.3) {
    out.push({
      severity: "warning",
      flag: "FLAGGED",
      message:
        "Experimental evidence exists for this pair but ML score is low — possible model false negative.",
    });
  }

  return out;
}

function buildWhyWrong(args: {
  knownInteraction: boolean;
  bestSimilarity: number | null;
  compatibility: number | null;
  classMismatch: boolean;
  uncertainty: GATPredictionOutput["uncertainty"] | null;
}): string[] {
  const w: string[] = [];
  if (!args.knownInteraction) {
    w.push("No validated ChEMBL/BindingDB record exists for this molecule–target pair, so the prediction is not anchored to experimental truth.");
  }
  if (args.bestSimilarity != null && args.bestSimilarity < 50) {
    w.push(`The molecule is structurally distant from known actives of this target (best Tanimoto ${Math.round(args.bestSimilarity)}%) — the model is extrapolating outside its training neighborhood.`);
  }
  if (args.bestSimilarity == null) {
    w.push("Similarity to known actives could not be confirmed against ChEMBL — the chemotype may be unprecedented for this target.");
  }
  if (args.compatibility != null && args.compatibility < 50) {
    w.push("The molecule's physicochemistry (MW / LogP / TPSA / pharmacophores) deviates from what this target class typically accepts.");
  }
  if (args.classMismatch) {
    w.push("The molecule's inferred ligand class differs from the target's expected ligand class (e.g., steroid vs. enzyme inhibitor) — binding is biologically implausible.");
  }
  if (args.uncertainty && args.uncertainty !== "Low") {
    w.push(`GAT ensemble uncertainty is ${args.uncertainty} — the model itself is not confident about this score.`);
  }
  if (w.length === 0) {
    w.push("Even with good structural support, ML scores reflect statistical patterns and may miss assay-specific effects (cellular permeability, off-target activity, metabolism).");
  }
  return w;
}

// ---------- public ----------

export async function runValidation(
  molecule: string,
  target: string,
): Promise<ValidationReport> {
  const [grounding, compatibility, gat] = await Promise.all([
    groundMoleculeTarget(molecule, target),
    evaluateCompatibility(molecule, target).catch(() => null),
    runGATPrediction({ query: molecule, targetId: target }).catch(() => null),
  ]);

  const classMismatch = compatibility?.mismatched ?? false;
  const bestSimilarity =
    compatibility?.similarity.observedTopPercent ??
    (grounding.similarLigands[0]?.similarity ?? null);

  const rawScore = gat?.affinityScore ?? 0.5;
  const adjusted = applyPlausibilityFilter({
    rawScore,
    knownInteraction: grounding.knownInteraction,
    bestSimilarity,
    compatibility: compatibility?.scoreNumeric ?? null,
    classMismatch,
  });

  const { likelihood, confidence } = classifyLikelihood({
    knownInteraction: grounding.knownInteraction,
    bestSimilarity,
    compatibility: compatibility?.scoreNumeric ?? null,
    classMismatch,
    adjusted,
  });

  const contradictions = buildContradictions({
    rawScore,
    adjusted,
    knownInteraction: grounding.knownInteraction,
    compatibilityScore: compatibility?.scoreNumeric ?? null,
    bestSimilarity,
    classMismatch,
  });

  const whyWrong = buildWhyWrong({
    knownInteraction: grounding.knownInteraction,
    bestSimilarity,
    compatibility: compatibility?.scoreNumeric ?? null,
    classMismatch,
    uncertainty: gat?.uncertainty ?? null,
  });

  const ligandComparisons: KnownLigandComparison[] = (
    grounding.similarLigands.length > 0
      ? grounding.similarLigands
      : (compatibility?.similarity.actives ?? []).map((a) => ({
          chemblId: a.chemblId,
          similarity: a.similarity,
          smiles: a.smiles,
        }))
  )
    .slice(0, 6)
    .map((l) => ({
      chemblId: l.chemblId,
      similarity: l.similarity,
      smiles: l.smiles,
      name: (l as any).name,
      verdict:
        l.similarity >= 75
          ? "highly similar"
          : l.similarity >= 50
          ? "moderately similar"
          : "weakly similar",
    }));

  const reasoning: string[] = [];
  reasoning.push(
    grounding.knownInteraction
      ? `Stage 1 — Grounding: experimental evidence found (${grounding.experimentalEvidence.length} ChEMBL bioactivity records).`
      : "Stage 1 — Grounding: no validated ChEMBL/BindingDB record for this pair.",
  );
  if (compatibility) {
    reasoning.push(
      `Stage 2 — Compatibility: ${compatibility.score} (${compatibility.scoreNumeric}/100) for target class "${compatibility.target.label}".${
        classMismatch ? " Class mismatch detected." : ""
      }`,
    );
  } else {
    reasoning.push("Stage 2 — Compatibility: could not be evaluated (molecule resolution failed).");
  }
  if (gat) {
    reasoning.push(
      `Stage 3 — GAT model: raw ${rawScore.toFixed(2)}, uncertainty ${gat.uncertainty}. After plausibility filter: ${adjusted.toFixed(2)}.`,
    );
  } else {
    reasoning.push("Stage 3 — GAT model: prediction unavailable.");
  }

  const matchesEvidence = grounding.knownInteraction
    ? rawScore >= 0.4
    : rawScore < 0.7
    ? null
    : false;

  const sources = Array.from(
    new Set([
      ...(grounding.sources || []),
      ...(compatibility?.sources || []),
      ...(gat ? ["GAT (internal model)"] : []),
    ]),
  );

  return {
    query: { molecule, target },
    grounding,
    compatibility,
    gat,
    bindingLikelihood: likelihood,
    confidence,
    adjustedScore: adjusted,
    consistency: {
      matchesEvidence,
      matchesLigandClass: !classMismatch,
    },
    contradictions,
    reasoning,
    whyWrong,
    ligandComparisons,
    classMismatch,
    sources,
  };
}
