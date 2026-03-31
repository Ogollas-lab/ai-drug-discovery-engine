import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FlaskConical, ArrowLeft, Play, Download, Trash2, CheckCircle, XCircle, ArrowUpDown, Database, Cpu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import FooterSection from "@/components/FooterSection";
import { generateMoleculeResultReal, type MoleculeResult } from "@/data/targets";

const SAMPLE_INPUT = `CC(=O)OC1=CC=CC=C1C(=O)O
CN1C=NC2=C1C(=O)N(C(=O)N2C)C
CC(C)CC1=CC=C(C=C1)C(C)C(O)=O
OC(=O)C1=CC=CC=C1O
CC12CCC3C(C1CCC2O)CCC4=CC(=O)CCC34C`;

const MAX_COMPOUNDS = 100;
const MAX_INPUT_LENGTH = 10000;

type SortKey = "affinity" | "mw" | "logp" | "tpsa" | "name";

const Screening = () => {
  const [input, setInput] = useState("");
  const [results, setResults] = useState<MoleculeResult[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [sortKey, setSortKey] = useState<SortKey>("affinity");
  const [sortAsc, setSortAsc] = useState(false);
  const [error, setError] = useState("");

  const handleScreen = async () => {
    setError("");
    const lines = input
      .split(/[\n,;]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && s.length < 300);

    if (lines.length === 0) {
      setError("Please enter at least one valid SMILES string.");
      return;
    }
    if (lines.length > MAX_COMPOUNDS) {
      setError(`Maximum ${MAX_COMPOUNDS} compounds allowed per batch.`);
      return;
    }

    setProcessing(true);
    setResults([]);
    setProgress(0);

    const batchResults: MoleculeResult[] = [];
    const invalidInputs: string[] = [];

    // Process in batches of 3 to avoid rate limiting PubChem
    for (let i = 0; i < lines.length; i += 3) {
      const batch = lines.slice(i, i + 3);
      const batchRes = await Promise.all(batch.map((s) => generateMoleculeResultReal(s)));
      
      batchRes.forEach((res, idx) => {
        if (res) batchResults.push(res);
        else invalidInputs.push(batch[idx]);
      });
      
      setProgress(Math.round(((i + batch.length) / lines.length) * 100));
    }

    batchResults.sort((a, b) => b.affinity - a.affinity);
    setResults(batchResults);
    if (invalidInputs.length > 0) {
      setError(`Could not resolve ${invalidInputs.length} input(s) in PubChem: ${invalidInputs.slice(0, 3).join(", ")}${invalidInputs.length > 3 ? "..." : ""}`);
    }
    setProcessing(false);
  };

  const sorted = [...results].sort((a, b) => {
    const va = a[sortKey];
    const vb = b[sortKey];
    if (typeof va === "string" && typeof vb === "string") return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
    return sortAsc ? (va as number) - (vb as number) : (vb as number) - (va as number);
  });

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  const pubchemCount = results.filter((r) => r.dataSource === "pubchem").length;

  const exportCsv = () => {
    const header = "Rank,Name,SMILES,Affinity,MW,LogP,H-Donors,H-Acceptors,TPSA,Violations,Drug-like,DataSource\n";
    const rows = sorted.map((r, i) =>
      `${i + 1},"${r.name}","${r.smiles}",${r.affinity},${r.mw},${r.logp},${r.hDonors},${r.hAcceptors},${r.tpsa},${r.violations},${r.drugLike},${r.dataSource}`
    ).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "screening_results.csv";
    a.click();
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-20 pb-16 px-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Link to="/">
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="font-display text-3xl md:text-4xl font-bold">
                Compound <span className="text-primary">Screening</span>
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Paste multiple SMILES strings to screen with real PubChem data and ranked binding affinity.
              </p>
            </div>
          </div>

          {/* Input area */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-panel rounded-2xl p-6 glow-border mb-8"
          >
            <div className="flex items-center justify-between mb-4">
              <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                SMILES Input (one per line, max {MAX_COMPOUNDS})
              </label>
              <button
                onClick={() => setInput(SAMPLE_INPUT)}
                className="text-xs font-mono text-primary hover:text-primary/80 transition-colors"
              >
                Load samples
              </button>
            </div>
            <Textarea
              value={input}
              onChange={(e) => {
                if (e.target.value.length <= MAX_INPUT_LENGTH) setInput(e.target.value);
              }}
              placeholder={"CC(=O)OC1=CC=CC=C1C(=O)O\nCN1C=NC2=C1C(=O)N(C(=O)N2C)C\n..."}
              rows={6}
              className="font-mono text-sm bg-background border-border resize-none mb-4"
            />
            {error && <p className="text-xs text-destructive mb-3 font-mono">{error}</p>}
            <div className="flex gap-3">
              <Button
                onClick={handleScreen}
                disabled={!input.trim() || processing}
                className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
              >
                <Play className="w-4 h-4" />
                {processing ? `Screening... ${progress}%` : "Screen Compounds"}
              </Button>
              {input && (
                <Button
                  variant="ghost"
                  onClick={() => { setInput(""); setResults([]); setError(""); }}
                  className="text-muted-foreground gap-2"
                >
                  <Trash2 className="w-4 h-4" /> Clear
                </Button>
              )}
            </div>
          </motion.div>

          {/* Loading */}
          {processing && (
            <div className="space-y-3 py-8">
              <div className="flex items-center justify-center gap-3">
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
                <span className="text-sm text-muted-foreground font-mono">Fetching real data from PubChem... {progress}%</span>
              </div>
              <div className="max-w-xs mx-auto h-1.5 rounded-full bg-secondary overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-neon-cyan"
                  animate={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Results */}
          <AnimatePresence>
            {sorted.length > 0 && !processing && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <FlaskConical className="w-5 h-5 text-primary" />
                    <span className="font-display font-semibold">
                      {sorted.length} compound{sorted.length !== 1 ? "s" : ""} ranked
                    </span>
                    <span className="text-[10px] font-mono text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                      {pubchemCount}/{sorted.length} from PubChem
                    </span>
                  </div>
                  <Button variant="ghost" onClick={exportCsv} className="text-muted-foreground gap-2 text-xs">
                    <Download className="w-4 h-4" /> Export CSV
                  </Button>
                </div>

                <div className="glass-panel rounded-2xl overflow-hidden glow-border overflow-x-auto">
                  <table className="w-full min-w-[800px]">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left px-4 py-3 text-xs font-mono text-muted-foreground w-12">#</th>
                        {([
                          ["name", "Compound"],
                          ["affinity", "Affinity"],
                          ["mw", "MW"],
                          ["logp", "LogP"],
                          ["tpsa", "TPSA"],
                        ] as [SortKey, string][]).map(([key, label]) => (
                          <th
                            key={key}
                            onClick={() => toggleSort(key)}
                            className="text-left px-4 py-3 text-xs font-mono text-muted-foreground cursor-pointer hover:text-foreground transition-colors select-none"
                          >
                            <span className="inline-flex items-center gap-1">
                              {label}
                              <ArrowUpDown className={`w-3 h-3 ${sortKey === key ? "text-primary" : "opacity-30"}`} />
                            </span>
                          </th>
                        ))}
                        <th className="text-left px-4 py-3 text-xs font-mono text-muted-foreground">Source</th>
                        <th className="text-left px-4 py-3 text-xs font-mono text-muted-foreground">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sorted.map((r, i) => (
                        <motion.tr
                          key={r.smiles}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: i * 0.03 }}
                          className="border-b border-border/30 hover:bg-primary/5 transition-colors"
                        >
                          <td className="px-4 py-3 text-xs font-mono text-muted-foreground">{i + 1}</td>
                          <td className="px-4 py-3">
                            <div className="text-sm font-semibold">{r.name}</div>
                            <div className="text-xs font-mono text-muted-foreground truncate max-w-[200px]">{r.smiles}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-1.5 rounded-full bg-secondary overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-gradient-to-r from-primary to-neon-cyan"
                                  style={{ width: `${r.affinity * 100}%` }}
                                />
                              </div>
                              <span className="text-sm font-mono text-primary">{r.affinity.toFixed(2)}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm font-mono text-foreground">{r.mw.toFixed(2)}</td>
                          <td className="px-4 py-3 text-sm font-mono text-foreground">{r.logp.toFixed(2)}</td>
                          <td className="px-4 py-3 text-sm font-mono text-foreground">{r.tpsa.toFixed(2)}</td>
                          <td className="px-4 py-3">
                            {r.dataSource === "pubchem" ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-mono text-primary">
                                <Database className="w-3 h-3" /> PubChem
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-mono text-muted-foreground">
                                <Cpu className="w-3 h-3" /> Model
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {r.drugLike ? (
                              <span className="inline-flex items-center gap-1 text-xs font-mono text-primary">
                                <CheckCircle className="w-3.5 h-3.5" /> Drug-like
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs font-mono text-destructive">
                                <XCircle className="w-3.5 h-3.5" /> {r.violations}v
                              </span>
                            )}
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      <FooterSection />
    </div>
  );
};

export default Screening;
