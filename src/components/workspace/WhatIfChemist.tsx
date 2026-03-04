import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wand2, ArrowRight, TrendingUp, TrendingDown, Minus, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchPubChemBySMILES, type PubChemResult } from "@/lib/pubchem";

interface WhatIfChemistProps {
  currentSmiles: string | null;
  currentName: string | null;
}

interface Modification {
  label: string;
  description: string;
  icon: string;
  apply: (smiles: string) => string;
}

const MODIFICATIONS: Modification[] = [
  {
    label: "Add –F",
    description: "Fluorine increases metabolic stability & membrane permeability",
    icon: "F",
    apply: (s) => s.replace(/C(=C|=O)?(\)|\])?$/, "C(F)$1$2") || s + "F",
  },
  {
    label: "Add –Cl",
    description: "Chlorine enhances lipophilicity & binding interactions",
    icon: "Cl",
    apply: (s) => s.replace(/C(=C|=O)?(\)|\])?$/, "C(Cl)$1$2") || s + "Cl",
  },
  {
    label: "Add –OH",
    description: "Hydroxyl improves solubility but may reduce permeability",
    icon: "OH",
    apply: (s) => s.replace(/C(\)|\])?$/, "C(O)$1") || s + "O",
  },
  {
    label: "Add –CH₃",
    description: "Methyl group blocks metabolism sites & increases lipophilicity",
    icon: "Me",
    apply: (s) => s.replace(/C(\)|\])?$/, "C(C)$1") || s + "C",
  },
  {
    label: "Add –NH₂",
    description: "Amino group adds H-bond donors, may improve target engagement",
    icon: "NH₂",
    apply: (s) => s.replace(/C(\)|\])?$/, "C(N)$1") || s + "N",
  },
  {
    label: "Add –CF₃",
    description: "Trifluoromethyl increases metabolic stability & lipophilicity",
    icon: "CF₃",
    apply: (s) => s.replace(/C(\)|\])?$/, "C(C(F)(F)F)$1") || s + "C(F)(F)F",
  },
];

interface ComparisonResult {
  original: PubChemResult;
  modified: PubChemResult;
  modLabel: string;
  modifiedSmiles: string;
}

