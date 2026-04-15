import { Atom } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { MolecularDescriptors } from "@/data/xai-molecules";

export const MolecularPropertiesCard = ({
  descriptors,
  biologicalActivity,
  therapeuticClass,
}: {
  descriptors: MolecularDescriptors;
  biologicalActivity?: string;
  therapeuticClass?: string;
}) => {
  const props = [
    { label: "MW", value: `${descriptors.molecularWeight} Da`, ok: descriptors.molecularWeight <= 500 },
    { label: "LogP", value: descriptors.logP.toFixed(2), ok: descriptors.logP >= -0.5 && descriptors.logP <= 5 },
    { label: "HBD", value: descriptors.hBondDonors, ok: descriptors.hBondDonors <= 5 },
    { label: "HBA", value: descriptors.hBondAcceptors, ok: descriptors.hBondAcceptors <= 10 },
    { label: "RotBonds", value: descriptors.rotatableBonds, ok: descriptors.rotatableBonds <= 10 },
    { label: "TPSA", value: `${descriptors.tpsa} Å²`, ok: descriptors.tpsa <= 140 },
    { label: "Aromatic Rings", value: descriptors.aromaticRings, ok: descriptors.aromaticRings <= 4 },
    { label: "Formula", value: descriptors.molecularFormula, ok: true },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Atom className="w-4 h-4 text-primary" />
          Molecular Properties
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          {props.map(p => (
            <div key={p.label} className="flex items-center justify-between p-2 rounded-md bg-secondary/30 border border-border/30">
              <span className="text-[10px] text-muted-foreground">{p.label}</span>
              <span className={`text-[11px] font-mono font-medium ${p.ok ? 'text-primary' : 'text-destructive'}`}>{p.value}</span>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground">Drug-likeness</span>
          <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${descriptors.drugLikeness * 100}%` }} />
          </div>
          <span className="text-[10px] font-mono text-primary">{Math.round(descriptors.drugLikeness * 100)}%</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground">Bioavailability</span>
          <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
            <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${descriptors.bioavailability * 100}%` }} />
          </div>
          <span className="text-[10px] font-mono">{Math.round(descriptors.bioavailability * 100)}%</span>
        </div>

        {(biologicalActivity || therapeuticClass) && (
          <div className="pt-2 border-t border-border/30 space-y-1.5">
            {therapeuticClass && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground">Class:</span>
                <Badge variant="outline" className="text-[9px] h-5">{therapeuticClass}</Badge>
              </div>
            )}
            {biologicalActivity && (
              <p className="text-[10px] text-muted-foreground">{biologicalActivity}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
