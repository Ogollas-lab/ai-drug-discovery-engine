/**
 * Disease-Specific Drug Prediction Engine
 * Adjusts scoring, risk flags, and recommendations based on disease context.
 */

import { type PubChemResult } from "@/lib/pubchem";
import {
  predictDrugSuccess,
  type PredictionInput,
  type PredictionOutput,
  type FeatureContribution,
} from "@/lib/drug-prediction";
import { type DiseaseModel } from "@/data/disease-models";

export interface DiseasePredictionInput extends PredictionInput {
  disease: DiseaseModel;
}

export interface DiseasePredictionOutput extends PredictionOutput {
  diseaseContext: {
    diseaseId: string;
    diseaseName: string;
    relevantTargets: string[];
    datasetsCited: string[];
    africanContext: string[];
    diseaseSpecificFlags: string[];
  };
}

function clamp(v: number): number {
  return Math.max(0, Math.min(100, v));
}

/**
 * Runs the base prediction then applies disease-specific adjustments.
 */
export function predictForDisease(input: DiseasePredictionInput): DiseasePredictionOutput {
  const { molecule, disease, simulationData } = input;

  // Run base prediction
  const base = predictDrugSuccess({ molecule, simulationData });

  const profile = disease.scoringProfile;

  // --- Recalculate efficacy/safety with disease-specific weights ---
  // Extract base feature scores from contributions
  const getScore = (feature: string) => {
    const c = base.featureContributions.find((f) => f.feature === feature);
    return c ? (c.impact === "positive" ? 85 : c.impact === "neutral" ? 55 : 30) : 70;
  };

  const mwInRange = molecule.mw >= profile.mwRange[0] && molecule.mw <= profile.mwRange[1];
  const logpInRange = molecule.logp >= profile.logpRange[0] && molecule.logp <= profile.logpRange[1];
  const tpsaOk = molecule.tpsa <= profile.tpsaMax;

  // Disease-adjusted MW score
  const mwScore = mwInRange ? 92 : clamp(60 - Math.abs(molecule.mw - (profile.mwRange[0] + profile.mwRange[1]) / 2) * 0.15);
  // Disease-adjusted LogP score
  const logpScore = logpInRange ? 88 : clamp(50 - Math.abs(molecule.logp - (profile.logpRange[0] + profile.logpRange[1]) / 2) * 10);
  // Disease-adjusted TPSA score
  const tpsaScore = tpsaOk ? 90 : clamp(90 - (molecule.tpsa - profile.tpsaMax) * 0.8);

  const bindingScore = getScore("Binding Affinity");
  const selectivityScore = getScore("Target Selectivity");
  const metabScore = getScore("Metabolic Stability");

  // Recalculate with disease weights
  const efficacyScore = clamp(
    mwScore * 0.15 +
    logpScore * 0.20 +
    tpsaScore * 0.15 +
    bindingScore * profile.bindingAffinityImportance +
    selectivityScore * (1 - profile.bindingAffinityImportance - 0.50)
  );

  const safetyScore = clamp(
    (molecule.hDonors <= 5 ? 92 : 40) * 0.15 +
    (molecule.hAcceptors <= 10 ? 90 : 40) * 0.15 +
    tpsaScore * 0.20 +
    (molecule.rotBonds <= 10 ? 88 : 40) * 0.15 +
    metabScore * profile.metabolicStabilityImportance +
    (logpInRange ? 85 : 30) * 0.15
  );

  const overallScore = clamp(
    efficacyScore * profile.efficacyWeight + safetyScore * profile.safetyWeight
  );

  // --- Disease-specific risk flags ---
  const diseaseFlags: string[] = [];

  for (const check of disease.riskChecks) {
    let triggered = false;
    if (check.condition === "mw > 500" && molecule.mw > 500) triggered = true;
    if (check.condition === "mw > 600" && molecule.mw > 600) triggered = true;
    if (check.condition === "mw > 700" && molecule.mw > 700) triggered = true;
    if (check.condition === "mw > 800" && molecule.mw > 800) triggered = true;
    if (check.condition === "logp > 5" && molecule.logp > 5) triggered = true;
    if (check.condition === "logp < -1" && molecule.logp < -1) triggered = true;
    if (check.condition === "tpsa > 140" && molecule.tpsa > 140) triggered = true;
    if (check.condition === "tpsa > 200" && molecule.tpsa > 200) triggered = true;
    if (check.condition === "rotBonds > 10" && molecule.rotBonds > 10) triggered = true;
    if (check.condition === "hepatotoxicity" && molecule.logp > 4) triggered = true;
    if (check.condition === "cyp3a4" && molecule.logp > 3) triggered = true;
    if (check.condition === "renal" && molecule.mw > 400 && molecule.tpsa < 60) triggered = true;
    if (check.condition === "myelosuppression" && molecule.mw < 200) triggered = true;
    if (triggered) diseaseFlags.push(`[${check.severity.toUpperCase()}] ${check.flag}`);
  }

  // Oral bioavailability check
  if (profile.oralBioavailabilityPriority === "critical") {
    const lipinskiViolations = [
      molecule.mw > 500, molecule.logp > 5, molecule.hDonors > 5, molecule.hAcceptors > 10,
    ].filter(Boolean).length;
    if (lipinskiViolations >= 2) {
      diseaseFlags.push(`[CRITICAL] Multiple Lipinski violations — oral bioavailability is critical for ${disease.name} treatment in resource-limited settings`);
    }
  }

  // BBB check
  if (profile.requiresBBBPenetration && molecule.tpsa > 90) {
    diseaseFlags.push(`[WARNING] TPSA ${molecule.tpsa.toFixed(0)} Å² may limit CNS penetration — relevant for ${disease.name}`);
  }

  // Additional disease-specific contributions
  const diseaseContributions: FeatureContribution[] = [
    ...base.featureContributions,
    {
      feature: `${disease.name} MW Fit`,
      value: molecule.mw,
      weight: 0.10,
      impact: mwInRange ? "positive" : "negative",
      description: `${mwInRange ? "Within" : "Outside"} optimal range (${profile.mwRange[0]}–${profile.mwRange[1]} Da) for ${disease.name}`,
    },
    {
      feature: "Oral Bioavailability Priority",
      value: profile.oralBioavailabilityPriority === "critical" ? 1 : 0.5,
      weight: 0.08,
      impact: molecule.tpsa <= profile.tpsaMax && molecule.mw <= profile.mwRange[1] ? "positive" : "negative",
      description: `${profile.oralBioavailabilityPriority} priority for ${disease.name} treatment setting`,
    },
  ];

  // Combine risk flags
  const allRiskFlags = [...new Set([...base.riskFlags, ...diseaseFlags])];

  // Disease-specific recommendations
  const recommendations = [...disease.contextualGuidance.slice(0, 3)];
  if (overallScore >= 75) {
    recommendations.push(`Strong candidate for ${disease.name} — proceed to target-specific in-vitro assays`);
  } else if (overallScore >= 50) {
    recommendations.push(`Moderate potential for ${disease.name} — structural optimization recommended`);
  } else {
    recommendations.push(`Low suitability for ${disease.name} — consider alternative scaffolds`);
  }

  // Verdict
  const lipinskiViolations = [
    molecule.mw > 500, molecule.logp > 5, molecule.hDonors > 5, molecule.hAcceptors > 10,
  ].filter(Boolean).length;

  const verdict: PredictionOutput["verdict"] =
    lipinskiViolations >= 3 ? "Fail" :
    overallScore >= 75 ? "High Potential" :
    overallScore >= 50 ? "Moderate" :
    "Low Potential";

  // Confidence adjustment based on disease dataset size
  const totalCompounds = disease.datasets.reduce((sum, d) => sum + d.compounds, 0);
  const datasetBoost = totalCompounds > 100000 ? 5 : totalCompounds > 10000 ? 3 : 0;
  const confidence = clamp(base.confidence + datasetBoost);

  return {
    overallScore: Math.round(overallScore * 10) / 10,
    efficacyScore: Math.round(efficacyScore * 10) / 10,
    safetyScore: Math.round(safetyScore * 10) / 10,
    confidence: Math.round(confidence * 10) / 10,
    verdict,
    featureContributions: diseaseContributions,
    modelMetrics: {
      ...base.modelMetrics,
      dataPoints: base.modelMetrics.dataPoints + totalCompounds,
    },
    riskFlags: allRiskFlags,
    recommendations,
    diseaseContext: {
      diseaseId: disease.id,
      diseaseName: disease.name,
      relevantTargets: disease.targets.map((t) => `${t.gene} (${t.name})`),
      datasetsCited: disease.datasets.map((d) => `${d.name} — ${d.compounds.toLocaleString()} compounds`),
      africanContext: [disease.epidemiology, disease.prevalence],
      diseaseSpecificFlags: diseaseFlags,
    },
  };
}
