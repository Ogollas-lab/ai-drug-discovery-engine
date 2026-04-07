import { type DiseasePredictionOutput } from "@/lib/disease-prediction";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Globe, Target, Database, AlertTriangle, Lightbulb } from "lucide-react";

interface DiseaseContextPanelProps {
  result: DiseasePredictionOutput;
}

const DiseaseContextPanel = ({ result }: DiseaseContextPanelProps) => {
  const ctx = result.diseaseContext;

  return (
    <div className="space-y-4">
      {/* African Context */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" />
            African Health Context — {ctx.diseaseName}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {ctx.africanContext.map((line, i) => (
            <p key={i} className="text-xs text-muted-foreground leading-relaxed">{line}</p>
          ))}
        </CardContent>
      </Card>

      {/* Relevant Targets */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            Disease-Relevant Targets
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {ctx.relevantTargets.map((t, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span className="text-foreground">{t}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Disease-Specific Flags */}
      {ctx.diseaseSpecificFlags.length > 0 && (
        <Card className="border-destructive/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Disease-Specific Risks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {ctx.diseaseSpecificFlags.map((flag, i) => {
                const isCritical = flag.startsWith("[CRITICAL]");
                return (
                  <div key={i} className="flex items-start gap-2">
                    <Badge variant={isCritical ? "destructive" : "secondary"} className="text-[10px] shrink-0 mt-0.5">
                      {isCritical ? "CRITICAL" : "WARNING"}
                    </Badge>
                    <p className="text-xs text-muted-foreground">
                      {flag.replace(/^\[(CRITICAL|WARNING|INFO)\]\s*/, "")}
                    </p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Datasets */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Database className="h-4 w-4 text-primary" />
            Training Datasets Referenced
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {ctx.datasetsCited.map((d, i) => (
              <div key={i} className="text-xs text-muted-foreground flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary/50" />
                {d}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-primary" />
            Contextual Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {result.recommendations.map((r, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <span className="text-primary font-bold mt-0.5">{i + 1}.</span>
                <span className="text-muted-foreground">{r}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DiseaseContextPanel;
