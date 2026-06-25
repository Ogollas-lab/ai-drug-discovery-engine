import { Shield, FlaskConical, AlertTriangle, CheckCircle2 } from "lucide-react";
import type { MoleculeResult } from "@/data/targets";

interface ScientificAssessmentPanelProps {
  result: MoleculeResult;
  engineScientific?: {
    qed?: { value: number; interpretation: string };
    pains?: { passed: boolean; alerts: { label: string; severity: string }[] };
    veber?: { passed: boolean; status: string };
    herg?: { risk: string; score: number };
    overallRisk?: string;
    citations?: string[];
  };
}

const ScientificAssessmentPanel = ({ result, engineScientific }: ScientificAssessmentPanelProps) => {
  const sci = engineScientific;
  const lipinskiStatus = result.drugLike ? "compliant" : result.violations >= 2 ? "non-compliant" : "marginal";

  return (
    <div className="rounded-lg border border-border bg-card/50 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <FlaskConical className="w-4 h-4 text-primary" />
        <h3 className="font-display text-sm font-semibold">Scientific Assessment</h3>
        <span className="text-[9px] font-mono text-muted-foreground ml-auto">PubChem + rules</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {sci?.qed && (
          <Metric label="QED" value={sci.qed.value.toFixed(3)} sub={sci.qed.interpretation.replace(/_/g, " ")} />
        )}
        <Metric label="Lipinski" value={lipinskiStatus} sub={result.drugLike ? "Drug-like profile" : `${result.violations} violation(s)`} />
        {sci?.veber && (
          <Metric label="Veber" value={sci.veber.status} sub={sci.veber.passed ? "Oral bioavailability OK" : "Review TPSA/rot bonds"} />
        )}
        {sci?.herg && (
          <Metric label="hERG risk" value={sci.herg.risk} sub={`score ${sci.herg.score.toFixed(2)}`} warn={sci.herg.risk !== "low"} />
        )}
      </div>

      {sci?.pains && !sci.pains.passed && (
        <div className="flex items-start gap-2 p-2 rounded-md bg-destructive/10 border border-destructive/20">
          <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-destructive">PAINS alerts detected</p>
            <ul className="text-[10px] font-mono text-muted-foreground mt-1 space-y-0.5">
              {sci.pains.alerts.map((a) => (
                <li key={a.label}>• {a.label} ({a.severity})</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {sci?.pains?.passed && (
        <div className="flex items-center gap-2 text-[10px] font-mono text-primary">
          <CheckCircle2 className="w-3.5 h-3.5" />
          No PAINS alerts in simplified screen
        </div>
      )}

      <div className="flex items-start gap-2 pt-2 border-t border-border/50">
        <Shield className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-[10px] font-mono text-muted-foreground leading-relaxed">
          Engagement scores are proxies unless sourced from curated literature. All outputs require experimental validation before synthesis or clinical decisions.
        </p>
      </div>
    </div>
  );
};

function Metric({ label, value, sub, warn }: { label: string; value: string; sub: string; warn?: boolean }) {
  return (
    <div className={`p-2 rounded-md border ${warn ? "border-destructive/30 bg-destructive/5" : "border-border/60 bg-secondary/30"}`}>
      <div className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider">{label}</div>
      <div className={`text-sm font-display font-bold capitalize ${warn ? "text-destructive" : "text-foreground"}`}>{value}</div>
      <div className="text-[9px] font-mono text-muted-foreground truncate" title={sub}>{sub}</div>
    </div>
  );
}

export default ScientificAssessmentPanel;
