import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Activity, CheckCircle, XCircle, FlaskConical, Beaker, ToggleLeft, ToggleRight, Database, Cpu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SAMPLE_MOLECULES, generateMoleculeResultReal, type MoleculeResult, type TargetInfo } from "@/data/targets";
import ConceptTooltip from "@/components/ConceptTooltip";

interface WorkspaceAnalyzerProps {
  selectedTarget: TargetInfo | null;
  onResult: (result: MoleculeResult | null) => void;
  onSmilesChange?: (smiles: string, name: string) => void;
}

const WorkspaceAnalyzer = ({ selectedTarget, onResult, onSmilesChange }: WorkspaceAnalyzerProps) => {
  const [smiles, setSmiles] = useState("");
  const [result, setResult] = useState<MoleculeResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [expertMode, setExpertMode] = useState(false);

  const analyze = async () => {
    setAnalyzing(true);
    setResult(null);
    onResult(null);
    try {
      const res = await generateMoleculeResultReal(smiles);
      setResult(res);
      onResult(res);
      onSmilesChange?.(smiles, res.name);
    } catch {
      // Fallback handled inside generateMoleculeResultReal
    }
    setAnalyzing(false);
  };

  const loadSample = (s: string) => {
    setSmiles(s);
    setResult(null);
    onResult(null);
  };

  return (
    <div className="h-full flex flex-col overflow-y-auto">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Beaker className="w-4 h-4 text-primary" />
            <h2 className="font-display text-sm font-semibold">Molecule Analyzer</h2>
            {selectedTarget && (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-primary/10 text-primary border border-primary/20">
                {selectedTarget.gene}
              </span>
            )}
          </div>
          <button
            onClick={() => setExpertMode(!expertMode)}
            className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground hover:text-foreground transition-colors"
          >
            {expertMode ? <ToggleRight className="w-4 h-4 text-primary" /> : <ToggleLeft className="w-4 h-4" />}
            {expertMode ? "Expert" : "Student"}
          </button>
        </div>

        {/* Sample molecules */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {Object.entries(SAMPLE_MOLECULES).map(([s, { name }]) => (
            <button
              key={s}
              onClick={() => loadSample(s)}
              className="px-2 py-1 rounded text-[10px] font-mono bg-secondary text-secondary-foreground hover:bg-primary/10 hover:text-primary transition-colors border border-border"
            >
              {name}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="flex gap-2">
          <Input
            value={smiles}
            onChange={(e) => setSmiles(e.target.value)}
            placeholder="Enter SMILES string..."
            className="font-mono text-xs bg-background border-border"
          />
          <Button
            onClick={analyze}
            disabled={!smiles || analyzing}
            size="sm"
            className="bg-primary text-primary-foreground hover:bg-primary/90 shrink-0 gap-1.5"
          >
            {analyzing ? <Activity className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
            Analyze
          </Button>
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto p-4">
        <AnimatePresence mode="wait">
          {analyzing && (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center gap-3 py-16">
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <motion.div key={i} animate={{ y: [0, -8, 0] }} transition={{ duration: 0.6, delay: i * 0.15, repeat: Infinity }} className="w-2 h-2 rounded-full bg-primary" />
                ))}
              </div>
              <span className="text-xs text-muted-foreground font-mono">Fetching real data from PubChem...</span>
            </motion.div>
          )}

          {result && !analyzing && (
            <motion.div key="result" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
              {/* Name & Status */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FlaskConical className="w-4 h-4 text-primary" />
                  <h3 className="font-display font-semibold">{result.name}</h3>
                  {result.drugClass !== "Unknown" && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-secondary text-muted-foreground">{result.drugClass}</span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-xs">
                  {result.drugLike ? (
                    <>
                      <CheckCircle className="w-3.5 h-3.5 text-primary" />
                      <span className="text-primary font-mono">Drug-like</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-3.5 h-3.5 text-destructive" />
                      <span className="text-destructive font-mono">{result.violations} violation(s)</span>
                    </>
                  )}
                </div>
              </div>

              {/* Data source badge */}
              <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-mono border ${
                result.dataSource === "pubchem"
                  ? "bg-primary/10 text-primary border-primary/20"
                  : "bg-secondary text-muted-foreground border-border"
              }`}>
                {result.dataSource === "pubchem" ? <Database className="w-3 h-3" /> : <Cpu className="w-3 h-3" />}
                {result.dataSource === "pubchem" ? "Real data · PubChem" : "Predicted · Model"}
              </div>

              {/* Binding Affinity */}
              <div className="glass-panel rounded-xl p-4 glow-border space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-muted-foreground">Binding Affinity (GAT prediction)</span>
                  <span className="text-primary text-lg font-display font-bold">{result.affinity.toFixed(2)}</span>
                </div>
                <div className="h-2.5 rounded-full bg-secondary overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${result.affinity * 100}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="h-full rounded-full bg-gradient-to-r from-primary to-neon-cyan"
                  />
                </div>
                {!expertMode && (
                  <p className="text-[10px] text-muted-foreground">
                    Score ranges 0–1. Higher = stronger predicted binding. Affinity is model-estimated; physicochemical properties are from PubChem.
                  </p>
                )}
              </div>

              {/* Lipinski / Properties */}
              <div className="space-y-2">
                <div className="text-xs font-display font-semibold flex items-center gap-2">
                  <ConceptTooltip conceptKey="lipinski">Lipinski & Properties</ConceptTooltip>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "MW", value: result.mw, unit: "g/mol", key: "" },
                    { label: "LogP", value: result.logp, unit: "", key: "logp" },
                    { label: "H-Donors", value: result.hDonors, unit: "", key: "" },
                    { label: "H-Acceptors", value: result.hAcceptors, unit: "", key: "" },
                    { label: "Rot. Bonds", value: result.rotBonds, unit: "", key: "" },
                    { label: "TPSA", value: result.tpsa, unit: "Å²", key: "tpsa" },
                  ].map((prop) => (
                    <div key={prop.label} className="bg-background/50 rounded-lg p-2.5 border border-border">
                      <div className="text-[10px] text-muted-foreground font-mono">
                        {prop.key ? <ConceptTooltip conceptKey={prop.key}>{prop.label}</ConceptTooltip> : prop.label}
                      </div>
                      <div className="text-sm font-display font-semibold text-foreground">
                        {typeof prop.value === "number" ? prop.value.toFixed(2) : prop.value}
                        {prop.unit && <span className="text-[10px] text-muted-foreground ml-0.5">{prop.unit}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Multi-target profile (expert mode) */}
              {expertMode && (
                <div className="space-y-2">
                  <div className="text-xs font-display font-semibold">Multi-Target Profile</div>
                  <div className="space-y-1.5">
                    {result.offTargets.map((ot) => (
                      <div key={ot.target} className="flex items-center gap-2 text-[11px]">
                        <span className="text-muted-foreground font-mono w-14">{ot.target}</span>
                        <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                          <div
                            className={`h-full rounded-full ${ot.score > 0.7 ? "bg-destructive" : ot.score > 0.4 ? "bg-yellow-400" : "bg-primary"}`}
                            style={{ width: `${ot.score * 100}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-mono text-muted-foreground w-8 text-right">{ot.score.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default WorkspaceAnalyzer;
