import { useState } from "react";
import { motion } from "framer-motion";
import { Database, ShieldCheck, AlertTriangle, Search, Loader2, ExternalLink, FlaskConical } from "lucide-react";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { groundMoleculeTarget, type GroundingReport, type GroundingStatus } from "@/lib/grounding";

const STATUS_STYLES: Record<GroundingStatus, { bg: string; text: string; icon: JSX.Element; label: string }> = {
  GROUNDED: {
    bg: "bg-primary/15 border-primary/40",
    text: "text-primary",
    icon: <ShieldCheck className="w-5 h-5" />,
    label: "GROUNDED",
  },
  "PARTIALLY GROUNDED": {
    bg: "bg-yellow-500/15 border-yellow-500/40",
    text: "text-yellow-400",
    icon: <AlertTriangle className="w-5 h-5" />,
    label: "PARTIALLY GROUNDED",
  },
  UNGROUNDED: {
    bg: "bg-red-500/15 border-red-500/40",
    text: "text-red-400",
    icon: <AlertTriangle className="w-5 h-5" />,
    label: "UNGROUNDED",
  },
};

const EXAMPLES: { mol: string; tgt: string; label: string }[] = [
  { mol: "Imatinib", tgt: "ABL1", label: "Imatinib → ABL1 (Gleevec)" },
  { mol: "Gefitinib", tgt: "EGFR", label: "Gefitinib → EGFR" },
  { mol: "Aspirin", tgt: "COX-1", label: "Aspirin → COX-1" },
  { mol: "Caffeine", tgt: "ABL1", label: "Caffeine → ABL1 (no evidence)" },
];

