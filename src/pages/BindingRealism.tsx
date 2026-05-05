import { useState } from "react";
import { motion } from "framer-motion";
import {
  Brain,
  Search,
  Loader2,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  ShieldQuestion,
  Database,
  FlaskConical,
  Lightbulb,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  assessBindingRealism,
  type RealismReport,
  type BindingLikelihood,
  type RealismConfidence,
} from "@/lib/binding-realism";

const LIKELIHOOD_STYLES: Record<BindingLikelihood, { bg: string; text: string; icon: typeof ShieldCheck }> = {
  High:      { bg: "bg-primary/15 border-primary/40",     text: "text-primary",       icon: ShieldCheck },
  Moderate:  { bg: "bg-cyan-500/15 border-cyan-500/40",   text: "text-cyan-400",      icon: ShieldQuestion },
  Low:       { bg: "bg-yellow-500/15 border-yellow-500/40", text: "text-yellow-400",  icon: ShieldAlert },
  Unlikely:  { bg: "bg-red-500/15 border-red-500/40",     text: "text-red-400",       icon: AlertTriangle },
};

const CONFIDENCE_TEXT: Record<RealismConfidence, string> = {
  High: "text-primary",
  Medium: "text-cyan-400",
  Low: "text-yellow-400",
};

const EXAMPLES = [
  { mol: "Imatinib",    tgt: "ABL1 kinase",            label: "Imatinib → ABL1 (known)" },
  { mol: "Testosterone", tgt: "EGFR kinase",           label: "Testosterone → EGFR (mismatch)" },
  { mol: "Aspirin",     tgt: "COX-1",                  label: "Aspirin → COX-1 (known)" },
  { mol: "Caffeine",    tgt: "Dopamine D2 receptor",   label: "Caffeine → D2 (weak)" },
];

