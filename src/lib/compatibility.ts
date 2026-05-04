/**
 * Structural Bioinformatics Compatibility Engine
 *
 * Evaluates whether a molecule is chemically compatible with a biological
 * target binding site, based on:
 *   - Known ligand requirements per target class
 *   - Molecule functional groups + physicochemistry (PubChem)
 *   - Structural similarity vs known active ligands (ChEMBL)
 *
 * Hard rule: if the molecule class ≠ known ligand class for the target,
 * we immediately flag "structurally mismatched".
 */

import { fetchPubChemBySMILES, fetchPubChemByName, type PubChemResult } from "./pubchem";

const CHEMBL = "https://www.ebi.ac.uk/chembl/api/data";

export type Compatibility = "High" | "Medium" | "Low" | "Unlikely";

export type TargetClass =
  | "kinase"
  | "gpcr"
  | "protease"
  | "nuclear_receptor"
  | "ion_channel"
  | "enzyme"
  | "transporter"
  | "unknown";

export interface TargetProfile {
  class: TargetClass;
  label: string;
  requires: {
    chargeInteraction: "required" | "preferred" | "neutral" | "avoid";
    hbondPattern: string; // human-readable
    hydrophobicPocket: "deep" | "moderate" | "shallow" | "varies";
    peptideMimicry: boolean;
    typicalMW: [number, number];
    typicalLogP: [number, number];
    typicalTPSA: [number, number];
    typicalRotB: [number, number];
    pharmacophores: string[]; // canonical groups expected
    ligandClassHint: "small_molecule" | "peptide" | "steroid" | "nucleotide" | "lipid" | "varies";
  };
}

export interface MoleculeFeatures {
  properties: PubChemResult;
  functionalGroups: string[];
  inferredClass: TargetProfile["requires"]["ligandClassHint"];
}

export interface CompatibilityReport {
  target: TargetProfile;
  molecule: MoleculeFeatures;
  similarity: {
    expected: "High" | "Medium" | "Low";
    observedTopPercent: number | null; // best Tanimoto similarity vs known actives (0-100)
    actives: { chemblId: string; smiles?: string; similarity: number }[];
  };
  mismatched: boolean;
  score: Compatibility;
  scoreNumeric: number; // 0-100
  reasoning: string[];
  missingFeatures: string[];
  sources: string[];
}

// ----- Target class library -----

