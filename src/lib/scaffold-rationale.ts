/**
 * Scaffold-Aware Transformation Rationale Generator
 * ────────────────────────────────────────────────────────────────────────────
 * Generates medicinal chemistry rationale for scaffold modifications based on
 * scaffold class and pharmacology domain.
 * 
 * Replaces generic template-based rationale with scaffold-specific context.
 */

import type { ScaffoldClass } from "./scaffold-classifier";

export type ModificationKey = "fluoro" | "chloro" | "hydroxy" | "methyl" | "amino" | "trifluoromethyl";

interface ScaffoldRationaleMap {
  [key: string]: {
    [mod in ModificationKey]: string;
  };
}

/**
 * Scaffold-specific transformation rationale.
 * Each entry discusses the medicinal chemistry context for that scaffold class.
 */
const SCAFFOLD_RATIONALE: ScaffoldRationaleMap = {
  cns: {
    fluoro:
      "Para-fluorination on CNS scaffold: increases metabolic stability (blocks CYP-mediated aromatic hydroxylation), enhances BBB penetration (reduces TPSA ~20 Ų), may modulate serotonin/norepinephrine transporter affinity via electronic effects. Known in SSRI SAR (e.g., fluoxetine analogs).",
    chloro:
      "Para-chlorination on CNS scaffold: increases lipophilicity (ΔLogP ~+0.7), enhances membrane permeability, may increase BBB penetration but also increases hERG liability risk. Known in tricyclic antidepressant SAR.",
    hydroxy:
      "Para-hydroxylation on CNS scaffold: major Phase I metabolite, reduces BBB penetration (increases TPSA ~20 Ų), increases H-bond donors, reduces CNS activity. Often a metabolic soft spot requiring blocking.",
    methyl:
      "Methyl scan on CNS scaffold: blocks CYP-mediated para-hydroxylation (metabolic soft spot), modest LogP increase (~+0.5), may improve oral bioavailability. Known in SSRI optimization (e.g., sertraline).",
    amino:
      "Para-amination on CNS scaffold: introduces basic nitrogen, increases H-bond donors, reduces BBB penetration (TPSA increase), potential toxicophore (aniline oxidation → reactive metabolites). Use with caution.",
    trifluoromethyl:
      "CF₃ on CNS scaffold: strong metabolic stability (blocks aromatic oxidation), increases lipophilicity (ΔLogP ~+1.0), enhances BBB penetration, known in CNS drug SAR (e.g., fluoxetine CF₃ analogs).",
  },
  kinase: {
    fluoro:
      "Para-fluorination on kinase scaffold: modulates hinge-binding electronics (weak electron-withdrawing), reduces CYP3A4 metabolism at aniline position, maintains ATP pocket interactions. Known in EGFR/ALK inhibitor SAR (e.g., erlotinib analogs).",
    chloro:
      "Para-chlorination on kinase scaffold: increases hydrophobic binding in ATP pocket, enhances selectivity via steric effects, known in kinase inhibitor optimization (e.g., sorafenib, imatinib analogs).",
    hydroxy:
      "Para-hydroxylation on kinase scaffold: introduces H-bond donor for hinge binding, but may reduce membrane permeability and increase Phase II metabolism (glucuronidation). Context-dependent benefit.",
    methyl:
      "Methyl scan on kinase scaffold: blocks CYP-mediated para-hydroxylation, modest selectivity modulation via steric effects, maintains hinge binding. Known in kinase inhibitor SAR.",
    amino:
      "Para-amination on kinase scaffold: potential toxicophore (aniline → reactive metabolites), may introduce hERG liability, not recommended without specific SAR precedent. Use with caution.",
    trifluoromethyl:
      "CF₃ on kinase scaffold: strong metabolic stability, increases lipophilicity, modulates hinge-binding electronics, known in kinase inhibitor SAR (e.g., vemurafenib, dabrafenib).",
  },
  nsaid: {
    fluoro:
      "Para-fluorination on NSAID scaffold: reduces COX-1 affinity (electronic effects), improves metabolic stability, may enhance COX-2 selectivity. Known in NSAID SAR.",
    chloro:
      "Para-chlorination on NSAID scaffold: increases lipophilicity, enhances COX binding, known in NSAID SAR (e.g., diclofenac — dichlorinated arylacetic acid).",
    hydroxy:
      "Para-hydroxylation on NSAID scaffold: major metabolite, reduces COX activity, increases aqueous solubility, reduces GI liability. Often a metabolic soft spot.",
    methyl:
      "Methyl scan on NSAID scaffold: blocks para-hydroxylation metabolic soft spot, modest LogP increase, maintains COX inhibition. Known in ibuprofen analogs.",
    amino:
      "Para-amination on NSAID scaffold: introduces basic nitrogen, reduces COX selectivity, not common in NSAID SAR. May introduce toxicophore.",
    trifluoromethyl:
      "CF₃ on NSAID scaffold: strong metabolic stability, increases lipophilicity, may modulate COX selectivity via electronic effects. Known in celecoxib (CF₃ on sulfonamide).",
  },
  ion_channel: {
    fluoro:
      "Para-fluorination on ion channel modulator: modulates channel binding electronics, reduces CYP metabolism, may affect hERG liability. Context-dependent.",
    chloro:
      "Para-chlorination on ion channel modulator: increases lipophilicity, enhances membrane partitioning, may modulate channel selectivity.",
    hydroxy:
      "Para-hydroxylation on ion channel modulator: increases H-bond donors, reduces membrane permeability, may reduce channel activity.",
    methyl:
      "Methyl scan on ion channel modulator: blocks metabolic soft spots, modest LogP increase, may modulate channel selectivity.",
    amino:
      "Para-amination on ion channel modulator: introduces basic nitrogen, may increase hERG liability, use with caution.",
    trifluoromethyl:
      "CF₃ on ion channel modulator: strong metabolic stability, increases lipophilicity, may modulate channel binding.",
  },
  steroid: {
    fluoro:
      "Fluorination on steroidal scaffold: typically at 6β or 9α position (not aromatic para), reduces 5α-reductase metabolism, increases metabolic stability. Known in fluorinated androgen/corticosteroid SAR.",
    chloro:
      "Chlorination on steroidal scaffold: not applicable via aromatic substitution (no aromatic ring). Requires specific position chemistry.",
    hydroxy:
      "Hydroxylation on steroidal scaffold: major CYP3A4 metabolite (e.g., 6β-OH testosterone), reduces androgenic/estrogenic activity. Context-dependent.",
    methyl:
      "Methylation on steroidal scaffold: classic modification (e.g., 6α-methyl testosterone), increases oral bioavailability and metabolic stability. Known in anabolic steroid SAR.",
    amino:
      "Amination on steroidal scaffold: not applicable via simple aromatic substitution. Requires specific position chemistry.",
    trifluoromethyl:
      "CF₃ on steroidal scaffold: not applicable via aromatic substitution (no aromatic ring). Requires specific position chemistry.",
  },
  unknown: {
    fluoro:
      "Para-fluorination: metabolic stability (blocks CYP-mediated aromatic hydroxylation), membrane permeability, weak electron-withdrawing. Verify scaffold class for specific context.",
    chloro:
      "Para-chlorination: lipophilicity increase (~+0.7 LogP), enhanced hydrophobic binding. Verify scaffold class for specific context.",
    hydroxy:
      "Para-hydroxylation: H-bond donor, aqueous solubility increase, reduced permeability. Often a metabolic soft spot. Verify scaffold class for specific context.",
    methyl:
      "Para-methyl: blocks CYP-mediated para-hydroxylation, modest LogP increase (~+0.5). Verify scaffold class for specific context.",
    amino:
      "Para-amination: basic nitrogen, H-bond donor, reduced LogP, potential toxicophore (aniline oxidation). Use with caution. Verify scaffold class for specific context.",
    trifluoromethyl:
      "Para-CF₃: strong metabolic stability, lipophilicity increase, electron-withdrawing. Verify scaffold class for specific context.",
  },
};

