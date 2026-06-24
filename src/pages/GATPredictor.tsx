import { useState } from "react";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Network, AlertTriangle, Sigma } from "lucide-react";
import { runGATPrediction, type GATPredictionOutput } from "@/lib/gat-predictor";
import DemoBanner from "@/components/DemoBanner";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
} from "recharts";

const EXAMPLES = [
  { name: "Imatinib", target: "ABL1" },
  { name: "Aspirin", target: "PTGS1" },
  { name: "Testosterone", target: "EGFR" },
  { name: "Metformin", target: "PRKAA1" },
];

const uncertaintyTone = (u: string) =>
  u === "Low"
    ? "bg-primary/15 text-primary border-primary/30"
    : u === "Medium"
    ? "bg-accent/15 text-accent border-accent/30"
    : "bg-destructive/15 text-destructive border-destructive/30";

const GATPredictor = () => {
  const [query, setQuery] = useState("");
  const [target, setTarget] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GATPredictionOutput | null>(null);

  const run = async (q = query, t = target) => {
    if (!q.trim() || !t.trim()) {
      setError("Provide both a molecule (SMILES or name) and a target identifier.");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    const out = await runGATPrediction({ query: q.trim(), targetId: t.trim() });
    if (!out) setError("Could not resolve molecule via PubChem. Check SMILES/name.");
    else setResult(out);
    setLoading(false);
  };

  const histogram = result
    ? (() => {
        const bins = 10;
        const counts = Array.from({ length: bins }, (_, i) => ({
          bin: `${(i / bins).toFixed(1)}`,
          count: 0,
        }));
        for (const s of result.ensembleSamples) {
          const idx = Math.min(bins - 1, Math.floor(s * bins));
          counts[idx].count += 1;
        }
        return counts;
      })()
    : [];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-[1400px] mx-auto px-6 pt-20 pb-16">
        <DemoBanner
          message="This page uses a browser-side heuristic stand-in — NOT a trained Graph Attention Network. Use /workspace with the Engine API for server-validated analysis."
        />
        <header className="mb-6">
          <div className="flex items-center gap-2 text-xs font-mono text-primary mb-2">
            <Network className="w-3.5 h-3.5" />
            GAT AFFINITY PREDICTOR
          </div>
          <h1 className="font-display text-3xl tracking-tight">
            Graph Attention Network — Probabilistic Output
          </h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
            This module is restricted to numerical model predictions. It returns an
            affinity probability and ensemble uncertainty only — no biological
            interpretation, no mechanism inference.
          </p>
        </header>

        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Input</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Molecule (SMILES or name)</Label>
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="e.g. Imatinib or CC(=O)Oc1ccccc1C(=O)O"
                  className="font-mono text-xs"
                />
              </div>
              <div>
                <Label className="text-xs">Target protein identifier</Label>
                <Input
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  placeholder="e.g. ABL1, EGFR, P00533"
                  className="font-mono text-xs"
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={() => run()} disabled={loading} size="sm">
                {loading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                ) : (
                  <Sigma className="h-3.5 w-3.5 mr-1.5" />
                )}
                Run GAT forward pass
              </Button>
              <span className="text-[11px] text-muted-foreground font-mono">examples:</span>
              {EXAMPLES.map((ex) => (
                <Button
                  key={`${ex.name}-${ex.target}`}
                  variant="outline"
                  size="sm"
                  className="h-7 text-[11px] font-mono"
                  onClick={() => {
                    setQuery(ex.name);
                    setTarget(ex.target);
                    run(ex.name, ex.target);
                  }}
                >
                  {ex.name} → {ex.target}
                </Button>
              ))}
            </div>
            {error && (
              <Alert variant="destructive" className="py-2">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-xs">{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {result && (
          <div className="grid lg:grid-cols-3 gap-4">
            {/* Score */}
            <Card className="lg:col-span-1">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                  {result.label}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-[11px] text-muted-foreground font-mono mb-1">
                    Predicted affinity score
                  </div>
                  <div className="font-display text-5xl tabular-nums text-primary">
                    {result.affinityScore.toFixed(3)}
                  </div>
                  <Progress
                    value={result.affinityScore * 100}
                    className="h-1.5 mt-3"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-muted-foreground mt-1">
                    <span>0.000</span>
                    <span>1.000</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono text-muted-foreground">
                    Model uncertainty
                  </span>
                  <Badge
                    variant="outline"
                    className={`text-[10px] font-mono ${uncertaintyTone(result.uncertainty)}`}
                  >
                    {result.uncertainty} (σ={result.uncertaintyValue.toFixed(3)})
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono text-muted-foreground">
                    Target embedding hash
                  </span>
                  <code className="text-[11px] text-foreground">
                    {result.targetEmbeddingHash}
                  </code>
                </div>

                <Alert className="py-2 border-accent/30 bg-accent/5">
                  <AlertTriangle className="h-4 w-4 text-accent" />
                  <AlertDescription className="text-[11px] font-mono text-accent">
                    {result.note}
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            {/* Ensemble distribution */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  Ensemble distribution ({result.ensembleSamples.length} stochastic forward passes)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={histogram} margin={{ left: 0, right: 10 }}>
                      <XAxis
                        dataKey="bin"
                        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                      />
                      <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{
                          background: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                      />
                      <ReferenceLine
                        x={`${(Math.floor(result.affinityScore * 10) / 10).toFixed(1)}`}
                        stroke="hsl(var(--primary))"
                        strokeDasharray="3 3"
                      />
                      <Bar
                        dataKey="count"
                        fill="hsl(var(--primary))"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="mt-4 grid grid-cols-3 sm:grid-cols-6 gap-2 text-[11px] font-mono">
                  {Object.entries(result.graphFeatures).map(([k, v]) => (
                    <div
                      key={k}
                      className="rounded-md border border-border/50 bg-card/40 px-2 py-1.5"
                    >
                      <div className="text-muted-foreground">{k}</div>
                      <div className="text-foreground tabular-nums">{v}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
};

export default GATPredictor;
