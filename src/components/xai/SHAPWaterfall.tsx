import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell,
  Tooltip as RechartsTooltip
} from "recharts";
import type { SHAPFeature } from "@/data/xai-molecules";

export const SHAPWaterfall = ({ features }: { features: SHAPFeature[] }) => {
  const sorted = [...features].sort((a, b) => Math.abs(b.shapValue) - Math.abs(a.shapValue));
  const data = sorted.map(f => ({
    name: f.feature,
    value: Math.round(f.shapValue * 100),
    actual: f.actualValue,
    explanation: f.explanation,
    category: f.category,
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-primary" />
          SHAP Feature Importance
        </CardTitle>
        <p className="text-[10px] text-muted-foreground">
          SHapley Additive exPlanations — each bar shows the marginal contribution of a feature to the prediction
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-[380px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ left: 130, right: 30, top: 5, bottom: 5 }}>
              <XAxis type="number" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} tickFormatter={(v) => `${v > 0 ? '+' : ''}${v}%`} />
              <YAxis type="category" dataKey="name" tick={{ fill: "hsl(var(--foreground))", fontSize: 10 }} width={120} />
              <RechartsTooltip
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }}
                formatter={(_: any, __: string, entry: any) => [`${entry.payload.explanation}`, `Value: ${entry.payload.actual}`]}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {data.map((d, i) => (
                  <Cell key={i} fill={d.value >= 0 ? "hsl(var(--primary))" : "hsl(var(--destructive))"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex gap-4 mt-2 justify-center text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-primary" /> Increases score</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-destructive" /> Decreases score</span>
        </div>
      </CardContent>
    </Card>
  );
};