/**
 * Generate scaffold-aware transformation rationale.
 * 
 * @param modKey - Modification type (fluoro, chloro, etc.)
 * @param scaffoldClass - Scaffold class (cns, kinase, nsaid, etc.)
 * @param genericNote - Fallback generic note (used if scaffold class not found)
 * @returns Scaffold-specific medicinal chemistry rationale
 */
export function generateScaffoldAwareRationale(
  modKey: ModificationKey,
  scaffoldClass: ScaffoldClass,
  genericNote: string
): string {
  const scaffoldRationale = SCAFFOLD_RATIONALE[scaffoldClass];
  
  if (!scaffoldRationale) {
    // Fallback to generic note if scaffold class not in map
    return genericNote;
  }
  
  return scaffoldRationale[modKey] ?? genericNote;
}

/**
 * Generate transformation summary for UI display.
 * Includes scaffold class, modification type, and expected property changes.
 */
export interface TransformationSummary {
  scaffoldClass: ScaffoldClass;
  modification: ModificationKey;
  rationale: string;
  expectedChanges: {
    logP: "increase" | "decrease" | "neutral";
    tpsa: "increase" | "decrease" | "neutral";
    metabolicStability: "increase" | "decrease" | "neutral";
    permeability: "increase" | "decrease" | "neutral";
  };
}

