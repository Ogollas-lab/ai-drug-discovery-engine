import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Shield,
  FileCheck,
  GitBranch,
  AlertTriangle,
  CheckCircle2,
  Database,
  Lock,
  Beaker,
  ExternalLink,
  Filter,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DATASET_REGISTRY,
  scanRegistry,
  buildProvenanceTrail,
  tierForLicense,
  COMMERCIAL_SAFE_LICENSES,
  type UsageTier,
  type DatasetEntry,
} from "@/data/dataset-registry";

const tierStyles: Record<UsageTier, string> = {
  production: "bg-green-500/15 text-green-400 border-green-500/30",
  research: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  experimental: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  blocked: "bg-red-500/15 text-red-400 border-red-500/30",
};

const Governance = () => {
  const [tier, setTier] = useState<UsageTier | "all">("all");
  const [selected, setSelected] = useState<DatasetEntry | null>(null);

  const filtered = useMemo(
    () => (tier === "all" ? DATASET_REGISTRY : DATASET_REGISTRY.filter((d) => d.tier === tier)),
    [tier]
  );

  const issues = useMemo(() => scanRegistry("production"), []);
  const provenance = useMemo(
    () => (selected ? buildProvenanceTrail(selected.id, 6) : []),
    [selected]
  );

  const stats = useMemo(() => {
    const total = DATASET_REGISTRY.length;
    const prod = DATASET_REGISTRY.filter((d) => d.tier === "production").length;
    const research = DATASET_REGISTRY.filter((d) => d.tier === "research").length;
    const samples = DATASET_REGISTRY.reduce((s, d) => s + d.samples, 0);
    return { total, prod, research, samples };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-[1400px] mx-auto px-4 lg:px-6 pt-24 pb-20 space-y-8">
        {/* Hero */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            <span className="text-[10px] font-mono tracking-widest uppercase text-primary">
              Dataset Governance
            </span>
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight">
            License, Provenance & Compliance Registry
          </h1>
          <p className="text-sm text-muted-foreground max-w-3xl">
            Centralized control plane for every dataset entering the AI Drug Success Predictor
            training pipeline — license validation, provenance tracking, and research /
            commercial separation for ethical, scalable biomedical AI.
          </p>
        </motion.section>

        {/* Stat strip */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Datasets", value: stats.total, icon: Database },
            { label: "Production-safe", value: stats.prod, icon: CheckCircle2 },
            { label: "Research-only", value: stats.research, icon: Beaker },
            {
              label: "Samples (M)",
              value: (stats.samples / 1_000_000).toFixed(1),
              icon: GitBranch,
            },
          ].map(({ label, value, icon: Icon }) => (
            <Card key={label} className="glass-panel border-border/50">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <div className="text-lg font-display font-bold">{value}</div>
                  <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                    {label}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </section>

        <Tabs defaultValue="registry" className="space-y-4">
          <TabsList className="glass-panel">
            <TabsTrigger value="registry">Registry</TabsTrigger>
            <TabsTrigger value="compliance">
              Compliance
              {issues.length > 0 && (
                <Badge variant="outline" className="ml-2 text-[10px]">
                  {issues.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="provenance">Provenance</TabsTrigger>
            <TabsTrigger value="policy">Policy</TabsTrigger>
          </TabsList>

          {/* ---------- Registry ---------- */}
          <TabsContent value="registry" className="space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Filter by tier</span>
              </div>
              <Select value={tier} onValueChange={(v) => setTier(v as UsageTier | "all")}>
                <SelectTrigger className="w-[200px] h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All tiers</SelectItem>
                  <SelectItem value="production">Production-safe</SelectItem>
                  <SelectItem value="research">Research-only</SelectItem>
                  <SelectItem value="experimental">Experimental</SelectItem>
                  <SelectItem value="blocked">Blocked</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {filtered.map((d) => (
                <Card
                  key={d.id}
                  className={`glass-panel border-border/50 hover:border-primary/40 transition-colors cursor-pointer ${
                    selected?.id === d.id ? "border-primary/60" : ""
                  }`}
                  onClick={() => setSelected(d)}
                >
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="font-display font-semibold text-sm truncate">{d.name}</h3>
                        <p className="text-[10px] font-mono text-muted-foreground">{d.source}</p>
                      </div>
                      <Badge variant="outline" className={`text-[9px] ${tierStyles[d.tier]}`}>
                        {d.tier}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{d.description}</p>
                    <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono">
                      <Badge variant="secondary" className="text-[9px]">
                        {d.license}
                      </Badge>
                      <Badge variant="outline" className="text-[9px]">
                        {d.category}
                      </Badge>
                      <span className="text-muted-foreground">
                        {d.samples.toLocaleString()} samples
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {selected && (
              <Card className="glass-panel border-primary/30">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="font-display text-base">{selected.name}</CardTitle>
                      <p className="text-[10px] font-mono text-muted-foreground mt-0.5">
                        {selected.source} · v{selected.version}
                      </p>
                    </div>
                    <a href={selected.url} target="_blank" rel="noreferrer">
                      <Button variant="outline" size="sm" className="h-7 text-xs">
                        <ExternalLink className="w-3 h-3 mr-1.5" /> Source
                      </Button>
                    </a>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-xs">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Field label="License" value={selected.license} />
                    <Field label="Tier" value={selected.tier} />
                    <Field label="Commercial" value={selected.commercialUse} />
                    <Field
                      label="Last Validated"
                      value={new Date(selected.lastValidated).toLocaleDateString()}
                    />
                  </div>
                  <p className="text-muted-foreground">{selected.description}</p>
                  <div className="rounded-md border border-border/50 bg-secondary/30 p-3">
                    <div className="text-[10px] font-mono text-muted-foreground uppercase mb-1">
                      Citation
                    </div>
                    <p className="text-xs font-mono">{selected.citation}</p>
                  </div>
                  {selected.notes && (
                    <div className="rounded-md border border-yellow-500/30 bg-yellow-500/10 p-3 text-xs">
                      <span className="font-semibold text-yellow-400">Note · </span>
                      {selected.notes}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ---------- Compliance ---------- */}
          <TabsContent value="compliance" className="space-y-3">
            <Card className="glass-panel">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base font-display">
                  <FileCheck className="w-4 h-4 text-primary" />
                  Automated License Validation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Pre-training scan against the production tier. Datasets with restricted or
                  unknown licenses are blocked from commercial deployment automatically.
                </p>
                <div className="space-y-2">
                  {issues.length === 0 ? (
                    <div className="flex items-center gap-2 text-sm text-green-400">
                      <CheckCircle2 className="w-4 h-4" /> All datasets pass validation.
                    </div>
                  ) : (
                    issues.map((iss, i) => {
                      const d = DATASET_REGISTRY.find((x) => x.id === iss.datasetId);
                      const colour =
                        iss.severity === "critical"
                          ? "border-red-500/30 bg-red-500/5"
                          : iss.severity === "warning"
                          ? "border-yellow-500/30 bg-yellow-500/5"
                          : "border-border/50 bg-secondary/20";
                      return (
                        <div
                          key={i}
                          className={`flex items-start gap-3 rounded-md border p-3 ${colour}`}
                        >
                          <AlertTriangle
                            className={`w-4 h-4 mt-0.5 ${
                              iss.severity === "critical"
                                ? "text-red-400"
                                : iss.severity === "warning"
                                ? "text-yellow-400"
                                : "text-muted-foreground"
                            }`}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-display font-semibold">
                              {d?.name ?? iss.datasetId}
                            </div>
                            <div className="text-xs text-muted-foreground">{iss.message}</div>
                          </div>
                          <Badge variant="outline" className="text-[9px] uppercase">
                            {iss.severity}
                          </Badge>
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="glass-panel">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base font-display">
                  <Lock className="w-4 h-4 text-primary" />
                  Research vs Commercial Separation
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="rounded-md border border-green-500/30 bg-green-500/5 p-3 space-y-2">
                  <div className="flex items-center gap-2 text-green-400 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Production-Safe Pool
                  </div>
                  <p className="text-muted-foreground">
                    Datasets under {COMMERCIAL_SAFE_LICENSES.join(", ")} — eligible for
                    commercial AI products.
                  </p>
                  <div className="text-[10px] font-mono text-muted-foreground">
                    {DATASET_REGISTRY.filter((d) => tierForLicense(d.license) === "production")
                      .map((d) => d.name)
                      .join(" · ")}
                  </div>
                </div>
                <div className="rounded-md border border-blue-500/30 bg-blue-500/5 p-3 space-y-2">
                  <div className="flex items-center gap-2 text-blue-400 font-semibold">
                    <Beaker className="w-3.5 h-3.5" /> Research-Only Pool
                  </div>
                  <p className="text-muted-foreground">
                    Restricted to non-commercial research models and experimental notebooks.
                  </p>
                  <div className="text-[10px] font-mono text-muted-foreground">
                    {DATASET_REGISTRY.filter((d) => d.tier === "research")
                      .map((d) => d.name)
                      .join(" · ")}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ---------- Provenance ---------- */}
          <TabsContent value="provenance" className="space-y-3">
            <Card className="glass-panel">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base font-display">
                  <GitBranch className="w-4 h-4 text-primary" />
                  Provenance Lineage
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Every training sample is traced from source dataset through the ingestion
                  pipeline to the AI training run that consumed it.
                </p>
                <Select
                  value={selected?.id ?? ""}
                  onValueChange={(v) =>
                    setSelected(DATASET_REGISTRY.find((d) => d.id === v) ?? null)
                  }
                >
                  <SelectTrigger className="w-full md:w-[320px] h-9 text-xs">
                    <SelectValue placeholder="Select dataset to inspect lineage…" />
                  </SelectTrigger>
                  <SelectContent>
                    {DATASET_REGISTRY.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {selected && (
                  <div className="space-y-2 mt-2">
                    {provenance.map((p) => (
                      <div
                        key={p.sampleId}
                        className="rounded-md border border-border/50 bg-secondary/20 p-3 text-xs"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-mono text-primary">{p.sampleId}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(p.collectedAt).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {p.pipelineSteps.map((s) => (
                            <Badge key={s} variant="outline" className="text-[9px] font-mono">
                              {s}
                            </Badge>
                          ))}
                        </div>
                        <div className="text-[10px] font-mono text-muted-foreground mt-2">
                          → training run <span className="text-foreground">{p.trainingRunId}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ---------- Policy ---------- */}
          <TabsContent value="policy" className="space-y-3">
            <Card className="glass-panel">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base font-display">
                  <Shield className="w-4 h-4 text-primary" />
                  Dataset Licensing Strategy
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-xs leading-relaxed">
                <div>
                  <h4 className="font-display font-semibold text-sm mb-1">Preferred Licenses</h4>
                  <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
                    <li>Apache-2.0 — permissive, patent grant, commercial-safe</li>
                    <li>MIT — minimal restrictions, attribution required</li>
                    <li>CC BY 4.0 — open with attribution</li>
                    <li>Open-access scientific datasets fit for AI training and scaling</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-display font-semibold text-sm mb-1">Avoided Licenses</h4>
                  <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
                    <li>Datasets with unclear or restrictive commercial terms</li>
                    <li>Share-alike licenses propagated into commercial pipelines</li>
                    <li>Sources with unverified provenance or unknown lineage</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-display font-semibold text-sm mb-1">Governance Pillars</h4>
                  <ol className="list-decimal list-inside text-muted-foreground space-y-0.5">
                    <li>License Registry — central catalogue of source, version, and citation</li>
                    <li>Provenance Tracking — sample-level lineage to training runs</li>
                    <li>Tier Separation — research vs commercial pools enforced at training</li>
                    <li>Automated Validation — block restricted datasets before training</li>
                  </ol>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

const Field = ({ label, value }: { label: string; value: string }) => (
  <div>
    <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
      {label}
    </div>
    <div className="text-xs font-display font-semibold mt-0.5 capitalize">{value}</div>
  </div>
);

export default Governance;
