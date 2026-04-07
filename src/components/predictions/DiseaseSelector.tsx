import { DISEASE_MODELS, type DiseaseModel } from "@/data/disease-models";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Globe, Database, Target } from "lucide-react";

interface DiseaseSelectorProps {
  selected: DiseaseModel | null;
  onSelect: (disease: DiseaseModel | null) => void;
}

const DiseaseSelector = ({ selected, onSelect }: DiseaseSelectorProps) => {
  const handleChange = (value: string) => {
    if (value === "general") {
      onSelect(null);
    } else {
      const disease = DISEASE_MODELS.find((d) => d.id === value);
      if (disease) onSelect(disease);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Globe className="h-4 w-4 text-primary" />
        <label className="text-sm font-medium text-foreground">Disease Context</label>
        <Badge variant="outline" className="text-[10px]">African Health Focus</Badge>
      </div>

      <Select value={selected?.id ?? "general"} onValueChange={handleChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select disease context..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="general">
            <span className="flex items-center gap-2">
              <span>🧬</span>
              <span>General (No disease context)</span>
            </span>
          </SelectItem>
          {DISEASE_MODELS.map((d) => (
            <SelectItem key={d.id} value={d.id}>
              <span className="flex items-center gap-2">
                <span>{d.icon}</span>
                <span>{d.name}</span>
                <span className="text-muted-foreground text-xs">— {d.category}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {selected && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-4 pb-3 space-y-3">
            <div className="flex items-start gap-2">
              <span className="text-2xl">{selected.icon}</span>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm text-foreground">{selected.name}</h4>
                <p className="text-xs text-muted-foreground mt-0.5">{selected.description}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Globe className="h-3 w-3" /> Region
                </div>
                <p className="font-medium text-foreground">{selected.region}</p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Database className="h-3 w-3" /> Datasets
                </div>
                <p className="font-medium text-foreground">
                  {selected.datasets.reduce((s, d) => s + d.compounds, 0).toLocaleString()} compounds
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Target className="h-3 w-3" /> Key Targets
              </div>
              <div className="flex flex-wrap gap-1">
                {selected.targets.map((t) => (
                  <Badge key={t.gene} variant="secondary" className="text-[10px]">
                    {t.gene}
                    <span className={`ml-1 inline-block w-1.5 h-1.5 rounded-full ${
                      t.druggability === "high" ? "bg-green-500" : t.druggability === "moderate" ? "bg-yellow-500" : "bg-red-500"
                    }`} />
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-[10px] text-muted-foreground">Reference Drugs</p>
              <div className="flex flex-wrap gap-1">
                {selected.referenceDrugs.slice(0, 4).map((d) => (
                  <span key={d} className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-secondary text-secondary-foreground">{d}</span>
                ))}
                {selected.referenceDrugs.length > 4 && (
                  <span className="text-[10px] text-muted-foreground">+{selected.referenceDrugs.length - 4} more</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DiseaseSelector;
