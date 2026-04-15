import { useState } from "react";
import { motion } from "framer-motion";
import { GitCompare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MOCK_PREDICTIONS, AVAILABLE_MOLECULES, type XAIPrediction } from "@/data/xai-molecules";

export const MoleculeComparisonPanel = ({ currentMolecule }: { currentMolecule: string }) => {
  const [compareTo, setCompareTo] = useState<string | null>(null);

  const others = AVAILABLE_MOLECULES.filter(m => m !== currentMolecule);
  const current = MOCK_PREDICTIONS[currentMolecule];
  const compared = compareTo ? MOCK_PREDICTIONS[compareTo] : null;

  if (!current) return null;

  const metrics = [
    { label: "Overall Score", key: "overallScore" as const, unit: "%" },
    { label: "Confidence", key: "confidence" as const, unit: "%" },
    { label: "MW", getValue: (p: XAIPrediction) => p.descriptors.molecularWeight, unit: "Da" },
    { label: "LogP", getValue: (p: XAIPrediction) => p.descriptors.logP, unit: "" },
    { label: "TPSA", getValue: (p: XAIPrediction) => p.descriptors.tpsa, unit: "Å²" },
    { label: "Drug-likeness", getValue: (p: XAIPrediction) => Math.round(p.descriptors.drugLikeness * 100), unit: "%" },
    { label: "Bioavailability", getValue: (p: XAIPrediction) => Math.round(p.descriptors.bioavailability * 100), unit: "%" },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <GitCompare className="w-4 h-4 text-primary" />
          Molecule Comparison
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!compareTo ? (
          <div className="space-y-2">
            <p className="text-[10px] text-muted-foreground">Select a molecule to compare with {current.molecule}:</p>
            <div className="flex flex-wrap gap-2">
              {others.map(m => (
                <Button key={m} variant="outline" size="sm" className="h-7 text-[10px] capitalize" onClick={() => setCompareTo(m)}>
                  {MOCK_PREDICTIONS[m]?.molecule || m}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Badge variant="default" className="text-[9px]">{current.molecule}</Badge>
                <span className="text-[10px] text-muted-foreground">vs</span>
                <Badge variant="secondary" className="text-[9px]">{compared?.molecule}</Badge>
              </div>
              <Button variant="ghost" size="sm" className="h-6 text-[9px]" onClick={() => setCompareTo(null)}>Change</Button>
            </div>
            <div className="space-y-2">
              {metrics.map(metric => {
                const valA = 'key' in metric && metric.key ? (current as any)[metric.key] : metric.getValue!(current);
                const valB = compared ? ('key' in metric && metric.key ? (compared as any)[metric.key] : metric.getValue!(compared)) : 0;
                const diff = valB - valA;

                return (
                  <div key={metric.label} className="flex items-center gap-2 text-[10px]">
                    <span className="w-24 text-muted-foreground truncate">{metric.label}</span>
                    <span className="w-16 font-mono text-primary text-right">{typeof valA === 'number' ? valA.toFixed(valA % 1 ? 2 : 0) : valA}{metric.unit}</span>
                    <span className="w-16 font-mono text-secondary-foreground text-right">{typeof valB === 'number' ? valB.toFixed(valB % 1 ? 2 : 0) : valB}{metric.unit}</span>
                    <span className={`w-14 font-mono text-right ${diff > 0 ? 'text-primary' : diff < 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                      {diff > 0 ? '+' : ''}{typeof diff === 'number' ? diff.toFixed(diff % 1 ? 2 : 0) : diff}
                    </span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
};
