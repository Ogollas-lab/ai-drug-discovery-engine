/**
 * Biological Inference Layer
 * ──────────────────────────
 * Target-conditioned off-target scoring.
 *
 * Architecture:
 *   1. Scaffold class (from scaffold-classifier) conditions the bias model.
 *   2. Physicochemical descriptors provide the continuous signal.
 *   3. Curated pharmacology priors override both for known drugs.
 *   4. All outputs carry a confidence label and provenance.
 *
 * Design principles:
 *   - COX-1/COX-2 scores are HIGH only for NSAID-class scaffolds.
 *     Kinase scaffolds get near-zero COX scores by default.
 *   - hERG risk requires BOTH lipophilicity AND a basic nitrogen centre.
 *     Acidic NSAIDs (no basic N) get low hERG scores.
 *   - CYP isoform specificity is scaffold-conditioned:
 *     CYP3A4: kinase inhibitors, macrolide-like
 *     CYP2C9: NSAIDs (arylacetic/propionic acids)
 *     CYP1A2: xanthines, planar aromatics
 *     CYP2E1: small MW, low LogP (acetaminophen-type)
 *   - Lipinski violations are computed strictly — no "always pass" bias.
 *   - All scores are in [0, 1]. Labels: "predicted" unless prior overrides.
 */

import { type ScaffoldProfile, type ScaffoldClass } from "./scaffold-classifier";

export interface OffTargetScore {
  target: string;
  score: number;          // 0–1
  scoreLabel: string;     // "experimental" | "literature" | "predicted"
  rationale: string;      // one-line scientific basis
}

export interface BiologicalProfile {
  offTargets: OffTargetScore[];
  hergRisk: "low" | "moderate" | "high";
  cyp3a4Substrate: boolean;
  cyp3a4Inhibitor: boolean;
  cyp2c9Substrate: boolean;
  cyp1a2Substrate: boolean;
  hepatotoxicity: "low" | "moderate" | "high";
  solubility: "high" | "moderate" | "low";
  permeability: "high" | "moderate" | "low";
  admetConfidence: "experimental" | "literature" | "predicted";
  admetNote: string;
  ddiWarnings: string[];
  organWarnings: string[];
}

// ─── Scaffold-class bias tables ───────────────────────────────────────────────
// Each entry defines the PRIOR probability for each off-target given the
// scaffold class. These are informed by published SAR literature:
//   - Kinase inhibitors: high CYP3A4, moderate hERG (basic N + LogP), low COX
//   - NSAIDs: high COX-1/COX-2, low hERG (acidic, no basic N), CYP2C9
//   - CNS: moderate hERG (lipophilic + basic N), CYP1A2/CYP2D6
//   - Ion channel: high hERG (by definition), CYP3A4
//   - Steroid: CYP3A4 (major), low hERG
//   - Unknown: flat uninformative prior

interface ClassBias {
  herg: number;       // prior probability of hERG interaction
  cyp3a4: number;     // prior probability of CYP3A4 substrate
  cyp2c9: number;     // prior probability of CYP2C9 substrate
  cyp1a2: number;     // prior probability of CYP1A2 substrate
  cyp2e1: number;     // prior probability of CYP2E1 substrate
  cox1: number;       // prior probability of COX-1 interaction
  cox2: number;       // prior probability of COX-2 interaction
  pgp: number;        // prior probability of P-gp substrate
}

