import { useState } from "react";
import { motion } from "framer-motion";
import { Puzzle, Search, Loader2, AlertTriangle, ShieldCheck, ExternalLink } from "lucide-react";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  evaluateCompatibility,
  listTargetProfiles,
  type CompatibilityReport,
  type Compatibility,
  type TargetClass,
} from "@/lib/compatibility";

const COLORS: Record<Compatibility, { bg: string; text: string }> = {
  High: { bg: "bg-primary/15 border-primary/40", text: "text-primary" },
  Medium: { bg: "bg-cyan-500/15 border-cyan-500/40", text: "text-cyan-400" },
  Low: { bg: "bg-yellow-500/15 border-yellow-500/40", text: "text-yellow-400" },
  Unlikely: { bg: "bg-red-500/15 border-red-500/40", text: "text-red-400" },
};

const EXAMPLES = [
  { mol: "Imatinib", tgt: "ABL1 kinase", cls: "kinase" as TargetClass, label: "Imatinib → ABL1 kinase" },
  { mol: "Estradiol", tgt: "Estrogen receptor", cls: "nuclear_receptor" as TargetClass, label: "Estradiol → ER" },
  { mol: "Aspirin", tgt: "Dopamine D2 receptor", cls: "gpcr" as TargetClass, label: "Aspirin → D2 (mismatch)" },
  { mol: "Saquinavir", tgt: "HIV protease", cls: "protease" as TargetClass, label: "Saquinavir → HIV protease" },
];