/**
 * Generate expected property changes for a transformation.
 * Used for pre-validation before PubChem lookup.
 */
export function generateExpectedChanges(
  modKey: ModificationKey,
  scaffoldClass: ScaffoldClass
): TransformationSummary["expectedChanges"] {
  const changes: Record<ModificationKey, TransformationSummary["expectedChanges"]> = {
    fluoro: {
      logP: "increase",
      tpsa: "neutral",
      metabolicStability: "increase",
      permeability: "increase",
    },
    chloro: {
      logP: "increase",
      tpsa: "neutral",
      metabolicStability: "increase",
      permeability: "increase",
    },
    hydroxy: {
      logP: "decrease",
      tpsa: "increase",
      metabolicStability: "decrease",
      permeability: "decrease",
    },
    methyl: {
      logP: "increase",
      tpsa: "neutral",
      metabolicStability: "increase",
      permeability: "neutral",
    },
    amino: {
      logP: "decrease",
      tpsa: "increase",
      metabolicStability: "decrease",
      permeability: "decrease",
    },
    trifluoromethyl: {
      logP: "increase",
      tpsa: "neutral",
      metabolicStability: "increase",
      permeability: "increase",
    },
  };

  return changes[modKey];
}

/**
 * Validate that expected changes match actual PubChem results.
 * Used for quality control — flags unexpected descriptor changes.
 */
export function validateExpectedChanges(
  modKey: ModificationKey,
  originalLogP: number | null,
  modifiedLogP: number | null,
  originalTPSA: number,
  modifiedTPSA: number
): { valid: boolean; warnings: string[] } {
  const expected = generateExpectedChanges(modKey, "unknown");
  const warnings: string[] = [];

  // Validate LogP change
  if (originalLogP !== null && modifiedLogP !== null) {
    const deltaLogP = modifiedLogP - originalLogP;
    if (expected.logP === "increase" && deltaLogP < 0) {
      warnings.push(`Expected LogP increase, but got ΔLogP = ${deltaLogP.toFixed(2)}`);
    } else if (expected.logP === "decrease" && deltaLogP > 0) {
      warnings.push(`Expected LogP decrease, but got ΔLogP = ${deltaLogP.toFixed(2)}`);
    }
  }

  // Validate TPSA change
  const deltaTPSA = modifiedTPSA - originalTPSA;
  if (expected.tpsa === "increase" && deltaTPSA < 0) {
    warnings.push(`Expected TPSA increase, but got ΔTPSA = ${deltaTPSA.toFixed(1)} Ų`);
  } else if (expected.tpsa === "decrease" && deltaTPSA > 0) {
    warnings.push(`Expected TPSA decrease, but got ΔTPSA = ${deltaTPSA.toFixed(1)} Ų`);
  }

  return { valid: warnings.length === 0, warnings };
}
