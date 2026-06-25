import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import { Database, Cpu, GitBranch, Beaker, CheckCircle2, AlertTriangle, Play, Layers, ShieldCheck } from "lucide-react";
import Navbar from "@/components/Navbar";
import DemoBanner from "@/components/DemoBanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  runTrainingPipeline,
  loadSnapshot,
  runBatchTraining,
  loadBatchSnapshot,
  PRIORITY_DISEASE_QUERIES,
  type TrainingSnapshot,
  type BatchTrainingSnapshot,
} from "@/lib/training-pipeline";

const STAGES = [
  { key: "ingesting", label: "Ingest", icon: Database },
  { key: "preparing", label: "Prepare", icon: GitBranch },
  { key: "validating", label: "Validate", icon: CheckCircle2 },
  { key: "training", label: "Train", icon: Cpu },
  { key: "calibrating", label: "Calibrate", icon: Beaker },
];

export default function Training() {
  const [query, setQuery] = useState("EGFR kinase");
  const [stage, setStage] = useState<string>("idle");
  const [snapshot, setSnapshot] = useState<TrainingSnapshot | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [batch, setBatch] = useState<BatchTrainingSnapshot | null>(null);
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchProgress, setBatchProgress] = useState({
    done: 0,
    total: PRIORITY_DISEASE_QUERIES.length,
    current: "",
  });

  useEffect(() => {
    setSnapshot(loadSnapshot());
    setBatch(loadBatchSnapshot());
  }, []);

  async function run() {
    setRunning(true);
    setError(null);
    setStage("ingesting");
    try {
      const snap = await runTrainingPipeline({
        query,
        epochs: 14,
        onStage: setStage,
      });
      setSnapshot(snap);
      setStage("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Training failed");
      setStage("idle");
    } finally {
      setRunning(false);
    }
  }

  async function runBatch() {
    setBatchRunning(true);
    setError(null);
    setBatchProgress({
      done: 0,
      total: PRIORITY_DISEASE_QUERIES.length,
      current: PRIORITY_DISEASE_QUERIES[0].disease,
    });
    try {
      const snap = await runBatchTraining({
        epochs: 10,
        onProgress: (done, total, current) =>
          setBatchProgress({ done, total, current }),
      });
      setBatch(snap);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Batch training failed");
    } finally {
      setBatchRunning(false);
    }
  }

  const stageIdx = STAGES.findIndex((s) => s.key === stage);
  const batchPct =
    batchProgress.total > 0 ? (batchProgress.done / batchProgress.total) * 100 : 0;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="max-w-[1400px] mx-auto px-6 pt-24 pb-16 space-y-8">
        <DemoBanner
          variant="simulator"
          message="This is a browser-side training simulator that calibrates heuristics in localStorage — NOT a real GPU training pipeline. Production training requires a dedicated ML worker and dataset registry."
        />
        <motion.header
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          <p className="text-xs font-mono text-primary uppercase tracking-wider">
            Continuous Training
          </p>
          <h1 className="font-display text-3xl md:text-4xl font-semibold">
            Datasets → Model Training Pipeline
          </h1>
          <p className="text-sm text-muted-foreground max-w-3xl">
            Streams Datasets Hub outputs (PDB, BindingDB, UniProt, DrugBank, ZINC) directly
            into the prediction model. Each run prepares examples, validates labels,
            fits a calibration on experimental affinities, and persists the result so
            downstream predictors (GAT, Validation, Binding Realism) consume the
            updated coefficients.
          </p>
        </motion.header>

        {/* Run controls */}
        <section className="glass-panel rounded-lg p-5 border border-border/50 space-y-4">
          <div className="flex flex-col md:flex-row gap-3 md:items-end">
            <div className="flex-1">
              <label className="text-xs font-mono text-muted-foreground uppercase">
                Target / topic query
              </label>
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. EGFR kinase, SARS-CoV-2 main protease"
                className="mt-1"
              />
            </div>
            <Button onClick={run} disabled={running || !query.trim()} className="gap-2">
              <Play className="w-4 h-4" />
              {running ? "Running…" : "Run training pipeline"}
            </Button>
          </div>

          {/* Stage strip */}
          <div className="grid grid-cols-5 gap-2">
            {STAGES.map((s, i) => {
              const Icon = s.icon;
              const active = stageIdx >= i && (running || stage === "done");
              const current = stage === s.key;
              return (
                <div
                  key={s.key}
                  className={`rounded-md border px-3 py-2 flex items-center gap-2 text-xs font-mono transition ${
                    current
                      ? "border-primary text-primary bg-primary/10"
                      : active
                      ? "border-primary/40 text-foreground"
                      : "border-border/50 text-muted-foreground"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {s.label}
                </div>
              );
            })}
          </div>

          {error && (
            <div className="text-xs text-destructive flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5" /> {error}
            </div>
          )}
        </section>

        {/* Batch training across all priority diseases */}
        <section className="glass-panel rounded-lg p-5 border border-border/50 space-y-4">
          <div className="flex flex-col md:flex-row md:items-end gap-3 md:justify-between">
            <div>
              <p className="text-xs font-mono text-primary uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-3.5 h-3.5" /> Africa-focused continuous training
              </p>
              <h2 className="font-display text-xl mt-1">Train across all priority diseases</h2>
              <p className="text-xs text-muted-foreground max-w-2xl mt-1">
                Runs the full ingest → prepare → validate → train → calibrate pipeline
                across {PRIORITY_DISEASE_QUERIES.length} WHO/Africa-priority diseases
                (viral, NTD, resistant, neurological). Aggregated calibration is
                persisted to the GAT predictor. License-blocked datasets are
                automatically excluded via the governance registry.
              </p>
            </div>
            <Button onClick={runBatch} disabled={batchRunning} className="gap-2 shrink-0">
              <Play className="w-4 h-4" />
              {batchRunning ? "Training…" : "Run batch training"}
            </Button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {PRIORITY_DISEASE_QUERIES.map((d) => (
              <Badge key={d.disease} variant="outline" className="font-mono text-[10px]">
                {d.disease}
              </Badge>
            ))}
          </div>

          {batchRunning && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-mono text-muted-foreground">
                <span>Currently training: {batchProgress.current}</span>
                <span>
                  {batchProgress.done}/{batchProgress.total}
                </span>
              </div>
              <Progress value={batchPct} />
            </div>
          )}
        </section>

        {batch && (
          <>
            <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="glass-panel rounded-md border border-border/50 p-4">
                <p className="text-[10px] uppercase font-mono text-muted-foreground">Diseases trained</p>
                <p className="font-display text-2xl">{batch.runs.length}</p>
              </div>
              <div className="glass-panel rounded-md border border-border/50 p-4">
                <p className="text-[10px] uppercase font-mono text-muted-foreground">Total examples</p>
                <p className="font-display text-2xl">{batch.aggregate.totalExamples.toLocaleString()}</p>
              </div>
              <div className="glass-panel rounded-md border border-border/50 p-4">
                <p className="text-[10px] uppercase font-mono text-muted-foreground">Avg RMSE</p>
                <p className="font-display text-2xl">{batch.aggregate.avgRMSE.toFixed(3)}</p>
              </div>
              <div className="glass-panel rounded-md border border-border/50 p-4">
                <p className="text-[10px] uppercase font-mono text-muted-foreground">Avg R²</p>
                <p className="font-display text-2xl">{batch.aggregate.avgR2.toFixed(3)}</p>
              </div>
            </section>

            <section className="glass-panel rounded-lg p-5 border border-border/50">
              <h2 className="font-display text-lg mb-3">Per-disease training results</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-xs font-mono">
                  <thead className="text-muted-foreground border-b border-border/50">
                    <tr>
                      <th className="text-left py-2 pr-3">Disease</th>
                      <th className="text-left pr-3">Category</th>
                      <th className="text-right pr-3">Examples</th>
                      <th className="text-right pr-3">Train/Val</th>
                      <th className="text-right pr-3">RMSE</th>
                      <th className="text-right pr-3">R²</th>
                      <th className="text-left">Sources (PDB/BDB/UP/DB/ZINC)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batch.runs.map((r) => (
                      <tr key={r.disease} className="border-b border-border/30">
                        <td className="py-2 pr-3 text-foreground">{r.disease}</td>
                        <td className="pr-3">
                          <Badge variant="outline" className="text-[10px]">{r.category}</Badge>
                        </td>
                        <td className="text-right pr-3">{r.prepared}</td>
                        <td className="text-right pr-3">{r.trainCount}/{r.valCount}</td>
                        <td className="text-right pr-3">
                          {r.error ? <span className="text-destructive">err</span> : r.finalRMSE.toFixed(3)}
                        </td>
                        <td className="text-right pr-3">{r.error ? "—" : r.finalR2.toFixed(3)}</td>
                        <td className="text-muted-foreground">
                          {r.ingested.pdb}/{r.ingested.bindingdb}/{r.ingested.uniprot}/{r.ingested.drugbank}/{r.ingested.zinc}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="grid md:grid-cols-2 gap-4">
              <div className="glass-panel rounded-lg p-5 border border-border/50">
                <h2 className="font-display text-lg mb-3 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-primary" /> Governance & licensing
                </h2>
                <div className="space-y-3 text-xs">
                  <div>
                    <p className="font-mono text-muted-foreground mb-1">Production-safe datasets ({batch.compliance.productionDatasets.length})</p>
                    <div className="flex flex-wrap gap-1">
                      {batch.compliance.productionDatasets.map((n) => (
                        <Badge key={n} variant="outline" className="text-[10px]">{n}</Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="font-mono text-muted-foreground mb-1">Research-only ({batch.compliance.researchOnlyDatasets.length})</p>
                    <div className="flex flex-wrap gap-1">
                      {batch.compliance.researchOnlyDatasets.map((n) => (
                        <Badge key={n} variant="outline" className="text-[10px] border-yellow-500/40 text-yellow-400">{n}</Badge>
                      ))}
                    </div>
                  </div>
                  {batch.compliance.blockedDatasets.length > 0 && (
                    <div>
                      <p className="font-mono text-destructive mb-1">Blocked from training</p>
                      <div className="flex flex-wrap gap-1">
                        {batch.compliance.blockedDatasets.map((n) => (
                          <Badge key={n} variant="outline" className="text-[10px] border-destructive/50 text-destructive">{n}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {batch.compliance.productionIssues.length > 0 && (
                    <p className="text-[10px] text-muted-foreground pt-2 border-t border-border/30">
                      {batch.compliance.productionIssues.length} compliance note(s) recorded — see /governance
                    </p>
                  )}
                </div>
              </div>

              <div className="glass-panel rounded-lg p-5 border border-border/50">
                <h2 className="font-display text-lg mb-3">Aggregated calibration</h2>
                <p className="font-mono text-sm">
                  scale = <span className="text-primary">{batch.calibration.scale}</span>
                </p>
                <p className="font-mono text-sm">
                  bias = <span className="text-primary">{batch.calibration.bias}</span>
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Persisted to GAT predictor and consumed by all downstream
                  prediction modules (Validation, Binding Realism, Disease scoring).
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  {Object.entries(batch.calibration.sources).map(([k, v]) => (
                    <Badge key={k} variant="outline" className="font-mono text-[10px]">
                      {k}: {v}
                    </Badge>
                  ))}
                </div>
                <p className="text-[10px] font-mono text-muted-foreground mt-3">
                  Trained at {new Date(batch.calibration.trainedAt).toLocaleString()}
                </p>
              </div>
            </section>
          </>
        )}
        {snapshot && (
          <>
            {/* Ingestion summary */}
            <section className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {Object.entries(snapshot.ingested).map(([k, v]) => (
                <div
                  key={k}
                  className="glass-panel rounded-md border border-border/50 p-4"
                >
                  <p className="text-[10px] uppercase font-mono text-muted-foreground">
                    {k}
                  </p>
                  <p className="font-display text-2xl">{v}</p>
                  <p className="text-[10px] font-mono text-muted-foreground">records</p>
                </div>
              ))}
            </section>

            {/* Metrics */}
            <section className="grid md:grid-cols-3 gap-4">
              <div className="glass-panel rounded-lg p-5 border border-border/50">
                <p className="text-xs font-mono text-muted-foreground">Prepared examples</p>
                <p className="font-display text-3xl">{snapshot.prepared}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Train {snapshot.trainCount} · Val {snapshot.valCount}
                </p>
              </div>
              <div className="glass-panel rounded-lg p-5 border border-border/50">
                <p className="text-xs font-mono text-muted-foreground">Final RMSE</p>
                <p className="font-display text-3xl">{snapshot.finalRMSE.toFixed(3)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  R² {snapshot.finalR2.toFixed(3)}
                </p>
              </div>
              <div className="glass-panel rounded-lg p-5 border border-border/50">
                <p className="text-xs font-mono text-muted-foreground">Calibration</p>
                <p className="font-mono text-sm mt-1">
                  scale = <span className="text-primary">{snapshot.calibration.scale}</span>
                </p>
                <p className="font-mono text-sm">
                  bias = <span className="text-primary">{snapshot.calibration.bias}</span>
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Persisted to GAT predictor
                </p>
              </div>
            </section>

            {/* Loss curve */}
            <section className="glass-panel rounded-lg p-5 border border-border/50">
              <h2 className="font-display text-lg mb-3">Training curves</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={snapshot.epochs}>
                    <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                    <XAxis dataKey="epoch" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--background))",
                        border: "1px solid hsl(var(--border))",
                        fontSize: 12,
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="loss" stroke="hsl(var(--primary))" dot={false} />
                    <Line type="monotone" dataKey="rmse" stroke="hsl(var(--accent))" dot={false} />
                    <Line type="monotone" dataKey="r2" stroke="hsl(var(--secondary-foreground))" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>

            {/* Source mix + notes */}
            <section className="grid md:grid-cols-2 gap-4">
              <div className="glass-panel rounded-lg p-5 border border-border/50">
                <h2 className="font-display text-lg mb-3">Source mix</h2>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(snapshot.calibration.sources).map(([k, v]) => (
                    <Badge key={k} variant="outline" className="font-mono text-xs">
                      {k}: {v}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="glass-panel rounded-lg p-5 border border-border/50">
                <h2 className="font-display text-lg mb-3">Pipeline notes</h2>
                {snapshot.notes.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No warnings — calibration trained on healthy dataset.
                  </p>
                ) : (
                  <ul className="text-xs text-muted-foreground space-y-1.5 list-disc pl-4">
                    {snapshot.notes.map((n) => (
                      <li key={n}>{n}</li>
                    ))}
                  </ul>
                )}
                <p className="text-[10px] font-mono text-muted-foreground mt-3">
                  Trained at {new Date(snapshot.calibration.trainedAt).toLocaleString()}
                </p>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
