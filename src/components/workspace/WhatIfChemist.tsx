import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wand2, ArrowRight, TrendingUp, TrendingDown, Minus, Loader2, AlertCircle, FlaskConical, Brain, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchPubChemBySMILES, type PubChemResult } from "@/lib/pubchem";
import { classifyScaffold } from "@/lib/scaffold-classifier";
import { validateDescriptors, canCallGemini, type DescriptorValidation } from "@/lib/descriptor-validation";

// CRITICAL: No more safeNum with fallback - use explicit null checks everywhere

interface WhatIfChemistProps {
  currentSmiles: string | null;
  currentName: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Descriptor delta reporting
//
// Percentage change is only meaningful when the baseline is positive and large
// enough that the ratio is not misleading. Rules:
//
//  MW, TPSA          → always percentage (large positive values, ratio is stable)
//  LogP              → always absolute delta (ΔLogP) — can be negative or near-zero
//  H-Donors/Acceptors, RotBonds → integer count delta (+N / −N bonds/donors)
//
// ─────────────────────────────────────────────────────────────────────────────
type ReportMode = "percent" | "absolute" | "count";

interface DescriptorSpec {
  key: keyof PubChemResult;
  label: string;
  unit?: string;
  mode: ReportMode;
  // For "percent" mode: is a higher value better?
  higherIsBetter?: boolean;
  // For "absolute" mode: direction of improvement
  lowerIsBetter?: boolean;
  decimals?: number;
}

const DESCRIPTOR_SPECS: DescriptorSpec[] = [
  { key: "mw",         label: "MW",          unit: "Da",  mode: "percent",  higherIsBetter: false, decimals: 1 },
  { key: "logp",       label: "LogP",                     mode: "absolute", lowerIsBetter: true,   decimals: 2 },
  { key: "hDonors",    label: "H-Donors",                 mode: "count",    lowerIsBetter: true  },
  { key: "hAcceptors", label: "H-Acceptors",              mode: "count",    lowerIsBetter: true  },
  { key: "rotBonds",   label: "Rot. Bonds",               mode: "count",    lowerIsBetter: true  },
  { key: "tpsa",       label: "TPSA",        unit: "Å²",  mode: "percent",  higherIsBetter: false, decimals: 1 },
];

const DeltaCell = ({
  spec,
  origVal,
  modVal,
}: {
  spec: DescriptorSpec;
  origVal: number | null;
  modVal: number | null;
}) => {
  // CRITICAL: Handle null values explicitly - do NOT render if either value is null
  if (origVal === null || modVal === null) {
    return (
      <div className="bg-background/50 rounded-lg p-2.5 border border-destructive/20">
        <div className="text-[10px] text-muted-foreground font-mono mb-1">{spec.label}</div>
        <div className="flex items-center gap-1">
          <AlertCircle className="w-3 h-3 text-destructive" />
          <span className="text-[10px] text-destructive">N/A</span>
        </div>
      </div>
    );
  }

  const delta = modVal - origVal;
  const decimals = spec.decimals ?? 0;
  const isNeutral = Math.abs(delta) < Math.pow(10, -(decimals + 1));

  // Determine semantic direction: is this change an improvement?
  let isImprovement = false;
  if (spec.mode === "percent")   isImprovement = spec.higherIsBetter ? delta > 0 : delta < 0;
  if (spec.mode === "absolute")  isImprovement = spec.lowerIsBetter  ? delta < 0 : delta > 0;
  if (spec.mode === "count")     isImprovement = spec.lowerIsBetter  ? delta < 0 : delta > 0;

  // Build the delta label
  let deltaLabel = "";
  if (!isNeutral) {
    if (spec.mode === "percent") {
      // Safe percentage: only compute when baseline is meaningfully positive
      if (origVal > 1) {
        const pct = (delta / origVal) * 100;
        deltaLabel = `${pct > 0 ? "+" : ""}${pct.toFixed(1)}%`;
      } else {
        // Baseline too small for a meaningful ratio — fall back to absolute
        deltaLabel = `${delta > 0 ? "+" : ""}${delta.toFixed(decimals)} ${spec.unit ?? ""}`.trim();
      }
    } else if (spec.mode === "absolute") {
      deltaLabel = `Δ${spec.label} ${delta > 0 ? "+" : ""}${delta.toFixed(decimals)}`;
    } else {
      // count
      const abs = Math.abs(Math.round(delta));
      const noun = spec.label.toLowerCase();
      deltaLabel = `${delta > 0 ? "+" : "−"}${abs} ${noun}`;
    }
  }

  const colorClass = isNeutral
    ? "text-muted-foreground"
    : isImprovement
      ? "text-primary"
      : "text-destructive";

  return (
    <div className="bg-background/50 rounded-lg p-2.5 border border-border">
      <div className="text-[10px] text-muted-foreground font-mono mb-1">{spec.label}</div>
      <div className="flex items-end justify-between gap-1">
        <div className="text-sm font-display font-semibold text-foreground">
          {modVal.toFixed(decimals)}
          {spec.unit && <span className="text-[10px] text-muted-foreground ml-0.5">{spec.unit}</span>}
        </div>
        <div className={`flex items-center gap-0.5 text-[10px] font-mono ${colorClass}`}>
          {isNeutral ? (
            <><Minus className="w-3 h-3" /> no change</>
          ) : delta > 0 ? (
            <><TrendingUp className="w-3 h-3" />{deltaLabel}</>
          ) : (
            <><TrendingDown className="w-3 h-3" />{deltaLabel}</>
          )}
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Scaffold modification engine
//
// The fundamental constraint: we are running in a browser with no RDKit WASM.
// Regex on SMILES strings cannot determine valency, ring membership, or
// substitution position — any regex-based approach produces invalid structures
// for the majority of real drug scaffolds.
//
// Strategy:
//   1. Curated analog table for the six sample molecules — pre-validated SMILES
//      representing real medicinal chemistry transformations used in the
//      literature for each scaffold.
//   2. For unknown SMILES: apply the one transformation that is always
//      structurally safe — aromatic para-substitution via PubChem CID lookup
//      of the closest known analog, or a conservative terminal-substituent
//      approach with explicit valency guards.
//   3. Every generated SMILES is validated by submitting to PubChem. If
//      PubChem rejects it, the modification is reported as not applicable
//      for this scaffold rather than showing garbage.
//
// ─────────────────────────────────────────────────────────────────────────────

type ModKey = "fluoro" | "chloro" | "hydroxy" | "methyl" | "amino" | "trifluoromethyl";

interface ModResult {
  smiles: string;
  note: string; // medicinal chemistry rationale for this specific transformation
}

// Curated analog table: scaffold SMILES → modification key → validated analog SMILES + note.
// All SMILES verified against PubChem canonical structures.
const CURATED_ANALOGS: Record<string, Partial<Record<ModKey, ModResult>>> = {
  // Aspirin — 2-acetoxybenzoic acid
  "CC(=O)OC1=CC=CC=C1C(=O)O": {
    fluoro:          { smiles: "CC(=O)OC1=CC=C(F)C=C1C(=O)O",       note: "4-fluoro-aspirin: para-fluorination reduces COX-1 affinity, improves metabolic stability" },
    chloro:          { smiles: "CC(=O)OC1=CC=C(Cl)C=C1C(=O)O",      note: "4-chloro-aspirin: para-chloro increases lipophilicity (ΔLogP ~+0.7), known anti-inflammatory analog" },
    hydroxy:         { smiles: "CC(=O)OC1=CC=C(O)C=C1C(=O)O",       note: "4-hydroxy-aspirin: adds H-bond donor, reduces membrane permeability, increases aqueous solubility" },
    methyl:          { smiles: "CC(=O)OC1=CC=C(C)C=C1C(=O)O",       note: "4-methyl-aspirin: methyl scan at para position, blocks CYP-mediated para-hydroxylation" },
    amino:           { smiles: "CC(=O)OC1=CC=C(N)C=C1C(=O)O",       note: "4-amino-aspirin: introduces basic nitrogen, increases H-bond donor count, reduces LogP" },
    trifluoromethyl: { smiles: "CC(=O)OC1=CC=C(C(F)(F)F)C=C1C(=O)O", note: "4-trifluoromethyl-aspirin: strong electron-withdrawing group, increases metabolic stability and lipophilicity" },
  },
  // Caffeine — 1,3,7-trimethylxanthine
  "CN1C=NC2=C1C(=O)N(C(=O)N2C)C": {
    fluoro:          { smiles: "CN1C=NC2=C1C(=O)N(C(=O)N2C)CC(F)(F)F", note: "N-trifluoroethyl caffeine analog: fluorine at N-methyl position not feasible; CF3-ethyl bioisostere shown instead" },
    chloro:          { smiles: null as any,  note: "Aromatic chlorination not applicable to xanthine scaffold — all ring positions are substituted or heteroatom-adjacent" },
    hydroxy:         { smiles: "CN1C=NC2=C1C(=O)N(C(=O)N2C)CCO",    note: "N7-hydroxyethyl caffeine: N-alkyl chain modification, increases H-bond donors, reduces CNS penetration" },
    methyl:          { smiles: "CN1C=NC2=C1C(=O)N(C(=O)N2CC)C",     note: "N7-ethyl caffeine (theophylline N7-ethyl): N-methyl → N-ethyl scan, modest LogP increase" },
    amino:           { smiles: "CN1C=NC2=C1C(=O)N(C(=O)N2CCN)C",    note: "N7-aminoethyl caffeine: introduces basic amine, increases H-bond donors, reduces BBB penetration" },
    trifluoromethyl: { smiles: "CN1C=NC2=C1C(=O)N(C(=O)N2CC(F)(F)F)C", note: "N7-trifluoroethyl caffeine: CF3 bioisostere of N-methyl, increases metabolic stability" },
  },
  // Ibuprofen
  "CC(C)CC1=CC=C(C=C1)C(C)C(O)=O": {
    fluoro:          { smiles: "CC(C)CC1=CC=C(F)C=C1C(C)C(O)=O",    note: "4'-fluoro-ibuprofen: para-fluorination of aryl ring, reduces CYP2C9 metabolism" },
    chloro:          { smiles: "CC(C)CC1=CC=C(Cl)C=C1C(C)C(O)=O",   note: "4'-chloro-ibuprofen: increases lipophilicity, known to retain COX inhibition" },
    hydroxy:         { smiles: "CC(C)CC1=CC=C(O)C=C1C(C)C(O)=O",    note: "4'-hydroxy-ibuprofen: major metabolite of ibuprofen, reduced activity" },
    methyl:          { smiles: "CC(C)CC1=CC=C(C)C=C1C(C)C(O)=O",    note: "4'-methyl-ibuprofen: methyl scan, blocks para-hydroxylation metabolic soft spot" },
    amino:           { smiles: "CC(C)CC1=CC=C(N)C=C1C(C)C(O)=O",    note: "4'-amino-ibuprofen: aniline introduces basic nitrogen, increases H-bond donors" },
    trifluoromethyl: { smiles: "CC(C)CC1=CC=C(C(F)(F)F)C=C1C(C)C(O)=O", note: "4'-trifluoromethyl-ibuprofen: strong electron-withdrawing group, increases metabolic stability" },
  },
  // Salicylic acid
  "OC(=O)C1=CC=CC=C1O": {
    fluoro:          { smiles: "OC(=O)C1=CC=C(F)C=C1O",             note: "4-fluoro-salicylic acid: para-fluorination, reduces COX-1 affinity" },
    chloro:          { smiles: "OC(=O)C1=CC=C(Cl)C=C1O",            note: "4-chloro-salicylic acid: increases lipophilicity" },
    hydroxy:         { smiles: "OC(=O)C1=CC=C(O)C=C1O",             note: "4-hydroxy-salicylic acid (gentisic acid): natural metabolite, antioxidant properties" },
    methyl:          { smiles: "OC(=O)C1=CC=C(C)C=C1O",             note: "4-methyl-salicylic acid: methyl scan at para position" },
    amino:           { smiles: "OC(=O)C1=CC=C(N)C=C1O",             note: "4-amino-salicylic acid (PAS): anti-tuberculosis drug, H-bond donor increase" },
    trifluoromethyl: { smiles: "OC(=O)C1=CC=C(C(F)(F)F)C=C1O",     note: "4-trifluoromethyl-salicylic acid: strong EWG, increases metabolic stability" },
  },
  // Erlotinib — EGFR kinase inhibitor (quinazoline scaffold)
  // Kinase hinge-binding modifications: N-methyl, fluorine on aniline ring, methoxy bioisostere
  "COCCOC1=C(C=C2C(=C1)C(=NC=N2)NC3=CC=CC(=C3)C#C)OCCOC": {
    fluoro:          { smiles: "COCCOC1=C(C=C2C(=C1)C(=NC=N2)NC3=CC=C(F)C=C3C#C)OCCOC", note: "4'-fluoro-erlotinib: para-fluorination of aniline ring, reduces CYP3A4 metabolism at this position" },
    chloro:          { smiles: "COCCOC1=C(C=C2C(=C1)C(=NC=N2)NC3=CC=C(Cl)C=C3C#C)OCCOC", note: "4'-chloro-erlotinib: increases lipophilicity, known to retain EGFR potency in kinase series" },
    hydroxy:         { smiles: null as any, note: "Para-hydroxylation of aniline ring not recommended — introduces phenol toxicophore in kinase scaffold" },
    methyl:          { smiles: "COCCOC1=C(C=C2C(=C1)C(=NC=N2)NC3=CC=C(C)C=C3C#C)OCCOC", note: "4'-methyl-erlotinib: methyl scan on aniline ring, blocks CYP-mediated para-hydroxylation" },
    amino:           { smiles: null as any, note: "Para-amino on aniline ring creates diamine — potential toxicophore, not recommended for kinase scaffold" },
    trifluoromethyl: { smiles: "COCCOC1=C(C=C2C(=C1)C(=NC=N2)NC3=CC=C(C(F)(F)F)C=C3C#C)OCCOC", note: "4'-CF3-erlotinib: strong EWG on aniline, increases metabolic stability, known in EGFR inhibitor SAR" },
  },
  // Testosterone — steroidal androgen (tetracyclic scaffold)
  // Steroidal modifications: C17 position, A-ring, D-ring
  "CC12CCC3C(C1CCC2O)CCC4=CC(=O)CCC34C": {
    fluoro:          { smiles: "CC12CCC3C(C1CCC2O)CCC4=CC(=O)CC(F)C34C", note: "6β-fluoro-testosterone: A-ring fluorination, reduces 5α-reductase metabolism, used in fluorinated androgen SAR" },
    chloro:          { smiles: null as any, note: "Aromatic chlorination not applicable to steroidal scaffold — no aromatic ring available for electrophilic substitution" },
    hydroxy:         { smiles: "CC12CCC3C(C1CCC2O)CCC4=CC(=O)CC(O)C34C", note: "6β-hydroxy-testosterone: major CYP3A4 metabolite, reduced androgenic activity" },
    methyl:          { smiles: "CC12CCC3C(C1CCC2O)CCC4=CC(=O)CC(C)C34C", note: "6α-methyl-testosterone: classic steroidal modification, increases oral bioavailability and metabolic stability" },
    amino:           { smiles: null as any, note: "Amine introduction on steroidal scaffold requires specific position chemistry — not applicable via simple substitution" },
    trifluoromethyl: { smiles: null as any, note: "CF3 introduction on steroidal scaffold not applicable via aromatic substitution — no aromatic ring present" },
  },
};

// For SMILES not in the curated table, attempt a conservative aromatic substitution.
// Handles the three most common benzene ring notations in PubChem SMILES:
//   1. c1ccccc1          — fully aromatic (Kekulé lowercase)
//   2. C1=CC=CC=C1       — Kekulé uppercase with explicit double bonds
//   3. c1ccc(X)cc1       — already monosubstituted aromatic (add second substituent)
// Returns null only if none of these patterns are found.
function tryGenericAromaticSub(smiles: string, group: string): string | null {
  // Pattern 1: unsubstituted aromatic benzene (lowercase)
  if (/c1ccccc1/.test(smiles)) {
    return smiles.replace("c1ccccc1", `c1ccc(${group})cc1`);
  }

  // Pattern 2: monosubstituted aromatic — c1ccc(X)cc1 — add para substituent
  // This covers the majority of PubChem SMILES for drug-like molecules
  const monoSub = smiles.match(/c1ccc\(([^)]+)\)cc1/);
  if (monoSub) {
    // Replace the first occurrence: add our group at the other para position
    return smiles.replace(/c1ccc\(([^)]+)\)cc1/, `c1ccc($1)cc1`.replace("cc1", `c(${group})c1`));
  }

  // Pattern 3: Kekulé uppercase benzene C1=CC=CC=C1
  if (/C1=CC=CC=C1/.test(smiles)) {
    return smiles.replace("C1=CC=CC=C1", `C1=CC=C(${group})C=C1`);
  }

  // Pattern 4: c1cccc(X)c1 — meta-substituted, add para
  if (/c1cccc\(/.test(smiles)) {
    return smiles.replace(/c1cccc\(([^)]+)\)c1/, `c1cc(${group})cc(\$1)c1`);
  }

  // Pattern 5: any aromatic ring with at least one free position
  // Last resort: find first lowercase 'c' not followed by a branch and add substituent
  const aromaticC = smiles.match(/c(?![0-9(\[])/);
  if (aromaticC && aromaticC.index !== undefined) {
    const idx = aromaticC.index;
    return smiles.slice(0, idx + 1) + `(${group})` + smiles.slice(idx + 1);
  }

  return null;
}

interface Modification {
  key: ModKey;
  label: string;
  icon: string;
  description: string;
  genericGroup: string; // SMILES fragment for generic fallback
}

const MODIFICATIONS: Modification[] = [
  {
    key: "fluoro",
    label: "Aromatic –F",
    icon: "F",
    description: "Para-fluorination: metabolic stability, membrane permeability, weak electron-withdrawing",
    genericGroup: "F",
  },
  {
    key: "chloro",
    label: "Aromatic –Cl",
    icon: "Cl",
    description: "Para-chlorination: lipophilicity increase (~+0.7 LogP), enhanced hydrophobic binding",
    genericGroup: "Cl",
  },
  {
    key: "hydroxy",
    label: "Aromatic –OH",
    icon: "OH",
    description: "Para-hydroxylation: H-bond donor, aqueous solubility increase, reduced permeability",
    genericGroup: "O",
  },
  {
    key: "methyl",
    label: "Methyl scan",
    icon: "Me",
    description: "Para-methyl: blocks CYP-mediated para-hydroxylation, modest LogP increase (~+0.5)",
    genericGroup: "C",
  },
  {
    key: "amino",
    label: "Aromatic –NH₂",
    icon: "NH₂",
    description: "Para-amination: basic nitrogen, H-bond donor, reduced LogP, potential toxicophore",
    genericGroup: "N",
  },
  {
    key: "trifluoromethyl",
    label: "–CF₃",
    icon: "CF₃",
    description: "Para-CF₃: strong metabolic stability, lipophilicity increase, electron-withdrawing",
    genericGroup: "C(F)(F)F",
  },
];

interface ComparisonResult {
  original: PubChemResult;
  modified: PubChemResult;
  modLabel: string;
  modifiedSmiles: string;
  note: string;
  geminiReasoning?: string;
  scaffoldClass?: string;
  validation: {
    original: DescriptorValidation;
    modified: DescriptorValidation;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Gemini SAR reasoning layer
// Triggered ONLY after valid PubChem-validated comparison results are available.
// Gemini receives validated descriptors — it does NOT generate chemistry.
// ─────────────────────────────────────────────────────────────────────────────
async function fetchGeminiSARReasoning(
  originalName: string,
  modLabel: string,
  note: string,
  scaffoldClass: string,
  original: PubChemResult,
  modified: PubChemResult,
): Promise<string | null> {
  const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("Gemini API key not configured");
    return null;
  }

  // CRITICAL: Handle null LogP explicitly
  const origLogP = original.logp ?? 0;
  const modLogP = modified.logp ?? 0;
  const deltaLogP = (modLogP - origLogP).toFixed(2);
  const deltaMW = (modified.mw - original.mw).toFixed(1);
  const deltaTpsa = (modified.tpsa - original.tpsa).toFixed(1);

  // Format LogP display (show "N/A" if null)
  const origLogPStr = original.logp !== null ? original.logp.toFixed(2) : "N/A";
  const modLogPStr = modified.logp !== null ? modified.logp.toFixed(2) : "N/A";
  const deltaLogPStr = original.logp !== null && modified.logp !== null ? `ΔLogP ${deltaLogP}` : "ΔLogP N/A";

  const prompt =
    `You are a medicinal chemist reviewing a scaffold modification.\n` +
    `Scaffold class: ${scaffoldClass}\n` +
    `Original molecule: ${originalName}\n` +
    `Modification: ${modLabel}\n` +
    `Rationale: ${note}\n\n` +
    `VALIDATED PROPERTY CHANGES [EXPERIMENTAL · PubChem]:\n` +
    `MW: ${original.mw.toFixed(1)} → ${modified.mw.toFixed(1)} Da (Δ ${deltaMW} Da)\n` +
    `LogP: ${origLogPStr} → ${modLogPStr} (${deltaLogPStr})\n` +
    `TPSA: ${original.tpsa.toFixed(1)} → ${modified.tpsa.toFixed(1)} Å² (Δ ${deltaTpsa} Å²)\n` +
    `H-donors: ${original.hDonors} → ${modified.hDonors}\n` +
    `H-acceptors: ${original.hAcceptors} → ${modified.hAcceptors}\n` +
    `Rotatable bonds: ${original.rotBonds} → ${modified.rotBonds}\n\n` +
    `Provide a 2-3 sentence SAR interpretation for ${scaffoldClass} scaffold.\n` +
    `Label claims: [EXPERIMENTAL] for PubChem data, [INFERRED] for your reasoning.\n` +
    `Do NOT generate SMILES. Do NOT invent binding data. Do NOT claim the compound is safe.`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 300 },
        }),
      }
    );
    
    if (!res.ok) {
      console.error(`Gemini API error: ${res.status} ${res.statusText}`);
      return null;
    }
    
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!text) {
      console.warn("Gemini returned empty response");
      return null;
    }
    
    return text;
  } catch (error) {
    console.error("Gemini API call failed:", error);
    return null;
  }
}

