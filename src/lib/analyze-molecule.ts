/**
 * Unified molecule analysis — prefer engine API, fallback to client PubChem.
 * Single entry point for workspace, screening, and XAI.
 */
import { analyzeMoleculeEngine, type EngineAnalysis } from "./engine-api";
import { generateMoleculeResultReal, type MoleculeResult } from "@/data/targets";

export type AnalysisSource = "engine" | "client_fallback";

export interface UnifiedAnalysisResult {
  source: AnalysisSource;
  engine?: EngineAnalysis;
  molecule?: MoleculeResult;
  scientific?: EngineAnalysis["analysis"] extends infer A
    ? A extends { scientific?: infer S } ? S : never
    : never;
}

export function engineAnalysisToMoleculeResult(
  analysis: NonNullable<EngineAnalysis["analysis"]>
): MoleculeResult {
  const d = analysis.descriptors;
  const violations =
    ((d.molecularWeight as number) > 500 ? 1 : 0) +
    ((d.logP as number) > 5 ? 1 : 0) +
    ((d.hBondDonors as number) > 5 ? 1 : 0) +
    ((d.hBondAcceptors as number) > 10 ? 1 : 0);

  return {
    smiles: analysis.smiles,
    name: analysis.name,
    drugClass: "Unknown",
    tags: [],
    gnnEngagementScore: analysis.engagement.value,
    engagementScoreLabel: analysis.engagement.label,
    engagementScoreProvenance: analysis.engagement.disclaimer,
    mw: d.molecularWeight as number,
    logp: d.logP as number,
    hDonors: d.hBondDonors as number,
    hAcceptors: d.hBondAcceptors as number,
    rotBonds: (d.rotatableBonds as number) ?? 0,
    tpsa: d.tpsa as number,
    violations,
    drugLike: violations <= 1,
    dataSource: "pubchem",
    admet: {
      solubility: "moderate",
      permeability: "moderate",
      cyp3a4Substrate: false,
      cyp3a4Inhibitor: false,
      hergRisk: "low",
      hepatotoxicity: "low",
      admetConfidence: analysis.engagement.source,
      admetNote: analysis.engagement.disclaimer,
    },
    offTargets: [],
    similarDrugs: [],
    ddiWarnings: [],
    organWarnings: [],
    xai: {
      reasoning: `[${analysis.engagement.source}] confidence ${analysis.engagement.confidence}. ${analysis.engagement.disclaimer}`,
      topFeatures: analysis.recommendations?.slice(0, 5).map((r, i) => ({
        feature: r.type,
        impact: r.severity === "high" ? 0.8 : r.severity === "medium" ? 0.5 : 0.2,
      })) ?? [],
    },
  };
}

export async function analyzeMoleculeUnified(
  smiles: string,
  targetName?: string
): Promise<UnifiedAnalysisResult> {
  try {
    const engine = await analyzeMoleculeEngine(smiles, targetName);
    if (engine.success && engine.analysis) {
      return {
        source: "engine",
        engine,
        molecule: engineAnalysisToMoleculeResult(engine.analysis),
        scientific: engine.analysis.scientific,
      };
    }
  } catch {
    /* fall through */
  }

  const molecule = await generateMoleculeResultReal(smiles);
  return { source: "client_fallback", molecule: molecule ?? undefined };
}