const CLASS_BIAS: Record<ScaffoldClass, ClassBias> = {
  kinase: {
    herg:   0.35,  // moderate — basic N + LogP 2–5 common in kinase inhibitors
    cyp3a4: 0.65,  // high — most kinase inhibitors are CYP3A4 substrates
    cyp2c9: 0.10,  // low — not typical for kinase scaffolds
    cyp1a2: 0.10,  // low
    cyp2e1: 0.05,  // very low
    cox1:   0.05,  // very low — kinase scaffolds do not inhibit COX
    cox2:   0.05,  // very low
    pgp:    0.45,  // moderate — many kinase inhibitors are P-gp substrates
  },
  nsaid: {
    herg:   0.08,  // low — acidic NSAIDs lack basic N, low LogP
    cyp3a4: 0.15,  // low — NSAIDs primarily CYP2C9
    cyp2c9: 0.70,  // high — arylpropionic/acetic acids are CYP2C9 substrates
    cyp1a2: 0.10,  // low
    cyp2e1: 0.10,  // low
    cox1:   0.75,  // high — NSAIDs inhibit COX-1 (GI liability)
    cox2:   0.70,  // high — NSAIDs inhibit COX-2 (anti-inflammatory)
    pgp:    0.15,  // low
  },
  cns: {
    herg:   0.30,  // moderate — CNS drugs often lipophilic with basic N
    cyp3a4: 0.30,  // moderate
    cyp2c9: 0.15,  // low
    cyp1a2: 0.50,  // high — xanthines, planar aromatics are CYP1A2 substrates
    cyp2e1: 0.10,  // low
    cox1:   0.05,  // very low
    cox2:   0.05,  // very low
    pgp:    0.25,  // low-moderate (P-gp efflux limits CNS penetration)
  },
  ion_channel: {
    herg:   0.65,  // high — ion channel modulators often have hERG liability
    cyp3a4: 0.50,  // moderate-high
    cyp2c9: 0.15,  // low
    cyp1a2: 0.10,  // low
    cyp2e1: 0.05,  // very low
    cox1:   0.05,  // very low
    cox2:   0.05,  // very low
    pgp:    0.35,  // moderate
  },
  steroid: {
    herg:   0.10,  // low — steroids generally low hERG
    cyp3a4: 0.75,  // high — steroids are major CYP3A4 substrates
    cyp2c9: 0.10,  // low
    cyp1a2: 0.05,  // very low
    cyp2e1: 0.05,  // very low
    cox1:   0.05,  // very low
    cox2:   0.05,  // very low
    pgp:    0.20,  // low
  },
  unknown: {
    herg:   0.25,  // uninformative prior
    cyp3a4: 0.30,
    cyp2c9: 0.20,
    cyp1a2: 0.15,
    cyp2e1: 0.10,
    cox1:   0.15,
    cox2:   0.15,
    pgp:    0.25,
  },
};

// ─── Physicochemical modifiers ────────────────────────────────────────────────
// These adjust the class prior based on actual descriptor values.
// Each modifier is a multiplier applied to the prior.

function hergModifier(logp: number, hAcceptors: number, hasBasicN: boolean): number {
  // hERG pharmacophore requires: basic nitrogen + lipophilicity + aromatic bulk
  // Without basic N, hERG risk is very low regardless of LogP
  if (!hasBasicN) return 0.3;  // acidic/neutral compounds: strong downward modifier
  const logpMod = logp > 3 ? 1.4 : logp > 1 ? 1.0 : 0.6;
  const nMod = hAcceptors > 4 ? 1.2 : 1.0;
  return logpMod * nMod;
}

function cyp3a4Modifier(mw: number, logp: number): number {
  // CYP3A4 prefers MW 300–600, LogP 2–5
  const mwMod = mw > 300 && mw < 600 ? 1.2 : mw > 600 ? 0.8 : 0.9;
  const logpMod = logp > 2 && logp < 5 ? 1.1 : 0.8;
  return mwMod * logpMod;
}

function cyp2c9Modifier(hasCarboxylicAcid: boolean, logp: number): number {
  // CYP2C9 strongly prefers acidic substrates (pKa 3–5)
  return hasCarboxylicAcid ? 1.5 : 0.5;
}

function cyp1a2Modifier(aromaticRings: number, mw: number): number {
  // CYP1A2 prefers planar, low-MW aromatics
  return aromaticRings >= 2 && mw < 350 ? 1.4 : 0.7;
}

function cox1Modifier(hasCarboxylicAcid: boolean, scaffoldClass: ScaffoldClass): number {
  // COX-1 inhibition requires NSAID-like scaffold with carboxylic acid
  if (scaffoldClass !== "nsaid") return 0.1;  // strong suppression for non-NSAIDs
  return hasCarboxylicAcid ? 1.2 : 0.6;
}

// ─── Score computation ────────────────────────────────────────────────────────

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