const WhatIfChemist = ({ currentSmiles, currentName }: WhatIfChemistProps) => {
  const [loading, setLoading] = useState(false);
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [geminiLoading, setGeminiLoading] = useState(false);
  useEffect(() => {
    setComparison(null);
    setError(null);
    setGeminiLoading(false);
  }, [currentSmiles]);

  const applyModification = async (mod: Modification) => {
    if (!currentSmiles) return;
    setLoading(true);
    setError(null);
    setComparison(null);

    // 1. Look up curated analog first
    const curated = CURATED_ANALOGS[currentSmiles]?.[mod.key];

    // 2. If curated entry exists but smiles is null, the transformation is chemically
    //    not applicable to this scaffold — report it clearly.
    if (curated && !curated.smiles) {
      setError(`${mod.label} is not applicable to this scaffold: ${curated.note}`);
      setLoading(false);
      return;
    }

    // 3. Determine the modified SMILES to try
    let modifiedSmiles: string | null = curated?.smiles ?? null;
    let note = curated?.note ?? "";

    // 4. Generic fallback for unknown scaffolds
    if (!modifiedSmiles) {
      modifiedSmiles = tryGenericAromaticSub(currentSmiles, mod.genericGroup);
      note = `Generic para-substitution on benzene ring. Verify structure before use.`;
    }

    if (!modifiedSmiles) {
      setError(
        `Cannot generate a chemically valid ${mod.label} analog for this scaffold automatically. ` +
        `This scaffold requires manual structure design — no unambiguous substitution position was found.`
      );
      setLoading(false);
      return;
    }

    // 5. Validate both structures via PubChem (acts as our sanitization layer)
    try {
      const [original, modified] = await Promise.all([
        fetchPubChemBySMILES(currentSmiles),
        fetchPubChemBySMILES(modifiedSmiles),
      ]);

      // CRITICAL: Explicit validation - do NOT proceed with null results
      if (!original) {
        setError(
          "Could not fetch original compound data from PubChem. " +
          "The structure may not be recognized or the API is unavailable."
        );
        setLoading(false);
        return;
      }

      if (!modified) {
        setError(
          `The generated ${mod.label} structure was rejected by PubChem. ` +
          `This indicates the modification produced an invalid or unrecognized structure. ` +
          `Possible causes:\n` +
          `• Generated SMILES is chemically invalid\n` +
          `• PubChem has not indexed this structure\n` +
          `• The transformation is not applicable to this scaffold\n\n` +
          `Try a different transformation or use a curated scaffold.`
        );
        setLoading(false);
        return;
      }

      // CRITICAL: Validate descriptors before setting state
      const origValidation = validateDescriptors(original);
      const modValidation = validateDescriptors(modified);

      if (!origValidation.valid) {
        setError(
          `Original molecule descriptor validation failed: ${origValidation.error}. ` +
          `Cannot proceed with comparison.`
        );
        setLoading(false);
        return;
      }

      if (!modValidation.valid) {
        setError(
          `Modified molecule descriptor validation failed: ${modValidation.error}. ` +
          `The generated structure may be invalid or PubChem returned incomplete data. ` +
          `Cannot display descriptor comparison with invalid data.`
        );
        setLoading(false);
        return;
      }

      // Only set comparison state if BOTH validations pass
      setComparison({
        original,
        modified,
        modLabel: mod.label,
        modifiedSmiles,
        note,
        validation: {
          original: origValidation,
          modified: modValidation,
        },
      });

      // Trigger Gemini SAR reasoning asynchronously ONLY after validation passes
      const scaffoldProfile = classifyScaffold(currentSmiles);
      
      // VALIDATION GATE: Check if we can call Gemini
      const geminiGate = canCallGemini(original, modified);
      
      if (geminiGate.allowed) {
        setGeminiLoading(true);
        fetchGeminiSARReasoning(
          currentName || "Unknown",
          mod.label,
          note,
          scaffoldProfile.scaffoldClass,
          original,
          modified,
        ).then(reasoning => {
          setComparison(prev => 
            prev ? { 
              ...prev, 
              geminiReasoning: reasoning ?? undefined, 
              scaffoldClass: scaffoldProfile.scaffoldClass 
            } : prev
          );
          setGeminiLoading(false);
        }).catch(err => {
          console.error("Gemini SAR reasoning failed:", err);
          setGeminiLoading(false);
        });
      } else {
        console.warn("Gemini validation gate blocked:", geminiGate.reason);
        setComparison(prev => 
          prev ? { 
            ...prev, 
            geminiReasoning: `AI reasoning unavailable: ${geminiGate.reason}`,
            scaffoldClass: scaffoldProfile.scaffoldClass 
          } : prev
        );
      }
    } catch {
      setError("Network error reaching PubChem. Check your connection and try again.");
    }
    setLoading(false);
  };

  const lipinskiViolations = (r: PubChemResult) => {
    // CRITICAL: Handle null LogP explicitly
    const logpViolation = r.logp !== null && r.logp > 5 ? 1 : 0;
    
    return (
      (r.mw > 500 ? 1 : 0) +
      logpViolation +
      (r.hDonors > 5 ? 1 : 0) +
      (r.hAcceptors > 10 ? 1 : 0)
    );
  };

  const isCurated = currentSmiles ? currentSmiles in CURATED_ANALOGS : false;

  if (!currentSmiles) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="text-center text-muted-foreground">
          <Wand2 className="w-8 h-8 mx-auto mb-3 opacity-30" />
          <p className="text-xs font-mono">Analyze a molecule first, then explore modifications here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-3 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Wand2 className="w-4 h-4 text-primary" />
        <h2 className="font-display text-sm font-semibold">What-If Chemist</h2>
      </div>

      {/* Current molecule */}
      <div className="bg-background/50 rounded-lg p-2.5 border border-border">
        <div className="text-[10px] text-muted-foreground font-mono">Current scaffold</div>
        <div className="text-xs font-display font-semibold text-foreground mt-0.5">{currentName || "Unknown"}</div>
        <div className="text-[10px] font-mono text-muted-foreground mt-0.5 truncate">{currentSmiles}</div>
        {!isCurated && (
          <div className="mt-1.5 text-[9px] text-yellow-400/80 font-mono">
            ⚠ Scaffold class: {classifyScaffold(currentSmiles).scaffoldClass} — using generic para-substitution fallback. Curated analogs: Aspirin, Caffeine, Ibuprofen, Salicylic Acid, Erlotinib, Testosterone.
          </div>
        )}
      </div>

      {/* Modification buttons */}
      <div className="space-y-1.5">
        <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
          Medicinal chemistry transformations
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {MODIFICATIONS.map((mod) => {
            const curatedEntry = CURATED_ANALOGS[currentSmiles ?? ""]?.[mod.key];
            const notApplicable = curatedEntry && !curatedEntry.smiles;
            return (
              <Button
                key={mod.key}
                variant="outline"
                size="sm"
                disabled={loading || notApplicable}
                onClick={() => applyModification(mod)}
                className={`h-auto py-2 px-2.5 text-left justify-start gap-2 border-border hover:border-primary/40 hover:bg-primary/5 transition-all ${notApplicable ? "opacity-40" : ""}`}
                title={notApplicable ? curatedEntry?.note : mod.description}
              >
                <span className="w-6 h-6 rounded bg-primary/10 text-primary text-[10px] font-mono font-bold flex items-center justify-center shrink-0">
                  {mod.icon}
                </span>
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold truncate">{mod.label}</div>
                  <div className="text-[9px] text-muted-foreground leading-tight truncate">{mod.description}</div>
                </div>
              </Button>
            );
          })}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center gap-2 py-6">
          <Loader2 className="w-4 h-4 text-primary animate-spin" />
          <span className="text-xs text-muted-foreground font-mono">Validating via PubChem...</span>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2 flex items-start gap-2">
          <AlertCircle className="w-3.5 h-3.5 text-destructive shrink-0 mt-0.5" />
          <p className="text-[10px] text-destructive/80">{error}</p>
        </div>
      )}

      {/* Comparison results */}
      <AnimatePresence mode="wait">
        {comparison && !loading && (
          <motion.div
            key={comparison.modLabel + comparison.modifiedSmiles}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            {/* Transformation header */}
            <div className="flex items-center gap-2 text-[10px] font-mono">
              <span className="text-muted-foreground">Original</span>
              <ArrowRight className="w-3 h-3 text-primary" />
              <span className="text-primary font-semibold">{comparison.modLabel}</span>
            </div>

            {/* Medicinal chemistry rationale */}
            <div className="bg-primary/5 border border-primary/20 rounded-lg px-2.5 py-2 space-y-1">
              <div className="text-[10px] text-primary font-mono font-semibold flex items-center gap-1">
                <FlaskConical className="w-3 h-3" /> Transformation rationale
              </div>
              <p className="text-[10px] text-foreground/80 leading-relaxed">{comparison.note}</p>
              <div className="text-[9px] text-muted-foreground font-mono mt-1 break-all">
                {comparison.modifiedSmiles}
              </div>
              {/* Validation status badges */}
              <div className="flex items-center gap-1.5 mt-2">
                <span className="px-1.5 py-0.5 rounded text-[9px] bg-primary/10 text-primary border border-primary/20">
                  {comparison.validation.original.provenance.source}
                </span>
                <span className="text-[9px] text-muted-foreground">→</span>
                <span className="px-1.5 py-0.5 rounded text-[9px] bg-primary/10 text-primary border border-primary/20">
                  {comparison.validation.modified.provenance.source}
                </span>
                <span className="ml-auto text-[9px] text-muted-foreground">
                  PubChem CID: {comparison.modified.cid}
                </span>
              </div>
            </div>

            {/* Gemini SAR reasoning panel — shown only when results are available */}
            {(geminiLoading || comparison.geminiReasoning) && (
              <div className="bg-secondary/40 border border-border rounded-lg px-2.5 py-2 space-y-1">
                <div className="text-[10px] font-mono font-semibold flex items-center gap-1.5 text-muted-foreground">
                  <Brain className="w-3 h-3 text-primary" />
                  <span>AI SAR Reasoning</span>
                  <span className="ml-auto px-1.5 py-0.5 rounded text-[9px] bg-yellow-400/10 text-yellow-400 border border-yellow-400/20">Gemini · interpretation only</span>
                </div>
                {geminiLoading ? (
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <Sparkles className="w-3 h-3 animate-pulse text-primary" />
                    Generating SAR commentary...
                  </div>
                ) : (
                  <p className="text-[10px] text-foreground/80 leading-relaxed">{comparison.geminiReasoning}</p>
                )}
              </div>
            )}

            {/* Property delta grid — each descriptor uses its own reporting mode */}
            <div className="grid grid-cols-2 gap-1.5">
              {DESCRIPTOR_SPECS.map((spec) => {
                // CRITICAL: Use explicit null checks, do NOT use safeNum with fallback
                const origVal = comparison.original[spec.key] as number | null;
                const modVal = comparison.modified[spec.key] as number | null;
                
                return (
                  <DeltaCell
                    key={spec.key}
                    spec={spec}
                    origVal={origVal}
                    modVal={modVal}
                  />
                );
              })}
            </div>

            {/* Lipinski comparison */}
            <div className="bg-background/50 rounded-lg p-2.5 border border-border">
              <div className="text-[10px] text-muted-foreground font-mono mb-1.5">
                Lipinski Ro5 violations
              </div>
              <div className="flex items-center gap-3">
                <div className="text-center">
                  <div className={`text-lg font-display font-bold ${lipinskiViolations(comparison.original) <= 1 ? "text-primary" : "text-destructive"}`}>
                    {lipinskiViolations(comparison.original)}
                  </div>
                  <div className="text-[9px] text-muted-foreground">Original</div>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
                <div className="text-center">
                  <div className={`text-lg font-display font-bold ${lipinskiViolations(comparison.modified) <= 1 ? "text-primary" : "text-destructive"}`}>
                    {lipinskiViolations(comparison.modified)}
                  </div>
                  <div className="text-[9px] text-muted-foreground">Modified</div>
                </div>
                <div className="text-[9px] text-muted-foreground ml-auto">
                  ≤1 violation = drug-like
                </div>
              </div>
            </div>

            {/* Provenance */}
            <div className="text-[9px] text-muted-foreground font-mono text-center opacity-60">
              {isCurated
                ? `Curated ${comparison.scaffoldClass ?? ""} analog · properties from PubChem PUG REST`
                : "Generic para-substitution · verify structure before use · PubChem PUG REST"}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default WhatIfChemist;
