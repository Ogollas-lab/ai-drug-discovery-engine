import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { type ModelMetrics } from "@/lib/drug-prediction";
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer } from "recharts";

interface Props {
  metrics: ModelMetrics;
}

const ModelMetricsPanel = ({ metrics }: Props) => {
  const items = [
    { label: "Accuracy", value: metrics.accuracy },
    { label: "Precision", value: metrics.precision },
    { label: "Recall", value: metrics.recall },
    { label: "F1 Score", value: metrics.f1Score },
    { label: "AUC-ROC", value: metrics.auc },
  ];

  const radarData = items.map((i) => ({ metric: i.label, value: i.value * 100 }));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Metrics bars */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Model Evaluation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {items.map((m) => (
            <div key={m.label}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">{m.label}</span>
                <span className="font-mono text-foreground">{(m.value * 100).toFixed(1)}%</span>
              </div>
              <Progress value={m.value * 100} className="h-2" />
            </div>
          ))}
          <p className="text-[10px] text-muted-foreground pt-2 border-t border-border">
            Trained on {metrics.dataPoints.toLocaleString()} compounds from ChEMBL/PubChem
          </p>
        </CardContent>
      </Card>

      {/* Radar chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Performance Radar</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis
                  dataKey="metric"
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                />
                <Radar
                  dataKey="value"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ModelMetricsPanel;