export default function BindingRealism() {
  const [molecule, setMolecule] = useState("Imatinib");
  const [target, setTarget] = useState("ABL1 kinase");
  const [report, setReport] = useState<RealismReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (mol = molecule, tgt = target) => {
    if (!mol.trim() || !tgt.trim()) return;
    setLoading(true);
    setError(null);
    setReport(null);
    try {
      const r = await assessBindingRealism(mol.trim(), tgt.trim());
      setReport(r);
    } catch (e: any) {
      setError(e?.message ?? "Assessment failed");
    } finally {
      setLoading(false);
    }
  };

  const LStyle = report ? LIKELIHOOD_STYLES[report.bindingLikelihood] : null;
  const LIcon = LStyle?.icon;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-[1400px] mx-auto px-6 pt-24 pb-16">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-md bg-primary/10 border border-primary/30 flex items-center justify-center">
              <Brain className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-2xl font-display font-semibold tracking-tight">Binding Realism</h1>
            <Badge variant="outline" className="text-[10px] font-mono">REALITY FILTER</Badge>
          </div>
          <p className="text-sm text-muted-foreground max-w-3xl">
            Scientifically skeptical binding assessment. Combines <span className="text-primary">experimental
            grounding</span> (ChEMBL/BindingDB), <span className="text-primary">structural similarity</span>, and
            a <span className="text-primary">reality filter</span> over the model output. Never claims "strong
            binding" without evidence.
          </p>
        </div>

        {/* Query */}
        <Card className="glass-panel p-5 mb-6 border-border/60">
          <div className="grid md:grid-cols-[1fr_1fr_auto] gap-3">
            <div>
              <label className="text-[11px] font-mono text-muted-foreground uppercase">Molecule (name or SMILES)</label>
              <Input value={molecule} onChange={(e) => setMolecule(e.target.value)} placeholder="e.g. Imatinib" />
            </div>
            <div>
              <label className="text-[11px] font-mono text-muted-foreground uppercase">Biological target</label>
              <Input value={target} onChange={(e) => setTarget(e.target.value)} placeholder="e.g. ABL1 kinase" />
            </div>
            <div className="flex items-end">
              <Button onClick={() => run()} disabled={loading} className="w-full md:w-auto">
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
                Assess
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            {EXAMPLES.map((e) => (
              <button
                key={e.label}
                onClick={() => { setMolecule(e.mol); setTarget(e.tgt); run(e.mol, e.tgt); }}
                className="text-[11px] font-mono px-2 py-1 rounded border border-border/60 hover:border-primary/40 hover:text-primary transition-colors"
              >
                {e.label}
              </button>
            ))}
          </div>
        </Card>

        {error && (
          <Card className="glass-panel p-4 mb-6 border-red-500/40 bg-red-500/5">
            <div className="flex items-center gap-2 text-sm text-red-400">
              <AlertTriangle className="w-4 h-4" /> {error}
            </div>
          </Card>
        )}

        {report && LStyle && LIcon && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid lg:grid-cols-3 gap-6"
          >
            {/* Verdict banner */}
            <Card className={`glass-panel p-5 lg:col-span-3 border ${LStyle.bg}`}>
              <div className="flex flex-wrap items-center gap-6">
                <div className="flex items-center gap-3">
                  <LIcon className={`w-8 h-8 ${LStyle.text}`} />
                  <div>
                    <div className="text-[11px] font-mono text-muted-foreground uppercase">Binding likelihood</div>
                    <div className={`text-2xl font-display font-semibold ${LStyle.text}`}>{report.bindingLikelihood}</div>
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-mono text-muted-foreground uppercase">Confidence</div>
                  <div className={`text-lg font-mono ${CONFIDENCE_TEXT[report.confidence]}`}>{report.confidence}</div>
                </div>
                <div className="flex-1 min-w-[200px]">
                  <div className="flex justify-between text-[11px] font-mono text-muted-foreground mb-1">
                    <span>Model raw {(report.rawModelScore * 100).toFixed(0)}%</span>
                    <span>Filtered {(report.adjustedModelScore * 100).toFixed(0)}%</span>
                  </div>
                  <Progress value={report.adjustedModelScore * 100} className="h-2" />
                </div>
                <div className="text-right">
                  <div className="text-[11px] font-mono text-muted-foreground uppercase">Known interaction</div>
                  <div className="text-sm font-mono max-w-md">{report.knownInteractionStatement}</div>
                </div>
              </div>
            </Card>

            {/* Reasoning */}
            <Card className="glass-panel p-5 lg:col-span-2 border-border/60">
              <div className="flex items-center gap-2 mb-3">
                <FlaskConical className="w-4 h-4 text-primary" />
                <h2 className="font-display font-semibold text-sm tracking-tight">Scientific Reasoning</h2>
              </div>
              <ul className="space-y-2 text-sm">
                {report.reasoning.map((r, i) => (
                  <li key={i} className="text-muted-foreground leading-relaxed">• {r}</li>
                ))}
              </ul>

              {report.warnings.length > 0 && (
                <div className="mt-5 p-3 rounded border border-yellow-500/30 bg-yellow-500/5">
                  <div className="flex items-center gap-2 text-yellow-400 text-xs font-mono uppercase mb-2">
                    <AlertTriangle className="w-3.5 h-3.5" /> Reality-filter warnings
                  </div>
                  <ul className="space-y-1 text-xs text-yellow-200/80">
                    {report.warnings.map((w, i) => (<li key={i}>• {w}</li>))}
                  </ul>
                </div>
              )}
            </Card>

            {/* Sources + suggestions */}
            <div className="space-y-6">
              <Card className="glass-panel p-5 border-border/60">
                <div className="flex items-center gap-2 mb-3">
                  <Database className="w-4 h-4 text-primary" />
                  <h3 className="font-display font-semibold text-sm tracking-tight">Data Sources</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {report.sources.length === 0 ? (
                    <span className="text-xs text-muted-foreground">No external sources resolved.</span>
                  ) : report.sources.map((s) => (
                    <Badge key={s} variant="outline" className="text-[10px] font-mono">{s}</Badge>
                  ))}
                </div>
                {report.grounding.experimentalEvidence.length > 0 && (
                  <div className="mt-4">
                    <div className="text-[11px] font-mono text-muted-foreground uppercase mb-2">Experimental records</div>
                    <ul className="space-y-1 text-xs font-mono">
                      {report.grounding.experimentalEvidence.slice(0, 5).map((a, i) => (
                        <li key={i} className="text-muted-foreground">
                          <span className="text-primary">{a.type}</span> {a.value ?? "?"} {a.units ?? ""}
                          {a.pchembl != null && <span className="text-cyan-400"> · pChEMBL {a.pchembl}</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {report.grounding.similarLigands.length > 0 && (
                  <div className="mt-4">
                    <div className="text-[11px] font-mono text-muted-foreground uppercase mb-2">Similar known ligands</div>
                    <ul className="space-y-1 text-xs font-mono">
                      {report.grounding.similarLigands.slice(0, 5).map((l) => (
                        <li key={l.chemblId} className="text-muted-foreground">
                          {l.name ?? l.chemblId} <span className="text-cyan-400">{Math.round(l.similarity)}%</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </Card>

              <Card className="glass-panel p-5 border-border/60">
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb className="w-4 h-4 text-primary" />
                  <h3 className="font-display font-semibold text-sm tracking-tight">Suggestions</h3>
                </div>
                {report.suggestions.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No structural recommendations — molecule profile already aligns with the target class.</p>
                ) : (
                  <ul className="space-y-1.5 text-xs text-muted-foreground">
                    {report.suggestions.map((s, i) => (<li key={i}>{s}</li>))}
                  </ul>
                )}
              </Card>
            </div>
          </motion.div>
        )}

        {!report && !loading && !error && (
          <Card className="glass-panel p-8 border-border/60 text-center">
            <ShieldQuestion className="w-10 h-10 text-primary/60 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              Enter a molecule and target above, or pick an example. Results are grounded in PubChem, ChEMBL,
              and UniProt — and a reality filter prevents over-confident predictions.
            </p>
          </Card>
        )}
      </main>
    </div>
  );
}