const DeltaIndicator = ({ original, modified, label, unit, higherIsBetter }: {
  original: number; modified: number; label: string; unit?: string; higherIsBetter?: boolean;
}) => {
  const delta = modified - original;
  const pct = original !== 0 ? ((delta / original) * 100) : 0;
  const isPositive = higherIsBetter ? delta > 0 : delta < 0;
  const isNeutral = Math.abs(delta) < 0.01;

  return (
    <div className="bg-background/50 rounded-lg p-2.5 border border-border">
      <div className="text-[10px] text-muted-foreground font-mono mb-1">{label}</div>
      <div className="flex items-end justify-between">
        <div className="text-sm font-display font-semibold text-foreground">
          {modified.toFixed(2)}{unit && <span className="text-[10px] text-muted-foreground ml-0.5">{unit}</span>}
        </div>
        {!isNeutral && (
          <div className={`flex items-center gap-0.5 text-[10px] font-mono ${isPositive ? "text-primary" : "text-destructive"}`}>
            {delta > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {delta > 0 ? "+" : ""}{pct.toFixed(1)}%
          </div>
        )}
        {isNeutral && (
          <div className="flex items-center gap-0.5 text-[10px] font-mono text-muted-foreground">
            <Minus className="w-3 h-3" /> 0%
          </div>
        )}
      </div>
    </div>
  );
};

const WhatIfChemist = ({ currentSmiles, currentName }: WhatIfChemistProps) => {
  const [loading, setLoading] = useState(false);
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const applyModification = async (mod: Modification) => {
    if (!currentSmiles) return;
    setLoading(true);
    setError(null);
    setComparison(null);

    const modifiedSmiles = mod.apply(currentSmiles);

    try {
      const [original, modified] = await Promise.all([
        fetchPubChemBySMILES(currentSmiles),
        fetchPubChemBySMILES(modifiedSmiles),
      ]);

      if (!original) {
        setError("Could not fetch original compound data from PubChem.");
        setLoading(false);
        return;
      }

      if (!modified) {
        setError("PubChem could not resolve the modified structure. Try a different modification.");
        setLoading(false);
        return;
      }

      setComparison({ original, modified, modLabel: mod.label, modifiedSmiles });
    } catch {
      setError("Network error. Please try again.");
    }
    setLoading(false);
  };

  const violations = (r: PubChemResult) =>
    (r.mw > 500 ? 1 : 0) + (r.logp > 5 ? 1 : 0) + (r.hDonors > 5 ? 1 : 0) + (r.hAcceptors > 10 ? 1 : 0);

  if (!currentSmiles) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="text-center text-muted-foreground">
          <Wand2 className="w-8 h-8 mx-auto mb-3 opacity-30" />
          <p className="text-xs font-mono">Analyze a molecule first, then try modifications here</p>
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
      </div>

      {/* Modification buttons */}
      <div className="space-y-1.5">
        <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Modify scaffold</div>
        <div className="grid grid-cols-2 gap-1.5">
          {MODIFICATIONS.map((mod) => (
            <Button
              key={mod.label}
              variant="outline"
              size="sm"
              disabled={loading}
              onClick={() => applyModification(mod)}
              className="h-auto py-2 px-2.5 text-left justify-start gap-2 border-border hover:border-primary/40 hover:bg-primary/5 transition-all"
            >
              <span className="w-6 h-6 rounded bg-primary/10 text-primary text-[10px] font-mono font-bold flex items-center justify-center shrink-0">
                {mod.icon}
              </span>
              <div className="min-w-0">
                <div className="text-[11px] font-semibold truncate">{mod.label}</div>
                <div className="text-[9px] text-muted-foreground leading-tight truncate">{mod.description}</div>
              </div>
            </Button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center gap-2 py-6">
          <Loader2 className="w-4 h-4 text-primary animate-spin" />
          <span className="text-xs text-muted-foreground font-mono">Fetching from PubChem...</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2 flex items-start gap-2">
          <AlertCircle className="w-3.5 h-3.5 text-destructive shrink-0 mt-0.5" />
          <p className="text-[10px] text-destructive/80">{error}</p>
        </div>
      )}

      {/* Comparison results */}
      <AnimatePresence mode="wait">
        {comparison && !loading && (
          <motion.div
            key={comparison.modLabel}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            {/* Modification arrow */}
            <div className="flex items-center gap-2 text-[10px] font-mono">
              <span className="text-muted-foreground">Original</span>
              <ArrowRight className="w-3 h-3 text-primary" />
              <span className="text-primary font-semibold">{comparison.modLabel}</span>
            </div>

            {/* Modified SMILES */}
            <div className="bg-primary/5 border border-primary/20 rounded-lg px-2.5 py-2">
              <div className="text-[10px] text-primary font-mono">Modified SMILES</div>
              <div className="text-[10px] font-mono text-foreground/80 mt-0.5 break-all">{comparison.modifiedSmiles}</div>
            </div>

            {/* Property comparison grid */}
            <div className="grid grid-cols-2 gap-1.5">
              <DeltaIndicator original={comparison.original.mw} modified={comparison.modified.mw} label="MW" unit="g/mol" />
              <DeltaIndicator original={comparison.original.logp} modified={comparison.modified.logp} label="LogP" higherIsBetter={false} />
              <DeltaIndicator original={comparison.original.hDonors} modified={comparison.modified.hDonors} label="H-Donors" />
              <DeltaIndicator original={comparison.original.hAcceptors} modified={comparison.modified.hAcceptors} label="H-Acceptors" />
              <DeltaIndicator original={comparison.original.rotBonds} modified={comparison.modified.rotBonds} label="Rot. Bonds" />
              <DeltaIndicator original={comparison.original.tpsa} modified={comparison.modified.tpsa} label="TPSA" unit="Å²" />
            </div>

            {/* Lipinski comparison */}
            <div className="bg-background/50 rounded-lg p-2.5 border border-border">
              <div className="text-[10px] text-muted-foreground font-mono mb-1.5">Lipinski Violations</div>
              <div className="flex items-center gap-3">
                <div className="text-center">
                  <div className={`text-lg font-display font-bold ${violations(comparison.original) === 0 ? "text-primary" : "text-destructive"}`}>
                    {violations(comparison.original)}
                  </div>
                  <div className="text-[9px] text-muted-foreground">Original</div>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
                <div className="text-center">
                  <div className={`text-lg font-display font-bold ${violations(comparison.modified) === 0 ? "text-primary" : "text-destructive"}`}>
                    {violations(comparison.modified)}
                  </div>
                  <div className="text-[9px] text-muted-foreground">Modified</div>
                </div>
              </div>
            </div>

            {/* Data source badge */}
            <div className="text-[9px] text-muted-foreground font-mono text-center opacity-60">
              Real data from PubChem PUG REST API
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default WhatIfChemist;