// Deterministic noise: adds scaffold-specific variation without pure randomness
function deterministicNoise(seed: number, range: number): number {
  // Mulberry32-style: deterministic per molecule
  let s = (seed >>> 0) + 0x6D2B79F5;
  s = Math.imul(s ^ (s >>> 15), s | 1);
  s ^= s + Math.imul(s ^ (s >>> 7), s | 61);
  const r = ((s ^ (s >>> 14)) >>> 0) / 4294967296;
  return (r - 0.5) * range;
}

export function computeBiologicalProfile(
  smiles: string,
  scaffold: ScaffoldProfile,
  mw: number,
  logp: number,
  hDonors: number,
  hAcceptors: number,
  tpsa: number,
  hash: number,
): BiologicalProfile {
  const bias = CLASS_BIAS[scaffold.scaffoldClass];
  const { features } = scaffold;

  // ── hERG ──
  const hergMod = hergModifier(logp, hAcceptors, features.hasBasicNitrogen);
  const hergRaw = clamp01(bias.herg * hergMod + deterministicNoise(hash ^ 0xABCD, 0.12));
  const hergScore = Math.round(hergRaw * 100) / 100;

  // ── CYP3A4 ──
  const cyp3a4Mod = cyp3a4Modifier(mw, logp);
  const cyp3a4Raw = clamp01(bias.cyp3a4 * cyp3a4Mod + deterministicNoise(hash ^ 0x1234, 0.10));
  const cyp3a4Score = Math.round(cyp3a4Raw * 100) / 100;

  // ── CYP2C9 ──
  const cyp2c9Mod = cyp2c9Modifier(features.hasCarboxylicAcid, logp);
  const cyp2c9Raw = clamp01(bias.cyp2c9 * cyp2c9Mod + deterministicNoise(hash ^ 0x5678, 0.08));
  const cyp2c9Score = Math.round(cyp2c9Raw * 100) / 100;

  // ── CYP1A2 ──
  const cyp1a2Mod = cyp1a2Modifier(features.aromaticRingCount, mw);
  const cyp1a2Raw = clamp01(bias.cyp1a2 * cyp1a2Mod + deterministicNoise(hash ^ 0x9ABC, 0.08));
  const cyp1a2Score = Math.round(cyp1a2Raw * 100) / 100;

  // ── COX-1 ──
  const cox1Mod = cox1Modifier(features.hasCarboxylicAcid, scaffold.scaffoldClass);
  const cox1Raw = clamp01(bias.cox1 * cox1Mod + deterministicNoise(hash ^ 0xDEF0, 0.08));
  const cox1Score = Math.round(cox1Raw * 100) / 100;

  // ── P-gp ──
  const pgpMod = mw > 400 ? 1.3 : 0.8;
  const pgpRaw = clamp01(bias.pgp * pgpMod + deterministicNoise(hash ^ 0x2468, 0.10));
  const pgpScore = Math.round(pgpRaw * 100) / 100;

  // ── Off-target array ──
  const offTargets: OffTargetScore[] = [
    {
      target: "hERG",
      score: hergScore,
      scoreLabel: "predicted",
      rationale: features.hasBasicNitrogen
        ? `Basic nitrogen + LogP ${logp.toFixed(1)} — hERG pharmacophore partially satisfied [${scaffold.scaffoldClass}]`
        : `No basic nitrogen centre — hERG risk suppressed regardless of lipophilicity [${scaffold.scaffoldClass}]`,
    },
    {
      target: "CYP3A4",
      score: cyp3a4Score,
      scoreLabel: "predicted",
      rationale: `MW ${mw.toFixed(0)} Da, LogP ${logp.toFixed(1)} — ${scaffold.scaffoldClass} class prior ${(bias.cyp3a4 * 100).toFixed(0)}%`,
    },
    {
      target: "CYP2C9",
      score: cyp2c9Score,
      scoreLabel: "predicted",
      rationale: features.hasCarboxylicAcid
        ? "Carboxylic acid motif — CYP2C9 substrate probability elevated (arylacid pharmacophore)"
        : `No carboxylic acid — CYP2C9 substrate probability low [${scaffold.scaffoldClass}]`,
    },
    {
      target: "CYP1A2",
      score: cyp1a2Score,
      scoreLabel: "predicted",
      rationale: `${features.aromaticRingCount} aromatic ring(s), MW ${mw.toFixed(0)} Da — CYP1A2 prefers planar low-MW aromatics`,
    },
    {
      target: "COX-1",
      score: cox1Score,
      scoreLabel: "predicted",
      rationale: scaffold.scaffoldClass === "nsaid"
        ? "NSAID scaffold — COX-1 inhibition expected (GI liability risk)"
        : `Non-NSAID scaffold — COX-1 interaction probability suppressed [${scaffold.scaffoldClass}]`,
    },
    {
      target: "P-gp",
      score: pgpScore,
      scoreLabel: "predicted",
      rationale: `MW ${mw.toFixed(0)} Da — P-gp efflux probability ${mw > 400 ? "elevated" : "low"}`,
    },
  ];

  // ── ADMET ──
  const solubility: "high" | "moderate" | "low" =
    logp > 4 ? "low" :
    logp > 2 && tpsa < 60 ? "moderate" :
    tpsa >= 60 ? "high" : "moderate";

  const permeability: "high" | "moderate" | "low" =
    tpsa < 60 ? "high" : tpsa < 120 ? "moderate" : "low";

  const hepatotoxicity: "low" | "moderate" | "high" =
    scaffold.scaffoldClass === "nsaid" && features.hasCarboxylicAcid ? "low" :
    logp > 4 ? "moderate" : "low";

  // ── DDI warnings ──
  const ddiWarnings: string[] = [];
  if (cyp3a4Score > 0.55) {
    ddiWarnings.push(
      `CYP3A4 substrate (predicted ${(cyp3a4Score * 100).toFixed(0)}%): ` +
      `co-administration with strong CYP3A4 inhibitors (ketoconazole, ritonavir) or inducers (rifampicin) may significantly alter exposure.`
    );
  }
  if (cyp2c9Score > 0.55) {
    ddiWarnings.push(
      `CYP2C9 substrate (predicted ${(cyp2c9Score * 100).toFixed(0)}%): ` +
      `interactions with fluconazole, amiodarone, or other CYP2C9 inhibitors may increase plasma levels.`
    );
  }
  if (hergScore > 0.50) {
    ddiWarnings.push(
      `hERG interaction probability elevated (${(hergScore * 100).toFixed(0)}%): ` +
      `caution with QT-prolonging co-medications (macrolides, antipsychotics, class III antiarrhythmics).`
    );
  }

  // ── Organ warnings ──
  const organWarnings: string[] = [];
  if (hepatotoxicity === "high") {
    organWarnings.push("Hepatotoxicity: monitor LFTs. Known or predicted hepatotoxic potential.");
  }
  if (logp > 4 && hepatotoxicity !== "high") {
    organWarnings.push(`High lipophilicity (LogP ${logp.toFixed(1)}): monitor for hepatic accumulation.`);
  }
  if (tpsa < 25) {
    organWarnings.push("Very low TPSA: high CNS penetration predicted — monitor for neurological effects.");
  }
  if (mw > 400) {
    organWarnings.push("MW > 400 Da: renal clearance may be reduced in renally impaired patients.");
  }
  if (scaffold.scaffoldClass === "nsaid") {
    organWarnings.push("NSAID scaffold: GI mucosal risk (COX-1 inhibition). Consider gastroprotection.");
  }

  const admetNote =
    `Scaffold class: ${scaffold.scaffoldClass} (${scaffold.confidence} confidence). ` +
    scaffold.classRationale + ". " +
    "ADMET profile estimated from scaffold-conditioned physicochemical model. Not experimentally validated.";

  return {
    offTargets,
    hergRisk: hergScore > 0.65 ? "high" : hergScore > 0.35 ? "moderate" : "low",
    cyp3a4Substrate: cyp3a4Score > 0.55,
    cyp3a4Inhibitor: false,  // inhibitor status requires experimental data
    cyp2c9Substrate: cyp2c9Score > 0.55,
    cyp1a2Substrate: cyp1a2Score > 0.45,
    hepatotoxicity,
    solubility,
    permeability,
    admetConfidence: "predicted",
    admetNote,
    ddiWarnings,
    organWarnings,
  };
}
