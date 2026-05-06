import { useState } from "react";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  XCircle,
  FlaskConical,
} from "lucide-react";
import { runValidation, type ValidationReport, type BindingLikelihood } from "@/lib/validation";

const EXAMPLES = [
  { name: "Imatinib", target: "ABL1" },
  { name: "Aspirin", target: "PTGS1" },
  { name: "Testosterone", target: "EGFR" },
  { name: "Gefitinib", target: "EGFR" },
];

const likelihoodTone = (l: BindingLikelihood) => {
  switch (l) {
    case "Very High":
      return "bg-primary/15 text-primary border-primary/30";
    case "High":
      return "bg-primary/10 text-primary border-primary/30";
    case "Moderate":
      return "bg-accent/15 text-accent border-accent/30";
    case "Low":
      return "bg-muted text-muted-foreground border-border";
    default:
      return "bg-destructive/15 text-destructive border-destructive/30";
  }
};

const Validation = () => {
  const [molecule, setMolecule] = useState("");
  const [target, setTarget] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<ValidationReport | null>(null);

  const run = async (m = molecule, t = target) => {
    if (!m.trim() || !t.trim()) {
      setError("Provide both a molecule and a target.");
      return;
    }
    setLoading(true);
    setError(null);
    setReport(null);
    try {
      const r = await runValidation(m.trim(), t.trim());
      setReport(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Validation failed.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-[1400px] mx-auto px-6 pt-20 pb-16">
        <header className="mb-6">
          <div className="flex items-center gap-2 text-xs font-mono text-primary mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            VALIDATION SCIENTIST
          </div>
          <h1 className="font-display text-3xl tracking-tight">
            Cross-Stage Reality Check
          </h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
            Compares grounding evidence, structural compatibility, and the GAT
            model output. Flags contradictions, downgrades unsupported scores,
            and explains why each prediction may be wrong.
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
                  value={molecule}
                  onChange={(e) => setMolecule(e.target.value)}
                  placeholder="e.g. Imatinib"
                  className="font-mono text-xs"
                />
              </div>
              <div>
                <Label className="text-xs">Target</Label>
                <Input
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  placeholder="e.g. ABL1, EGFR"
                  className="font-mono text-xs"
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={() => run()} disabled={loading} size="sm">
                {loading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                ) : (
                  <FlaskConical className="h-3.5 w-3.5 mr-1.5" />
                )}
                Run validation
              </Button>
              <span className="text-[11px] text-muted-foreground font-mono">examples:</span>
              {EXAMPLES.map((ex) => (
                <Button
                  key={`${ex.name}-${ex.target}`}
                  variant="outline"
                  size="sm"
                  className="h-7 text-[11px] font-mono"
                  onClick={() => {
                    setMolecule(ex.name);
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

        {report && (
          <div className="space-y-4">
            {/* Verdict */}
            <Card>
              <CardContent className="pt-6">
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <div className="text-[11px] font-mono text-muted-foreground mb-1">
                      Final binding likelihood
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-sm font-mono ${likelihoodTone(report.bindingLikelihood)}`}
                    >
                      {report.bindingLikelihood}
                    </Badge>
                  </div>
                  <div>
                    <div className="text-[11px] font-mono text-muted-foreground mb-1">
                      Confidence
                    </div>
                    <Badge variant="outline" className="text-sm font-mono">
                      {report.confidence}
                    </Badge>
                  </div>
                  <div>
                    <div className="text-[11px] font-mono text-muted-foreground mb-1">
                      Adjusted score (post-plausibility filter)
                    </div>
                    <div className="font-display text-3xl tabular-nums text-primary">
                      {report.adjustedScore.toFixed(3)}
                    </div>
                    <Progress value={report.adjustedScore * 100} className="h-1.5 mt-2" />
                  </div>
                </div>

                <div className="mt-5 grid md:grid-cols-2 gap-3 text-xs">
                  <div className="flex items-center gap-2 rounded-md border border-border/50 bg-card/40 px-3 py-2">
                    {report.consistency.matchesLigandClass ? (
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive" />
                    )}
                    <span className="font-mono">
                      Ligand class match:{" "}
                      <span className="text-foreground">
                        {report.consistency.matchesLigandClass ? "yes" : "no (mismatch)"}
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2 rounded-md border border-border/50 bg-card/40 px-3 py-2">
                    {report.consistency.matchesEvidence === true ? (
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                    ) : report.consistency.matchesEvidence === false ? (
                      <XCircle className="h-4 w-4 text-destructive" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-accent" />
                    )}
                    <span className="font-mono">
                      Matches experimental evidence:{" "}
                      <span className="text-foreground">
                        {report.consistency.matchesEvidence === true
                          ? "yes"
                          : report.consistency.matchesEvidence === false
                          ? "no"
                          : "no evidence available"}
                      </span>
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contradictions */}
            {report.contradictions.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-destructive" /> Contradictions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {report.contradictions.map((c, i) => (
                    <Alert
                      key={i}
                      variant={c.severity === "critical" ? "destructive" : "default"}
                      className="py-2"
                    >
                      <AlertDescription className="text-xs flex items-start gap-2">
                        <Badge
                          variant="outline"
                          className="text-[10px] font-mono shrink-0"
                        >
                          {c.flag}
                        </Badge>
                        <span>{c.message}</span>
                      </AlertDescription>
                    </Alert>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Stage reasoning */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Stage-by-stage reasoning</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1.5 text-xs font-mono">
                  {report.reasoning.map((r, i) => (
                    <li key={i} className="text-muted-foreground">
                      <span className="text-foreground">›</span> {r}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-4">
              {/* Why this prediction may be wrong */}
              <Card className="border-accent/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-accent" />
                    Why this prediction may be wrong
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-xs">
                    {report.whyWrong.map((w, i) => (
                      <li key={i} className="flex gap-2 text-muted-foreground">
                        <span className="text-accent">•</span>
                        <span>{w}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Known ligand comparisons */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">
                    Comparison with known ligands
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {report.ligandComparisons.length === 0 ? (
                    <p className="text-xs text-muted-foreground font-mono">
                      No structurally similar known actives were found for this target.
                    </p>
                  ) : (
                    <ul className="space-y-2 text-xs">
                      {report.ligandComparisons.map((l) => (
                        <li
                          key={l.chemblId}
                          className="flex items-center justify-between gap-2 rounded-md border border-border/50 bg-card/40 px-3 py-2"
                        >
                          <div className="min-w-0">
                            <div className="font-mono text-foreground truncate">
                              {l.name ?? l.chemblId}
                            </div>
                            {l.smiles && (
                              <div className="font-mono text-[10px] text-muted-foreground truncate">
                                {l.smiles}
                              </div>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <div className="font-mono text-primary tabular-nums">
                              {Math.round(l.similarity)}%
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                              {l.verdict}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Sources */}
            {report.sources.length > 0 && (
              <div className="text-[11px] font-mono text-muted-foreground">
                Sources:{" "}
                {report.sources.map((s, i) => (
                  <span key={s}>
                    <span className="text-foreground">{s}</span>
                    {i < report.sources.length - 1 ? " · " : ""}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default Validation;
