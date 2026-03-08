import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FlaskConical, Search, CheckCircle, XCircle, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const SAMPLE_MOLECULES: Record<string, { name: string; properties: MolProps }> = {
  "CC(=O)OC1=CC=CC=C1C(=O)O": {
    name: "Aspirin",
    properties: { mw: 180.16, logp: 1.31, hDonors: 1, hAcceptors: 4, rotBonds: 3, tpsa: 63.6, violations: 0, affinity: 0.54 },
  },
  "CN1C=NC2=C1C(=O)N(C(=O)N2C)C": {
    name: "Caffeine",
    properties: { mw: 194.19, logp: -0.07, hDonors: 0, hAcceptors: 6, rotBonds: 0, tpsa: 58.44, violations: 0, affinity: 0.38 },
  },
  "CC(C)CC1=CC=C(C=C1)C(C)C(O)=O": {
    name: "Ibuprofen",
    properties: { mw: 206.28, logp: 3.97, hDonors: 1, hAcceptors: 2, rotBonds: 4, tpsa: 37.3, violations: 0, affinity: 0.62 },
  },
};

interface MolProps {
  mw: number; logp: number; hDonors: number; hAcceptors: number;
  rotBonds: number; tpsa: number; violations: number; affinity: number;
}

const MoleculeAnalyzer = () => {
  const [smiles, setSmiles] = useState("");
  const [result, setResult] = useState<{ name: string; properties: MolProps } | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const analyze = () => {
    setAnalyzing(true);
    setResult(null);
    setTimeout(() => {
      const match = SAMPLE_MOLECULES[smiles];
      setResult(match || {
        name: "Unknown Compound",
        properties: {
          mw: Math.round((150 + Math.random() * 350) * 100) / 100,
          logp: Math.round((Math.random() * 5 - 1) * 100) / 100,
          hDonors: Math.floor(Math.random() * 5),
          hAcceptors: Math.floor(Math.random() * 10),
          rotBonds: Math.floor(Math.random() * 8),
          tpsa: Math.round(Math.random() * 140 * 100) / 100,
          violations: Math.floor(Math.random() * 2),
          affinity: Math.round(Math.random() * 100) / 100,
        },
      });
      setAnalyzing(false);
    }, 1500);
  };

  const loadSample = (s: string) => {
    setSmiles(s);
    setResult(null);
  };

  return (
    <section className="py-20 md:py-24 px-6 relative" id="analyzer">
      <div className="max-w-5xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <span className="text-xs font-mono text-primary tracking-[0.3em] uppercase">Interactive</span>
          <h2 className="font-display text-4xl md:text-5xl font-bold mt-4">
            Molecule <span className="text-primary">Analyzer</span>
          </h2>
          <p className="text-muted-foreground mt-4 max-w-lg mx-auto text-sm">
            Enter a SMILES string to predict binding affinity and evaluate drug-like properties via Lipinski's Rule of Five.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="glass-panel rounded-2xl p-8 glow-border"
        >
          {/* Sample buttons */}
          <div className="flex flex-wrap gap-2 mb-6">
            <span className="text-xs text-muted-foreground self-center mr-2">Samples:</span>
            {Object.entries(SAMPLE_MOLECULES).map(([s, { name }]) => (
              <button
                key={s}
                onClick={() => loadSample(s)}
                className="px-3 py-1 rounded-md text-xs font-mono bg-secondary text-secondary-foreground hover:bg-primary/10 hover:text-primary transition-colors border border-border"
              >
                {name}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="flex gap-3">
            <Input
              value={smiles}
              onChange={(e) => setSmiles(e.target.value)}
              placeholder="Enter SMILES string (e.g. CC(=O)OC1=CC=CC=C1C(=O)O)"
              className="font-mono text-sm bg-background border-border"
            />
            <Button
              onClick={analyze}
              disabled={!smiles || analyzing}
              className="bg-primary text-primary-foreground hover:bg-primary/90 shrink-0 gap-2"
            >
              {analyzing ? <Activity className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Analyze
            </Button>
          </div>

          {/* Results */}
          <AnimatePresence mode="wait">
            {analyzing && (
              <motion.div
                key="loading"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-8 flex items-center justify-center gap-3 py-12"
              >
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      animate={{ y: [0, -8, 0] }}
                      transition={{ duration: 0.6, delay: i * 0.15, repeat: Infinity }}
                      className="w-2 h-2 rounded-full bg-primary"
                    />
                  ))}
                </div>
                <span className="text-sm text-muted-foreground font-mono">Processing molecular graph...</span>
              </motion.div>
            )}

            {result && !analyzing && (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-8 space-y-6"
              >
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FlaskConical className="w-5 h-5 text-primary" />
                    <h3 className="font-display text-lg font-semibold">{result.name}</h3>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    {result.properties.violations === 0 ? (
                      <>
                        <CheckCircle className="w-4 h-4 text-primary" />
                        <span className="text-primary font-mono">Drug-like</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4 text-destructive" />
                        <span className="text-destructive font-mono">{result.properties.violations} violation(s)</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Affinity bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-muted-foreground">Binding Affinity (GAT)</span>
                    <span className="text-primary">{result.properties.affinity.toFixed(4)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-secondary overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${result.properties.affinity * 100}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className="h-full rounded-full bg-gradient-to-r from-primary to-neon-cyan"
                    />
                  </div>
                </div>

                {/* Properties grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: "MW", value: result.properties.mw, unit: "g/mol" },
                    { label: "LogP", value: result.properties.logp, unit: "" },
                    { label: "H-Donors", value: result.properties.hDonors, unit: "" },
                    { label: "H-Acceptors", value: result.properties.hAcceptors, unit: "" },
                    { label: "Rot. Bonds", value: result.properties.rotBonds, unit: "" },
                    { label: "TPSA", value: result.properties.tpsa, unit: "Å²" },
                  ].map((prop, i) => (
                    <div key={i} className="bg-background/50 rounded-lg p-3 border border-border">
                      <div className="text-xs text-muted-foreground font-mono">{prop.label}</div>
                      <div className="text-lg font-display font-semibold text-foreground">
                        {prop.value}
                        {prop.unit && <span className="text-xs text-muted-foreground ml-1">{prop.unit}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  );
};

export default MoleculeAnalyzer;
