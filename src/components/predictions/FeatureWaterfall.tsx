import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type FeatureContribution } from "@/lib/drug-prediction";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface Props {
  contributions: FeatureContribution[];
}

const FeatureWaterfall = ({ contributions }: Props) => {
  const data = contributions.map((c) => ({
    name: c.feature,
    value: Math.round(c.value * 100) / 100,
    weight: c.weight,
    score: Math.round(c.weight * (c.impact === "positive" ? 100 : c.impact === "neutral" ? 50 : 20)),
    impact: c.impact,
    desc: c.description,
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Feature Contributions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ left: 120, right: 20, top: 5, bottom: 5 }}>
              <XAxis type="number" domain={[0, 30]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
              <YAxis type="category" dataKey="name" tick={{ fill: "hsl(var(--foreground))", fontSize: 11 }} width={110} />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(val: number, _: string, entry: any) => [
                  `${entry.payload.desc}`,
                  `Weight: ${(entry.payload.weight * 100).toFixed(0)}%`
                ]}
              />
              <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                {data.map((d, i) => (
                  <Cell
                    key={i}
                    fill={
                      d.impact === "positive"
                        ? "hsl(var(--primary))"
                        : d.impact === "neutral"
                        ? "hsl(var(--accent))"
                        : "hsl(var(--destructive))"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex gap-4 mt-3 justify-center text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-primary" /> Positive
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-accent" /> Neutral
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-destructive" /> Negative
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

export default FeatureWaterfall;