export default function Compatibility() {
  const [molecule, setMolecule] = useState("Imatinib");
  const [target, setTarget] = useState("ABL1 kinase");
  const [targetClass, setTargetClass] = useState<TargetClass | "auto">("auto");
  const [report, setReport] = useState<CompatibilityReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const profiles = listTargetProfiles();

  const run = async (mol = molecule, tgt = target, cls: TargetClass | "auto" = targetClass) => {
    if (!mol.trim() || !tgt.trim()) return;
    setLoading(true);
    setError(null);
    setReport(null);
    try {
      const r = await evaluateCompatibility(mol.trim(), tgt.trim(), cls === "auto" ? undefined : { targetClass: cls });
      setReport(r);
    } catch (e: any) {
      setError(e?.message ?? "Evaluation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-[1400px] mx-auto px-6 pt-24 pb-16">
        <div className="mb-8 flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-primary/10 border border-primary/30 flex items-center justify-center">
            <Puzzle className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-semibold">Structural Compatibility Engine</h1>
            <p className="text-xs text-muted-foreground font-mono">
              Binding-site fit analysis: pharmacophore coverage, physicochemistry, and similarity to known actives
            </p>
          </div>
        </div>

        <Card className="p-5 glass-panel mb-6">
          <div className="grid md:grid-cols-[1fr_1fr_220px_auto] gap-3">
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">Molecule</label>
              <Input value={molecule} onChange={(e) => setMolecule(e.target.value)} placeholder="SMILES or name" className="mt-1 font-mono" />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">Target</label>
              <Input value={target} onChange={(e) => setTarget(e.target.value)} placeholder="e.g. EGFR kinase, D2 receptor" className="mt-1 font-mono" />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">Target class</label>
              <Select value={targetClass} onValueChange={(v) => setTargetClass(v as any)}>
                <SelectTrigger className="mt-1 font-mono text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto-detect</SelectItem>
                  {profiles.map((p) => (
                    <SelectItem key={p.class} value={p.class}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={() => run()} disabled={loading} className="w-full md:w-auto">
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
                Evaluate
              </Button>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {EXAMPLES.map((ex) => (
              <button
                key={ex.label}
                onClick={() => {
                  setMolecule(ex.mol); setTarget(ex.tgt); setTargetClass(ex.cls);
                  run(ex.mol, ex.tgt, ex.cls);
                }}
                className="text-[10px] font-mono px-2 py-1 rounded border border-border/60 text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors"
              >
                {ex.label}
              </button>
            ))}
          </div>
        </Card>

        {error && (
          <Card className="p-4 border-red-500/40 bg-red-500/10 mb-6">
            <p className="text-sm text-red-300 font-mono">{error}</p>
          </Card>
        )}

        {loading && !report && (
          <Card className="p-10 glass-panel flex flex-col items-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <p className="text-xs font-mono text-muted-foreground">Analyzing binding-site compatibility…</p>
          </Card>
        )}

        {report && <ReportView report={report} />}
      </main>
    </div>
  );
}

function ReportView({ report }: { report: CompatibilityReport }) {
  const c = COLORS[report.score];
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Score banner */}
      <Card className={`p-5 border ${c.bg}`}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className={`flex items-center gap-3 ${c.text}`}>
            {report.mismatched ? <AlertTriangle className="w-6 h-6" /> : <ShieldCheck className="w-6 h-6" />}
            <div>
              <div className="text-[10px] uppercase tracking-wider font-mono opacity-70">Compatibility</div>
              <div className="text-2xl font-display font-semibold">{report.score}</div>
            </div>
            <div className="ml-4 font-mono text-3xl">{report.scoreNumeric}<span className="text-xs">/100</span></div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="font-mono text-[10px]">{report.target.label}</Badge>
            <Badge variant="outline" className="font-mono text-[10px]">
              Inferred class: {report.molecule.inferredClass.replace("_", " ")}
            </Badge>
            <Badge variant="outline" className="font-mono text-[10px]">
              Similarity expected: {report.similarity.expected}
              {report.similarity.observedTopPercent != null && ` · observed ${Math.round(report.similarity.observedTopPercent)}%`}
            </Badge>
          </div>
        </div>
        {/* progress */}
        <div className="mt-4 h-1.5 bg-border/30 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${report.scoreNumeric}%` }}
            transition={{ duration: 0.7 }}
            className={`h-full ${c.text.replace("text", "bg")}`}
          />
        </div>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Target requirements */}
        <Card className="p-5 glass-panel">
          <h3 className="text-sm font-display font-semibold mb-3">Known ligand requirements</h3>
          <Row k="Charge interaction" v={report.target.requires.chargeInteraction} />
          <Row k="H-bond pattern" v={report.target.requires.hbondPattern} />
          <Row k="Hydrophobic pocket" v={report.target.requires.hydrophobicPocket} />
          <Row k="Peptide mimicry" v={report.target.requires.peptideMimicry ? "required" : "not required"} />
          <Row k="Ligand class" v={report.target.requires.ligandClassHint.replace("_", " ")} />
          <Row k="Typical MW" v={`${report.target.requires.typicalMW[0]} – ${report.target.requires.typicalMW[1]} Da`} mono />
          <Row k="Typical LogP" v={`${report.target.requires.typicalLogP[0]} – ${report.target.requires.typicalLogP[1]}`} mono />
          <Row k="Typical TPSA" v={`${report.target.requires.typicalTPSA[0]} – ${report.target.requires.typicalTPSA[1]} Å²`} mono />
          {report.target.requires.pharmacophores.length > 0 && (
            <div className="mt-3">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono mb-1">Key pharmacophores</div>
              <div className="flex flex-wrap gap-1">
                {report.target.requires.pharmacophores.map((p) => (
                  <Badge key={p} variant="outline" className="text-[10px] font-mono">{p}</Badge>
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* Molecule features */}
        <Card className="p-5 glass-panel">
          <h3 className="text-sm font-display font-semibold mb-3">Molecule features</h3>
          <div className="grid grid-cols-3 gap-2 text-[11px] font-mono mb-3">
            <Stat label="MW" v={report.molecule.properties.mw.toFixed(1)} />
            <Stat label="LogP" v={String(report.molecule.properties.logp)} />
            <Stat label="TPSA" v={String(report.molecule.properties.tpsa)} />
            <Stat label="HBD" v={String(report.molecule.properties.hDonors)} />
            <Stat label="HBA" v={String(report.molecule.properties.hAcceptors)} />
            <Stat label="RotB" v={String(report.molecule.properties.rotBonds)} />
          </div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono mb-1">Functional groups</div>
          <div className="flex flex-wrap gap-1 mb-3">
            {report.molecule.functionalGroups.length === 0 ? (
              <span className="text-[11px] text-muted-foreground font-mono">none detected</span>
            ) : (
              report.molecule.functionalGroups.map((g) => (
                <Badge key={g} variant="outline" className="text-[10px] font-mono">{g}</Badge>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Reasoning */}
      <Card className="p-5 glass-panel">
        <h3 className="text-sm font-display font-semibold mb-3">Chemical reasoning</h3>
        <ul className="space-y-1.5 text-xs font-mono leading-relaxed">
          {report.reasoning.map((r, i) => (
            <li key={i} className="text-foreground/90">{r}</li>
          ))}
        </ul>
      </Card>

      {/* Missing features */}
      {report.missingFeatures.length > 0 && (
        <Card className="p-5 border-yellow-500/30 bg-yellow-500/5">
          <h3 className="text-sm font-display font-semibold mb-2 text-yellow-300">Key missing features</h3>
          <ul className="space-y-1 text-xs font-mono">
            {report.missingFeatures.map((m, i) => (
              <li key={i}>— {m}</li>
            ))}
          </ul>
        </Card>
      )}

      {/* Similar actives */}
      {report.similarity.actives.length > 0 && (
        <Card className="p-5 glass-panel">
          <h3 className="text-sm font-display font-semibold mb-3">Structurally similar known actives</h3>
          <div className="grid md:grid-cols-2 gap-2">
            {report.similarity.actives.map((a) => (
              <a
                key={a.chemblId}
                target="_blank"
                rel="noreferrer"
                href={`https://www.ebi.ac.uk/chembl/compound_report_card/${a.chemblId}/`}
                className="flex items-center justify-between border border-border/40 rounded-md px-3 py-2 hover:border-primary/40 transition-colors"
              >
                <div className="min-w-0">
                  <div className="text-xs font-mono text-primary inline-flex items-center gap-1">{a.chemblId} <ExternalLink className="w-3 h-3" /></div>
                  <div className="text-[10px] text-muted-foreground truncate font-mono">{a.smiles ?? "—"}</div>
                </div>
                <Badge variant="outline" className="font-mono text-[10px]">sim {Math.round(a.similarity)}%</Badge>
              </a>
            ))}
          </div>
        </Card>
      )}

      <Card className="p-4 glass-panel">
        <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono text-muted-foreground">
          <span className="uppercase tracking-wider">Sources:</span>
          {report.sources.map((s) => (
            <Badge key={s} variant="outline" className="text-[10px]">{s}</Badge>
          ))}
        </div>
      </Card>
    </motion.div>
  );
}

function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-3 py-1.5 border-b border-border/20 last:border-b-0">
      <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-mono">{k}</span>
      <span className={`text-xs ${mono ? "font-mono" : ""}`}>{v}</span>
    </div>
  );
}

function Stat({ label, v }: { label: string; v: string }) {
  return (
    <div className="border border-border/40 rounded-md px-2 py-1.5">
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-primary">{v}</div>
    </div>
  );
}