export default function Grounding() {
  const [molecule, setMolecule] = useState("Imatinib");
  const [target, setTarget] = useState("ABL1");
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<GroundingReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (mol = molecule, tgt = target) => {
    if (!mol.trim() || !tgt.trim()) return;
    setLoading(true);
    setError(null);
    setReport(null);
    try {
      const r = await groundMoleculeTarget(mol.trim(), tgt.trim());
      setReport(r);
    } catch (e: any) {
      setError(e?.message ?? "Grounding failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-[1400px] mx-auto px-6 pt-24 pb-16">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-md bg-primary/10 border border-primary/30 flex items-center justify-center">
              <Database className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-semibold">Data Grounding Engine</h1>
              <p className="text-xs text-muted-foreground font-mono">
                PubChem · ChEMBL · BindingDB · UniProt — validate experimental evidence before any prediction
              </p>
            </div>
          </div>
        </div>

        {/* Query form */}
        <Card className="p-5 glass-panel mb-6">
          <div className="grid md:grid-cols-[1fr_1fr_auto] gap-3">
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">Molecule (SMILES, InChI, or name)</label>
              <Input value={molecule} onChange={(e) => setMolecule(e.target.value)} placeholder="e.g. Imatinib or CC(=O)Oc1ccccc1C(=O)O" className="mt-1 font-mono" />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">Biological target (protein name / gene)</label>
              <Input value={target} onChange={(e) => setTarget(e.target.value)} placeholder="e.g. EGFR, ABL1, COX-1" className="mt-1 font-mono" />
            </div>
            <div className="flex items-end">
              <Button onClick={() => run()} disabled={loading} className="w-full md:w-auto">
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
                Ground
              </Button>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {EXAMPLES.map((ex) => (
              <button
                key={ex.label}
                onClick={() => {
                  setMolecule(ex.mol);
                  setTarget(ex.tgt);
                  run(ex.mol, ex.tgt);
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
            <p className="text-xs font-mono text-muted-foreground">Querying PubChem, ChEMBL, UniProt…</p>
          </Card>
        )}

        {report && <ReportView report={report} />}
      </main>
    </div>
  );
}

function ReportView({ report }: { report: GroundingReport }) {
  const s = STATUS_STYLES[report.status];
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Status banner */}
      <Card className={`p-5 border ${s.bg}`}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className={`flex items-center gap-3 ${s.text}`}>
            {s.icon}
            <div>
              <div className="text-[10px] uppercase tracking-wider font-mono opacity-70">Grounding Status</div>
              <div className="text-xl font-display font-semibold">{s.label}</div>
            </div>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className="font-mono text-[10px]">
              Known interaction: {report.knownInteraction ? "YES" : "NO"}
            </Badge>
            <Badge variant="outline" className="font-mono text-[10px]">
              Confidence: {report.confidence}
            </Badge>
          </div>
        </div>
        {report.notes.length > 0 && (
          <ul className="mt-3 space-y-1 text-xs text-muted-foreground font-mono">
            {report.notes.map((n, i) => (
              <li key={i}>• {n}</li>
            ))}
          </ul>
        )}
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Molecule */}
        <Card className="p-5 glass-panel">
          <h3 className="text-sm font-display font-semibold mb-3 flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-primary" /> Molecule
          </h3>
          <Row k="Query" v={report.molecule.query} mono />
          <Row k="Resolved as" v={report.molecule.resolvedAs.toUpperCase()} mono />
          <Row k="PubChem CID" v={report.molecule.pubchemCid ? String(report.molecule.pubchemCid) : "—"} mono link={report.molecule.pubchemCid ? `https://pubchem.ncbi.nlm.nih.gov/compound/${report.molecule.pubchemCid}` : undefined} />
          <Row k="ChEMBL ID" v={report.molecule.chemblId ?? "—"} mono link={report.molecule.chemblId ? `https://www.ebi.ac.uk/chembl/compound_report_card/${report.molecule.chemblId}/` : undefined} />
          {report.molecule.properties && (
            <div className="mt-3 grid grid-cols-3 gap-2 text-[11px] font-mono">
              <Stat label="MW" v={report.molecule.properties.mw.toFixed(1)} />
              <Stat label="LogP" v={String(report.molecule.properties.logp)} />
              <Stat label="TPSA" v={String(report.molecule.properties.tpsa)} />
              <Stat label="HBD" v={String(report.molecule.properties.hDonors)} />
              <Stat label="HBA" v={String(report.molecule.properties.hAcceptors)} />
              <Stat label="RotB" v={String(report.molecule.properties.rotBonds)} />
            </div>
          )}
        </Card>

        {/* Target */}
        <Card className="p-5 glass-panel">
          <h3 className="text-sm font-display font-semibold mb-3 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary" /> Target
          </h3>
          <Row k="Name" v={report.target.name} />
          <Row k="Organism" v={report.target.organism ?? "—"} />
          <Row k="UniProt" v={report.target.uniprotId ?? "—"} mono link={report.target.uniprotId ? `https://www.uniprot.org/uniprotkb/${report.target.uniprotId}` : undefined} />
          <Row k="ChEMBL Target" v={report.target.chemblTargetId ?? "—"} mono link={report.target.chemblTargetId ? `https://www.ebi.ac.uk/chembl/target_report_card/${report.target.chemblTargetId}/` : undefined} />
          {report.target.function && (
            <p className="mt-3 text-xs text-muted-foreground leading-relaxed">{report.target.function}</p>
          )}
        </Card>
      </div>

      {/* Experimental evidence */}
      <Card className="p-5 glass-panel">
        <h3 className="text-sm font-display font-semibold mb-3">Experimental binding evidence</h3>
        {report.experimentalEvidence.length === 0 ? (
          <p className="text-xs font-mono text-muted-foreground">none found</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono">
              <thead className="text-muted-foreground border-b border-border/40">
                <tr className="text-left">
                  <th className="py-2 pr-3">Type</th>
                  <th className="py-2 pr-3">Value</th>
                  <th className="py-2 pr-3">Units</th>
                  <th className="py-2 pr-3">pChEMBL</th>
                  <th className="py-2 pr-3">Assay</th>
                  <th className="py-2 pr-3">Doc</th>
                </tr>
              </thead>
              <tbody>
                {report.experimentalEvidence.slice(0, 15).map((e, i) => (
                  <tr key={i} className="border-b border-border/20">
                    <td className="py-2 pr-3 text-primary">{e.type}</td>
                    <td className="py-2 pr-3">{e.value ?? "—"}</td>
                    <td className="py-2 pr-3">{e.units ?? "—"}</td>
                    <td className="py-2 pr-3">{e.pchembl ?? "—"}</td>
                    <td className="py-2 pr-3 max-w-[360px] truncate text-muted-foreground" title={e.assayDescription}>
                      {e.assayDescription ?? "—"}
                    </td>
                    <td className="py-2 pr-3">
                      {e.documentChemblId ? (
                        <a className="text-primary hover:underline inline-flex items-center gap-1" target="_blank" rel="noreferrer" href={`https://www.ebi.ac.uk/chembl/document_report_card/${e.documentChemblId}/`}>
                          {e.documentChemblId} <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Similar ligands */}
      <Card className="p-5 glass-panel">
        <h3 className="text-sm font-display font-semibold mb-3">Similar known ligands acting on this target</h3>
        {report.similarLigands.length === 0 ? (
          <p className="text-xs font-mono text-muted-foreground">none found</p>
        ) : (
          <div className="grid md:grid-cols-2 gap-2">
            {report.similarLigands.map((l) => (
              <a
                key={l.chemblId}
                target="_blank"
                rel="noreferrer"
                href={`https://www.ebi.ac.uk/chembl/compound_report_card/${l.chemblId}/`}
                className="flex items-center justify-between border border-border/40 rounded-md px-3 py-2 hover:border-primary/40 transition-colors"
              >
                <div className="min-w-0">
                  <div className="text-xs font-mono text-primary">{l.chemblId}</div>
                  <div className="text-[11px] text-muted-foreground truncate">{l.name ?? l.smiles ?? "—"}</div>
                </div>
                <Badge variant="outline" className="font-mono text-[10px]">
                  sim {Math.round(l.similarity)}%
                </Badge>
              </a>
            ))}
          </div>
        )}
      </Card>

      {/* Sources */}
      <Card className="p-4 glass-panel">
        <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono text-muted-foreground">
          <span className="uppercase tracking-wider">Sources:</span>
          {report.sources.length === 0 ? <span>none</span> : report.sources.map((s) => (
            <Badge key={s} variant="outline" className="text-[10px]">{s}</Badge>
          ))}
        </div>
      </Card>
    </motion.div>
  );
}

function Row({ k, v, mono, link }: { k: string; v: string; mono?: boolean; link?: string }) {
  return (
    <div className="flex justify-between gap-3 py-1.5 border-b border-border/20 last:border-b-0">
      <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-mono">{k}</span>
      {link ? (
        <a href={link} target="_blank" rel="noreferrer" className={`text-xs text-primary hover:underline truncate inline-flex items-center gap-1 ${mono ? "font-mono" : ""}`}>
          {v} <ExternalLink className="w-3 h-3" />
        </a>
      ) : (
        <span className={`text-xs truncate ${mono ? "font-mono" : ""}`}>{v}</span>
      )}
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
