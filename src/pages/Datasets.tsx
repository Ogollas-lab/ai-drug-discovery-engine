import { useState } from "react";
import { motion } from "framer-motion";
import {
  Database,
  Search,
  Loader2,
  ExternalLink,
  Boxes,
  FlaskConical,
  Pill,
  Dna,
  Layers,
  Sparkles,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  aggregateDatasetEvidence,
  type AggregatedDatasetReport,
} from "@/lib/datasets";
import { toast } from "sonner";

const SOURCE_CARDS = [
  {
    name: "Protein Data Bank",
    short: "PDB",
    icon: Boxes,
    desc: "3D protein structures with bound ligands. Used for docking validation, binding-site identification, and structure-based design.",
    accent: "text-primary",
  },
  {
    name: "BindingDB",
    short: "Affinities",
    icon: FlaskConical,
    desc: "Experimentally measured Ki / Kd / IC50 affinities. Trains and validates ML and QSAR models.",
    accent: "text-accent",
  },
  {
    name: "DrugBank",
    short: "Approved drugs",
    icon: Pill,
    desc: "Approved drugs, mechanisms of action, and targets. Powers repurposing and MoA analysis.",
    accent: "text-primary",
  },
  {
    name: "UniProt",
    short: "Targets",
    icon: Dna,
    desc: "Protein sequences and functional annotations for target identification and pathway analysis.",
    accent: "text-accent",
  },
  {
    name: "ZINC",
    short: "Virtual library",
    icon: Layers,
    desc: "Commercially available compounds for high-throughput virtual screening and ligand sourcing.",
    accent: "text-primary",
  },
];