const TARGET_LIBRARY: TargetProfile[] = [
  {
    class: "kinase",
    label: "Protein kinase (ATP-binding pocket)",
    requires: {
      chargeInteraction: "preferred",
      hbondPattern: "2–3 H-bonds to hinge backbone (donor + acceptor)",
      hydrophobicPocket: "deep",
      peptideMimicry: false,
      typicalMW: [350, 600],
      typicalLogP: [2, 5],
      typicalTPSA: [60, 110],
      typicalRotB: [3, 8],
      pharmacophores: ["aromatic N-heterocycle", "hinge H-bond donor (NH)", "aniline / amide linker"],
      ligandClassHint: "small_molecule",
    },
  },
  {
    class: "gpcr",
    label: "G-protein coupled receptor",
    requires: {
      chargeInteraction: "required",
      hbondPattern: "basic amine salt-bridge to conserved Asp",
      hydrophobicPocket: "moderate",
      peptideMimicry: false,
      typicalMW: [250, 500],
      typicalLogP: [2, 5],
      typicalTPSA: [40, 90],
      typicalRotB: [2, 7],
      pharmacophores: ["protonatable amine", "aromatic ring(s)", "hydrophobic tail"],
      ligandClassHint: "small_molecule",
    },
  },
  {
    class: "protease",
    label: "Protease (peptide-bond hydrolase)",
    requires: {
      chargeInteraction: "preferred",
      hbondPattern: "backbone-mimicking H-bond network across S1–S3 pockets",
      hydrophobicPocket: "moderate",
      peptideMimicry: true,
      typicalMW: [400, 700],
      typicalLogP: [1, 4],
      typicalTPSA: [100, 180],
      typicalRotB: [6, 14],
      pharmacophores: ["amide bonds", "warhead (nitrile / aldehyde / boronic acid)", "P1 hydrophobic side chain"],
      ligandClassHint: "peptide",
    },
  },
  {
    class: "nuclear_receptor",
    label: "Nuclear hormone receptor",
    requires: {
      chargeInteraction: "neutral",
      hbondPattern: "1–2 H-bonds anchoring polar head; otherwise hydrophobic",
      hydrophobicPocket: "deep",
      peptideMimicry: false,
      typicalMW: [250, 500],
      typicalLogP: [3, 6],
      typicalTPSA: [20, 70],
      typicalRotB: [0, 4],
      pharmacophores: ["fused ring system (steroid-like)", "polar head group (OH / ketone)"],
      ligandClassHint: "steroid",
    },
  },
  {
    class: "ion_channel",
    label: "Ion channel",
    requires: {
      chargeInteraction: "required",
      hbondPattern: "minimal; mostly cation-π / hydrophobic",
      hydrophobicPocket: "moderate",
      peptideMimicry: false,
      typicalMW: [200, 450],
      typicalLogP: [2, 5],
      typicalTPSA: [20, 70],
      typicalRotB: [2, 6],
      pharmacophores: ["protonatable amine or quaternary N", "aromatic ring"],
      ligandClassHint: "small_molecule",
    },
  },
  {
    class: "enzyme",
    label: "Generic enzyme inhibitor",
    requires: {
      chargeInteraction: "preferred",
      hbondPattern: "active-site H-bonds; often coordination of catalytic residue",
      hydrophobicPocket: "moderate",
      peptideMimicry: false,
      typicalMW: [250, 550],
      typicalLogP: [1, 5],
      typicalTPSA: [50, 130],
      typicalRotB: [2, 9],
      pharmacophores: ["polar warhead", "aromatic core"],
      ligandClassHint: "small_molecule",
    },
  },
  {
    class: "transporter",
    label: "Membrane transporter",
    requires: {
      chargeInteraction: "preferred",
      hbondPattern: "substrate-mimicking polar contacts",
      hydrophobicPocket: "moderate",
      peptideMimicry: false,
      typicalMW: [200, 500],
      typicalLogP: [1, 4],
      typicalTPSA: [40, 120],
      typicalRotB: [3, 9],
      pharmacophores: ["polar head", "moderate lipophilic body"],
      ligandClassHint: "small_molecule",
    },
  },
];

const UNKNOWN_TARGET: TargetProfile = {
  class: "unknown",
  label: "Unknown target class",
  requires: {
    chargeInteraction: "neutral",
    hbondPattern: "—",
    hydrophobicPocket: "varies",
    peptideMimicry: false,
    typicalMW: [150, 700],
    typicalLogP: [-1, 6],
    typicalTPSA: [20, 180],
    typicalRotB: [0, 12],
    pharmacophores: [],
    ligandClassHint: "varies",
  },
};

export function listTargetProfiles() {
  return TARGET_LIBRARY;
}

// ----- Heuristic target classifier from free-text name -----

export function classifyTarget(query: string): TargetProfile {
  const q = query.toLowerCase();
  if (/(kinase|cdk|egfr|abl|jak|src|btk|mek|pi3k|kit|alk|raf)/.test(q)) return TARGET_LIBRARY[0];
  if (/(receptor.*gpcr|adrener|dopamin|seroton|opioid|muscarin|histamin|cannabin|gpcr|5-?ht)/.test(q)) return TARGET_LIBRARY[1];
  if (/(protease|peptidase|caspase|thrombin|elastase|cathepsin|trypsin|hiv-?protease|3clpro|mpro)/.test(q)) return TARGET_LIBRARY[2];
  if (/(estrogen|androgen|glucocortic|progesteron|nuclear|ppar|rxr|retinoic|thyroid|vitamin d)/.test(q)) return TARGET_LIBRARY[3];
  if (/(channel|nav|cav|kv|herg|nicotinic|gaba|nmda|ampa)/.test(q)) return TARGET_LIBRARY[4];
  if (/(transporter|sert|dat|net|sglt|p-?gp|abc)/.test(q)) return TARGET_LIBRARY[6];
  if (/(ase\b|enzyme|cox|lox|hmg|reductase|synthase|dehydrogenase|oxidase)/.test(q)) return TARGET_LIBRARY[5];
  return UNKNOWN_TARGET;
}

