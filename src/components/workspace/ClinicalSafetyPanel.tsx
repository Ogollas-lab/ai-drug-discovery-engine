import { AlertTriangle, Shield, ShieldAlert, Pill, Activity, Brain } from "lucide-react";
import type { MoleculeResult } from "@/data/targets";
import ConceptTooltip from "@/components/ConceptTooltip";

interface ClinicalSafetyPanelProps {
  result: MoleculeResult | null;
}

const RiskBadge = ({ level }: { level: "low" | "moderate" | "high" }) => {
  const colors = {
    low: "text-primary bg-primary/10 border-primary/20",
    moderate: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
    high: "text-destructive bg-destructive/10 border-destructive/20",
  };
  return (
    <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono border ${colors[level]}`}>
      {level}
    </span>
  );
};

const ClinicalSafetyPanel = ({ result }: ClinicalSafetyPanelProps) => {
  if (!result) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="text-center text-muted-foreground">
          <Shield className="w-8 h-8 mx-auto mb-3 opacity-30" />
          <p className="text-xs font-mono">Analyze a molecule to see clinical safety data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-3 space-y-4">
      {/* Educational disclaimer */}
      <div className="bg-destructive/5 border border-destructive/20 rounded-lg px-3 py-2">
        <p className="text-[10px] text-destructive/80 font-mono">⚠ Educational reference only — not for prescribing decisions</p>
      </div>

      {/* Drug class & similarity */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs font-display font-semibold">
          <Pill className="w-3.5 h-3.5 text-primary" />
          Drug Class & Similarity
        </div>
        <div className="flex flex-wrap gap-1.5">
          {result.drugClass !== "Unknown" && (
            <span className="px-2 py-1 rounded text-[10px] font-mono bg-primary/10 text-primary border border-primary/20">
              {result.drugClass}
            </span>
          )}
          {result.tags.map((tag) => (
            <span key={tag} className="px-2 py-1 rounded text-[10px] font-mono bg-secondary text-secondary-foreground">
              {tag}
            </span>
          ))}
        </div>
        <div className="text-[10px] text-muted-foreground">
          Similar to: {result.similarDrugs.join(", ")}
        </div>
      </div>

      {/* ADMET snapshot */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs font-display font-semibold">
          <Activity className="w-3.5 h-3.5 text-accent" />
          <ConceptTooltip conceptKey="admet">ADMET</ConceptTooltip> Snapshot
        </div>
        <div className="space-y-1.5">
          {[
            { label: "Solubility", value: result.admet.solubility },
            { label: "Permeability", value: result.admet.permeability },
            { label: "hERG Risk", value: result.admet.hergRisk },
            { label: "Hepatotoxicity", value: result.admet.hepatotoxicity },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground font-mono">{label}</span>
              <RiskBadge level={value} />
            </div>
          ))}
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground font-mono">CYP3A4 Substrate</span>
            <span className={`text-[10px] font-mono ${result.admet.cyp3a4 ? "text-yellow-400" : "text-primary"}`}>
              {result.admet.cyp3a4 ? "Yes" : "No"}
            </span>
          </div>
        </div>
      </div>

      {/* DDI Warnings */}
      {result.ddiWarnings.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-display font-semibold">
            <ShieldAlert className="w-3.5 h-3.5 text-yellow-400" />
            DDI Spotlight
          </div>
          <div className="space-y-1.5">
            {result.ddiWarnings.map((w, i) => (
              <div key={i} className="bg-yellow-400/5 border border-yellow-400/10 rounded-md px-2.5 py-2 text-[10px] text-yellow-200/80">
                {w}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Organ function warnings */}
      {result.organWarnings.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-display font-semibold">
            <Brain className="w-3.5 h-3.5 text-neon-purple" />
            Organ-Function Alerts
          </div>
          <div className="space-y-1.5">
            {result.organWarnings.map((w, i) => (
              <div key={i} className="bg-neon-purple/5 border border-neon-purple/10 rounded-md px-2.5 py-2 text-[10px] text-foreground/70">
                {w}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Off-target profile */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs font-display font-semibold">
          <AlertTriangle className="w-3.5 h-3.5 text-accent" />
          Off-Target Profile
        </div>
        <div className="space-y-1.5">
          {result.offTargets.map((ot) => (
            <div key={ot.target} className="flex items-center gap-2 text-[11px]">
              <span className="text-muted-foreground font-mono w-14">{ot.target}</span>
              <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    ot.score > 0.7 ? "bg-destructive" : ot.score > 0.4 ? "bg-yellow-400" : "bg-primary"
                  }`}
                  style={{ width: `${ot.score * 100}%` }}
                />
              </div>
              <span className="text-[10px] font-mono text-muted-foreground w-8 text-right">{ot.score.toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ClinicalSafetyPanel;