const Datasets = () => {
  const [query, setQuery] = useState("EGFR");
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<AggregatedDatasetReport | null>(null);

  const run = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const r = await aggregateDatasetEvidence(query.trim());
      setReport(r);
      toast.success(
        `Aggregated ${r.pdb.length + r.uniprot.length + r.bindingdb.length + r.drugbank.length + r.zinc.length} records across 5 databases`
      );
    } catch {
      toast.error("Some sources failed. Partial results shown.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-[1400px] mx-auto px-6 pt-24 pb-16">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-2 mb-3">
            <Database className="w-5 h-5 text-primary" />
            <span className="font-mono text-xs uppercase tracking-widest text-primary/80">
              Enhanced Dataset Integration
            </span>
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-semibold tracking-tight mb-3">
            Grounded by 5 trusted scientific databases
          </h1>
          <p className="text-muted-foreground max-w-2xl">
            Every prediction is cross-checked against curated experimental,
            structural, and chemical sources to maximise accuracy and reduce
            hallucination.
          </p>
        </motion.div>

        {/* Sources grid */}
        <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-3 mb-10">
          {SOURCE_CARDS.map((s) => (
            <Card key={s.name} className="glass-panel p-4 border-border/50">
              <s.icon className={`w-5 h-5 mb-2 ${s.accent}`} />
              <div className="font-display font-semibold text-sm">{s.name}</div>
              <div className="font-mono text-[10px] text-muted-foreground mb-2 uppercase tracking-wider">
                {s.short}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
            </Card>
          ))}
        </div>

        {/* Query bar */}
        <Card className="glass-panel p-5 border-border/50 mb-6">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && run()}
                placeholder="Search a target, protein, or drug (e.g. EGFR, Imatinib, P00533)…"
                className="pl-10 font-mono text-sm"
              />
            </div>
            <Button onClick={run} disabled={loading} className="md:w-48">
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Aggregating…
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Aggregate Evidence
                </>
              )}
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            {["EGFR", "Imatinib", "Aspirin", "BRAF", "Insulin"].map((q) => (
              <button
                key={q}
                onClick={() => setQuery(q)}
                className="text-[11px] font-mono px-2 py-1 rounded border border-border/50 hover:border-primary/50 hover:text-primary transition"
              >
                {q}
              </button>
            ))}
          </div>
        </Card>

        {/* Results */}
        {report && (
          <Tabs defaultValue="pdb" className="w-full">
            <TabsList className="grid grid-cols-5 w-full max-w-3xl mb-4">
              <TabsTrigger value="pdb">PDB ({report.pdb.length})</TabsTrigger>
              <TabsTrigger value="uniprot">UniProt ({report.uniprot.length})</TabsTrigger>
              <TabsTrigger value="bindingdb">BindingDB ({report.bindingdb.length})</TabsTrigger>
              <TabsTrigger value="drugbank">DrugBank ({report.drugbank.length})</TabsTrigger>
              <TabsTrigger value="zinc">ZINC ({report.zinc.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="pdb" className="space-y-3">
              {report.pdb.length === 0 && <Empty source="PDB" />}
              {report.pdb.map((s) => (
                <Card key={s.pdbId} className="glass-panel p-4 border-border/50">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="font-mono">
                          {s.pdbId}
                        </Badge>
                        {s.method && (
                          <span className="text-[10px] font-mono text-muted-foreground uppercase">
                            {s.method}
                          </span>
                        )}
                        {s.resolution && (
                          <span className="text-[10px] font-mono text-primary">
                            {s.resolution} Å
                          </span>
                        )}
                      </div>
                      <div className="text-sm font-medium mb-2">{s.title}</div>
                      {s.ligands.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {s.ligands.map((l) => (
                            <Badge key={l.id} variant="secondary" className="text-[10px]">
                              {l.id} {l.name ? `· ${l.name}` : ""}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <a href={s.url} target="_blank" rel="noreferrer" className="text-primary">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="uniprot" className="space-y-3">
              {report.uniprot.length === 0 && <Empty source="UniProt" />}
              {report.uniprot.map((u) => (
                <Card key={u.accession} className="glass-panel p-4 border-border/50">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="font-mono">{u.accession}</Badge>
                        {u.organism && (
                          <span className="text-[10px] italic text-muted-foreground">
                            {u.organism}
                          </span>
                        )}
                        {u.sequenceLength && (
                          <span className="text-[10px] font-mono text-accent">
                            {u.sequenceLength} aa
                          </span>
                        )}
                      </div>
                      <div className="text-sm font-medium mb-1">{u.name}</div>
                      {u.function && (
                        <p className="text-xs text-muted-foreground line-clamp-3 mb-2">
                          {u.function}
                        </p>
                      )}
                      {u.keywords && (
                        <div className="flex flex-wrap gap-1">
                          {u.keywords.map((k) => (
                            <Badge key={k} variant="secondary" className="text-[10px]">
                              {k}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <a href={u.url} target="_blank" rel="noreferrer" className="text-primary">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="bindingdb" className="space-y-2">
              {report.bindingdb.length === 0 && <Empty source="BindingDB" hint="Try a query that resolves to a UniProt ID first." />}
              <div className="grid md:grid-cols-2 gap-2">
                {report.bindingdb.map((b, i) => (
                  <Card key={i} className="glass-panel p-3 border-border/50">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono text-primary">{b.affinityType}</span>
                      <span className="font-mono text-accent">
                        {b.value ?? "—"} {b.units}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 truncate">
                      {b.ligandName || "Unnamed ligand"}
                    </div>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="drugbank" className="space-y-3">
              {report.drugbank.length === 0 && <Empty source="DrugBank" />}
              {report.drugbank.map((d) => (
                <Card key={d.id} className="glass-panel p-4 border-border/50">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="font-mono">{d.id}</Badge>
                        <span className="text-sm font-medium">{d.name}</span>
                      </div>
                      {d.description && (
                        <p className="text-xs text-muted-foreground">{d.description}</p>
                      )}
                    </div>
                    <a href={d.url} target="_blank" rel="noreferrer" className="text-primary">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="zinc" className="space-y-2">
              {report.zinc.length === 0 && <Empty source="ZINC" />}
              <div className="grid md:grid-cols-2 gap-2">
                {report.zinc.map((z) => (
                  <Card key={z.zincId} className="glass-panel p-3 border-border/50">
                    <div className="flex items-center justify-between mb-1">
                      <Badge variant="outline" className="font-mono text-[10px]">
                        {z.zincId}
                      </Badge>
                      <a href={z.url} target="_blank" rel="noreferrer" className="text-primary">
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    {z.smiles && (
                      <div className="font-mono text-[10px] text-muted-foreground truncate">
                        {z.smiles}
                      </div>
                    )}
                    <div className="flex gap-3 mt-1 text-[10px] font-mono">
                      {z.mwt && <span className="text-accent">MW {z.mwt}</span>}
                      {z.logp && <span className="text-primary">logP {z.logp}</span>}
                      {z.purchasable && <span className="text-muted-foreground">{z.purchasable}</span>}
                    </div>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
};

const Empty = ({ source, hint }: { source: string; hint?: string }) => (
  <Card className="glass-panel p-6 border-border/50 text-center">
    <p className="text-sm text-muted-foreground">No {source} records returned for this query.</p>
    {hint && <p className="text-xs text-muted-foreground/70 mt-1">{hint}</p>}
  </Card>
);

export default Datasets;
