/**
 * Binding Realism Engine
 *
 * Scientifically skeptical binding-affinity assessment that combines:
 *   1. Data grounding   (PubChem + ChEMBL + UniProt experimental evidence)
 *   2. Similarity check (Tanimoto vs known active ligands of the target)
 *   3. Structural compatibility (target-class pharmacophore profile)
 *   4. Reality filter   (downgrades model predictions when evidence is absent)
 *
 * Output is intentionally conservative: never claims "strong binding" without
 * experimental evidence OR very high similarity to a known active.
 */

import { groundMoleculeTarget, type GroundingReport } from "./grounding";
import { evaluateCompatibility, type CompatibilityReport } from "./compatibility";

export type BindingLikelihood = "High" | "Moderate" | "Low" | "Unlikely";
export type RealismConfidence = "High" | "Medium" | "Low";

export interface RealismReport {
  query: { molecule: string; target: string };
  grounding: GroundingReport;
  compatibility: CompatibilityReport | null;

  /** Raw GAT/model-style score in [0,1] — treat as probabilistic, not factual */
  rawModelScore: number;
  /** Score after the reality filter is applied */
  adjustedModelScore: number;

  bindingLikelihood: BindingLikelihood;
  confidence: RealismConfidence;

  knownInteractionStatement: string;
  reasoning: string[];
  warnings: string[];
  suggestions: string[];
  classMismatch: boolean;
  sources: string[];
}

// ---------- Reality filter ----------

interface FilterInput {
  knownInteraction: boolean;
  similarityBest: number | null;       // 0..100
  compatibilityNumeric: number | null; // 0..100
  classMismatch: boolean;
  rawModel: number;                    // 0..1
}

function applyRealityFilter(i: FilterInput): {
  adjusted: number;
  likelihood: BindingLikelihood;
  confidence: RealismConfidence;
  warnings: string[];
} {
  const warnings: string[] = [];
  let s = i.rawModel;

  // Hard rule: structural class mismatch → cap as Unlikely regardless of model
  if (i.classMismatch) {
    warnings.push(
      "Structural class mismatch: molecule does not belong to the ligand class typical for this target. Model output overridden.",
    );
    return { adjusted: Math.min(s, 0.15), likelihood: "Unlikely", confidence: "High", warnings };
  }

  // Downgrade if no experimental evidence
  if (!i.knownInteraction) {
    s *= 0.6;
    warnings.push("No experimental evidence found for this molecule–target pair.");
  }

  // Downgrade further if low similarity to known actives
  if (i.similarityBest != null) {
    if (i.similarityBest < 30) {
      s *= 0.5;
      warnings.push(`Structurally dissimilar to known binders (Tanimoto ${Math.round(i.similarityBest)}%).`);
    } else if (i.similarityBest < 50) {
      s *= 0.8;
      warnings.push(`Only modest similarity to known binders (Tanimoto ${Math.round(i.similarityBest)}%).`);
    }
  } else {
    // Unknown similarity — be conservative
    s *= 0.85;
  }

  // Compatibility profile penalty
  if (i.compatibilityNumeric != null && i.compatibilityNumeric < 40) {
    s *= 0.7;
    warnings.push("Physicochemistry / pharmacophore profile is poorly matched to the target class.");
  }

  // Map to qualitative likelihood — "High" requires evidence OR very high similarity
  const evidenceBacked = i.knownInteraction || (i.similarityBest != null && i.similarityBest >= 80);

  let likelihood: BindingLikelihood;
  if (evidenceBacked && s >= 0.7) likelihood = "High";
  else if (s >= 0.55) likelihood = "Moderate";
  else if (s >= 0.3) likelihood = "Low";
  else likelihood = "Unlikely";

  // Confidence comes from the *strength of evidence*, not the score
  let confidence: RealismConfidence = "Low";
  if (i.knownInteraction) confidence = "High";
  else if (i.similarityBest != null && i.similarityBest >= 60) confidence = "Medium";
  else if (i.compatibilityNumeric != null && i.compatibilityNumeric >= 60) confidence = "Medium";

  return { adjusted: Math.max(0, Math.min(1, s)), likelihood, confidence, warnings };
}

// ---------- Suggestions ----------