// ----- Functional group + ligand class inference from SMILES -----

const FG_PATTERNS: { name: string; re: RegExp }[] = [
  { name: "carboxylic acid", re: /C\(=O\)O[H)]?(?![A-Za-z])/ },
  { name: "ester", re: /C\(=O\)O[A-Za-z]/ },
  { name: "amide", re: /C\(=O\)N/ },
  { name: "primary amine", re: /\bN[H]?2?\b|N(?![=#a-zA-Z])/ },
  { name: "basic / protonatable amine", re: /N(?![=#])/ },
  { name: "nitrile", re: /C#N/ },
  { name: "halogen", re: /(Cl|Br|F|I)(?![a-z])/ },
  { name: "hydroxyl", re: /O[H]?(?![A-Za-z=])/ },
  { name: "sulfonamide", re: /S\(=O\)\(=O\)N/ },
  { name: "aromatic ring", re: /c1[a-z0-9]+1/ },
  { name: "fused ring system", re: /c\d.*c\d.*c\d/ },
  { name: "phosphate", re: /P\(=O\)\(O/ },
  { name: "boronic acid", re: /B\(O\)O/ },
];

function detectFunctionalGroups(smiles: string): string[] {
  const found = new Set<string>();
  for (const fg of FG_PATTERNS) if (fg.re.test(smiles)) found.add(fg.name);
  return Array.from(found);
}

function inferLigandClass(smiles: string, props: PubChemResult): MoleculeFeatures["inferredClass"] {
  // Steroid: 4 fused rings, low TPSA, high LogP, no charge
  if (/C\d.*C\d.*C\d.*C\d/.test(smiles) && props.tpsa < 80 && props.logp > 2.5 && props.hDonors <= 2) return "steroid";
  // Peptide: many amides + high MW
  const amideCount = (smiles.match(/C\(=O\)N/g) ?? []).length;
  if (amideCount >= 3 && props.mw > 400) return "peptide";
  // Nucleotide: phosphate + ring nitrogen
  if (/P\(=O\)\(O/.test(smiles) && /n\d/.test(smiles)) return "nucleotide";
  // Lipid: very high logP + long aliphatic chain
  if (props.logp > 6 && /CCCCCCCC/.test(smiles)) return "lipid";
  return "small_molecule";
}

// ----- ChEMBL similarity vs known active ligands -----

async function topSimilarityToActives(smiles: string, targetTextHint: string): Promise<{ best: number | null; actives: { chemblId: string; smiles?: string; similarity: number }[] }> {
  try {
    // 1) Find target in ChEMBL
    const t = await fetch(`${CHEMBL}/target/search.json?q=${encodeURIComponent(targetTextHint)}&limit=1`).then((r) => r.ok ? r.json() : null);
    const targetId = t?.targets?.[0]?.target_chembl_id;
    if (!targetId) return { best: null, actives: [] };

    // 2) Similarity search for the input molecule
    const sim = await fetch(`${CHEMBL}/similarity/${encodeURIComponent(smiles)}/60.json?limit=50`).then((r) => r.ok ? r.json() : null);
    const sims: any[] = sim?.molecules ?? [];
    if (sims.length === 0) return { best: null, actives: [] };

    // 3) Cross-reference with target activities
    const ids = sims.map((m) => m.molecule_chembl_id).filter(Boolean).slice(0, 50);
    const acts = await fetch(`${CHEMBL}/activity.json?molecule_chembl_id__in=${ids.join(",")}&target_chembl_id=${targetId}&limit=200`).then((r) => r.ok ? r.json() : null);
    const activeIds = new Set<string>((acts?.activities ?? []).map((a: any) => a.molecule_chembl_id));

    const intersect = sims.filter((m) => activeIds.has(m.molecule_chembl_id));
    if (intersect.length === 0) return { best: 0, actives: [] };
    const best = Math.max(...intersect.map((m) => Number(m.similarity ?? 0)));
    return {
      best,
      actives: intersect.slice(0, 8).map((m) => ({
        chemblId: m.molecule_chembl_id,
        smiles: m.molecule_structures?.canonical_smiles,
        similarity: Number(m.similarity ?? 0),
      })),
    };
  } catch {
    return { best: null, actives: [] };
  }
}

// ----- Scoring -----

function inRange(x: number, [a, b]: [number, number]) {
  return x >= a && x <= b;
}

function evaluate(target: TargetProfile, mol: MoleculeFeatures, sim: { best: number | null }): {
  score: Compatibility;
  numeric: number;
  reasoning: string[];
  missing: string[];
  mismatched: boolean;
} {
  const reasons: string[] = [];
  const missing: string[] = [];
  let score = 0;
  let max = 0;

  const p = mol.properties;
  const req = target.requires;

  // Hard mismatch rule (molecule class ≠ ligand class for target)
  const mismatched =
    req.ligandClassHint !== "varies" &&
    mol.inferredClass !== "varies" &&
    mol.inferredClass !== req.ligandClassHint;
  if (mismatched) {
    reasons.push(
      `❌ Structural mismatch: molecule appears to be a ${mol.inferredClass.replace("_", " ")} but target requires a ${req.ligandClassHint.replace("_", " ")} ligand.`,
    );
    return { score: "Unlikely", numeric: 10, reasoning: reasons, missing, mismatched: true };
  }

  // Physicochemistry checks
  const checks: { ok: boolean; weight: number; pass: string; fail: string }[] = [
    {
      ok: inRange(p.mw, req.typicalMW),
      weight: 10,
      pass: `MW ${p.mw.toFixed(0)} Da is within typical ${req.typicalMW[0]}–${req.typicalMW[1]} Da for ${target.class}.`,
      fail: `MW ${p.mw.toFixed(0)} Da is outside typical ${req.typicalMW[0]}–${req.typicalMW[1]} Da for ${target.class}.`,
    },
    {
      ok: inRange(p.logp, req.typicalLogP),
      weight: 15,
      pass: `LogP ${p.logp} matches lipophilicity expected for a ${req.hydrophobicPocket} hydrophobic pocket.`,
      fail: `LogP ${p.logp} is outside typical ${req.typicalLogP[0]}–${req.typicalLogP[1]} range.`,
    },
    {
      ok: inRange(p.tpsa, req.typicalTPSA),
      weight: 15,
      pass: `TPSA ${p.tpsa} Å² is consistent with the polar contact pattern (${req.hbondPattern}).`,
      fail: `TPSA ${p.tpsa} Å² is outside typical ${req.typicalTPSA[0]}–${req.typicalTPSA[1]} Å² for this class.`,
    },
    {
      ok: inRange(p.rotBonds, req.typicalRotB),
      weight: 5,
      pass: `Flexibility (${p.rotBonds} rotatable bonds) is appropriate.`,
      fail: `Flexibility (${p.rotBonds} rotatable bonds) is atypical — may incur entropic penalty.`,
    },
  ];
  for (const c of checks) {
    max += c.weight;
    if (c.ok) {
      score += c.weight;
      reasons.push("✅ " + c.pass);
    } else {
      reasons.push("⚠️ " + c.fail);
    }
  }

  // Charge interaction
  max += 15;
  const hasBasicAmine = mol.functionalGroups.some((g) => /amine/.test(g));
  const hasAcid = mol.functionalGroups.includes("carboxylic acid") || mol.functionalGroups.includes("phosphate");
  const hasCharge = hasBasicAmine || hasAcid;
  if (req.chargeInteraction === "required") {
    if (hasCharge) { score += 15; reasons.push("✅ Ionizable group present — supports required salt bridge / electrostatic anchor."); }
    else { reasons.push("❌ Required ionizable group missing (target needs a salt bridge)."); missing.push("protonatable amine or acid for ionic anchor"); }
  } else if (req.chargeInteraction === "preferred") {
    if (hasCharge) { score += 10; reasons.push("✅ Ionizable group present — strengthens binding."); }
    else { score += 5; reasons.push("• No ionizable group; binding will rely on H-bonds / hydrophobics."); }
  } else {
    score += 12;
  }

  // Pharmacophore coverage
  max += 20;
  const present = req.pharmacophores.filter((ph) => {
    const k = ph.toLowerCase();
    if (k.includes("aromatic")) return mol.functionalGroups.includes("aromatic ring") || mol.functionalGroups.includes("fused ring system");
    if (k.includes("amine")) return hasBasicAmine;
    if (k.includes("amide")) return mol.functionalGroups.includes("amide");
    if (k.includes("polar head") || k.includes("polar")) return mol.functionalGroups.includes("hydroxyl") || mol.functionalGroups.includes("amide");
    if (k.includes("warhead") || k.includes("nitrile") || k.includes("boronic")) return mol.functionalGroups.includes("nitrile") || mol.functionalGroups.includes("boronic acid") || mol.functionalGroups.includes("sulfonamide");
    if (k.includes("fused")) return mol.functionalGroups.includes("fused ring system");
    if (k.includes("hinge")) return mol.functionalGroups.includes("amide") || mol.functionalGroups.includes("aromatic ring");
    return false;
  });
  const coverage = req.pharmacophores.length === 0 ? 1 : present.length / req.pharmacophores.length;
  score += Math.round(20 * coverage);
  if (req.pharmacophores.length > 0) {
    reasons.push(`• Pharmacophore coverage: ${present.length}/${req.pharmacophores.length} (${Math.round(coverage * 100)}%).`);
    const absent = req.pharmacophores.filter((ph) => !present.includes(ph));
    absent.forEach((a) => missing.push(a));
  }

  // Similarity to known actives (if available)
  max += 20;
  if (sim.best != null) {
    if (sim.best >= 75) { score += 20; reasons.push(`✅ High structural similarity to known actives (Tanimoto ${Math.round(sim.best)}%).`); }
    else if (sim.best >= 50) { score += 12; reasons.push(`• Moderate similarity to known actives (Tanimoto ${Math.round(sim.best)}%).`); }
    else if (sim.best > 0) { score += 5; reasons.push(`⚠️ Low similarity to known actives (Tanimoto ${Math.round(sim.best)}%).`); }
    else { reasons.push("⚠️ No structurally similar known actives found for this target."); }
  } else {
    score += 10; // no penalty if we couldn't query
    reasons.push("• Similarity vs known actives could not be queried.");
  }

  const numeric = Math.round((score / max) * 100);
  let final: Compatibility;
  if (numeric >= 75) final = "High";
  else if (numeric >= 55) final = "Medium";
  else if (numeric >= 35) final = "Low";
  else final = "Unlikely";

  return { score: final, numeric, reasoning: reasons, missing, mismatched: false };
}

// ----- Public entry -----

export async function evaluateCompatibility(
  moleculeQuery: string,
  targetQuery: string,
  options?: { targetClass?: TargetClass },
): Promise<CompatibilityReport> {
  const sources: string[] = [];

  const isSmiles = /[=#\(\)\[\]\\\/]/.test(moleculeQuery);
  const props =
    (isSmiles ? await fetchPubChemBySMILES(moleculeQuery) : await fetchPubChemByName(moleculeQuery)) ??
    (isSmiles ? await fetchPubChemByName(moleculeQuery) : await fetchPubChemBySMILES(moleculeQuery));
  if (!props) {
    throw new Error("Could not resolve molecule via PubChem.");
  }
  sources.push("PubChem");

  const fgSource = isSmiles ? moleculeQuery : "";
  const fgs = detectFunctionalGroups(fgSource);
  const inferredClass = inferLigandClass(fgSource, props);
  const features: MoleculeFeatures = { properties: props, functionalGroups: fgs, inferredClass };

  const target = options?.targetClass
    ? TARGET_LIBRARY.find((t) => t.class === options!.targetClass) ?? UNKNOWN_TARGET
    : classifyTarget(targetQuery);

  const sim = await topSimilarityToActives(props && isSmiles ? moleculeQuery : (props.formula || moleculeQuery), targetQuery);
  if (sim.best != null) sources.push("ChEMBL");

  const evalResult = evaluate(target, features, sim);

  let expected: "High" | "Medium" | "Low" = "Low";
  if (sim.best != null) {
    if (sim.best >= 75) expected = "High";
    else if (sim.best >= 50) expected = "Medium";
  }

  return {
    target,
    molecule: features,
    similarity: { expected, observedTopPercent: sim.best, actives: sim.actives },
    mismatched: evalResult.mismatched,
    score: evalResult.score,
    scoreNumeric: evalResult.numeric,
    reasoning: evalResult.reasoning,
    missingFeatures: evalResult.missing,
    sources,
  };
}