function buildSuggestions(c: CompatibilityReport | null, classMismatch: boolean): string[] {
  const out: string[] = [];
  if (!c) return out;
  if (classMismatch) {
    out.push(
      `Consider switching to a ${c.target.requires.ligandClassHint.replace("_", " ")} scaffold — the current molecule's class does not match what this target binds.`,
    );
  }
  if (c.missingFeatures.length > 0) {
    out.push("Introduce or preserve the following features expected by this target class:");
    c.missingFeatures.slice(0, 6).forEach((m) => out.push(`  • ${m}`));
  }
  const p = c.molecule.properties;
  const r = c.target.requires;
  if (p.logp < r.typicalLogP[0]) out.push(`Increase lipophilicity (LogP ${p.logp} → ${r.typicalLogP[0]}–${r.typicalLogP[1]}) to better fill the ${r.hydrophobicPocket} pocket.`);
  if (p.logp > r.typicalLogP[1]) out.push(`Reduce lipophilicity (LogP ${p.logp}) — risk of off-target promiscuity.`);
  if (p.tpsa > r.typicalTPSA[1]) out.push(`Reduce TPSA (${p.tpsa} Å²) — too polar for this binding site.`);
  if (p.tpsa < r.typicalTPSA[0]) out.push(`Add polar contacts (TPSA ${p.tpsa} Å² is too low for the expected H-bond pattern).`);
  return out;
}

// ---------- Public entry ----------

export async function assessBindingRealism(
  molecule: string,
  target: string,
  options?: { rawModelScore?: number },
): Promise<RealismReport> {
  // Run grounding + compatibility in parallel — neither depends on the other
  const [grounding, compatibilityResult] = await Promise.all([
    groundMoleculeTarget(molecule, target),
    evaluateCompatibility(molecule, target).catch(() => null),
  ]);

  const compatibility = compatibilityResult;
  const classMismatch = compatibility?.mismatched ?? false;
  const similarityBest =
    compatibility?.similarity.observedTopPercent ??
    (grounding.similarLigands[0]?.similarity ?? null);

  // Synthetic "model score" — in production this would be the GAT model output.
  // We seed it deterministically from the compatibility numeric so the demo is
  // stable, but the reality filter is what really matters.
  const rawModelScore = options?.rawModelScore ?? Math.min(0.95, 0.35 + (compatibility?.scoreNumeric ?? 50) / 200);

  const filtered = applyRealityFilter({
    knownInteraction: grounding.knownInteraction,
    similarityBest,
    compatibilityNumeric: compatibility?.scoreNumeric ?? null,
    classMismatch,
    rawModel: rawModelScore,
  });

  // Compose reasoning narrative — grounded chemistry, not vague language
  const reasoning: string[] = [];

  reasoning.push(
    grounding.knownInteraction
      ? `Experimental evidence found: ${grounding.experimentalEvidence.length} bioactivity record(s) in ChEMBL (IC50/Ki/EC50/Kd) for ${grounding.molecule.query} against ${grounding.target.name}.`
      : `No validated interaction record found in ChEMBL/BindingDB for ${molecule} against ${target}.`,
  );

  if (similarityBest != null) {
    reasoning.push(
      similarityBest >= 50
        ? `Structurally similar to known actives of this target (best Tanimoto ${Math.round(similarityBest)}%).`
        : `Low structural similarity to known actives (best Tanimoto ${Math.round(similarityBest)}%) — does not match the active chemotype.`,
    );
  }

  if (compatibility) {
    reasoning.push(
      `Target class profile: ${compatibility.target.label}. Required pharmacophores: ${compatibility.target.requires.pharmacophores.join(", ") || "—"}.`,
    );
    reasoning.push(
      `Compatibility score: ${compatibility.scoreNumeric}/100 (${compatibility.score}). ` +
      (compatibility.missingFeatures.length > 0
        ? `Missing key features: ${compatibility.missingFeatures.slice(0, 4).join("; ")}.`
        : "No critical features missing."),
    );
  }

  reasoning.push(
    `Model raw score: ${(rawModelScore * 100).toFixed(0)}% — treated as probabilistic. After reality filter: ${(filtered.adjusted * 100).toFixed(0)}%.`,
  );

  if (filtered.likelihood !== "High" && rawModelScore >= 0.7) {
    filtered.warnings.unshift(
      "Model predicted a high score, but it conflicts with the available biological evidence — flagged.",
    );
  }

  const knownInteractionStatement = grounding.knownInteraction
    ? `YES — known interaction. ${grounding.experimentalEvidence
        .slice(0, 3)
        .map((a) => `${a.type}=${a.value ?? "?"} ${a.units ?? ""}`.trim())
        .join(", ")}`
    : "NO known evidence of binding to this target.";

  const sources = Array.from(new Set([...(grounding.sources || []), ...(compatibility?.sources || [])]));

  return {
    query: { molecule, target },
    grounding,
    compatibility,
    rawModelScore,
    adjustedModelScore: filtered.adjusted,
    bindingLikelihood: filtered.likelihood,
    confidence: filtered.confidence,
    knownInteractionStatement,
    reasoning,
    warnings: filtered.warnings,
    suggestions: buildSuggestions(compatibility, classMismatch),
    classMismatch,
    sources,
  };
}
