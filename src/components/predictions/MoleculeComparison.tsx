import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { fetchPubChemByName } from "@/lib/pubchem";
import { predictDrugSuccess, type PredictionOutput } from "@/lib/drug-prediction";
import { Loader2, GitCompareArrows } from "lucide-react";
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Legend, Tooltip,
} from "recharts";

interface Props {
  sampleMolecules: { name: string; smiles: string }[];
}

interface CompareResult {
  name: string;
  prediction: PredictionOutput;
}

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--destructive))",
  "hsl(142 71% 45%)",
];

const MoleculeComparison = ({ sampleMolecules }: Props) => {
  const [selected, setSelected] = useState<string[]>([]);
  const [results, setResults] = useState<CompareResult[]>([]);
  const [loading, setLoading] = useState(false);

  const toggle = (name: string) => {
    setSelected((prev) =>
      prev.includes(name)
        ? prev.filter((n) => n !== name)
        : prev.length < 3
        ? [...prev, name]
        : prev
    );
  };

  const runComparison = async () => {
    if (selected.length < 2) return;
    setLoading(true);
    setResults([]);
    const batch: CompareResult[] = [];
    for (const name of selected) {
      const data = await fetchPubChemByName(name);
      if (data) {
        batch.push({ name, prediction: predictDrugSuccess({ molecule: data }) });
      }
      await new Promise((r) => setTimeout(r, 250));
    }
    setResults(batch);
    setLoading(false);
  };

  // Build radar data from results
  const radarData = results.length > 0
    ? [
        { axis: "Overall", ...Object.fromEntries(results.map((r) => [r.name, r.prediction.overallScore])) },
        { axis: "Efficacy", ...Object.fromEntries(results.map((r) => [r.name, r.prediction.efficacyScore])) },
        { axis: "Safety", ...Object.fromEntries(results.map((r) => [r.name, r.prediction.safetyScore])) },
        { axis: "Confidence", ...Object.fromEntries(results.map((r) => [r.name, r.prediction.confidence])) },
        // Normalize Lipinski pass rate (0-4 violations → 100-0)
        {
          axis: "Lipinski",
          ...Object.fromEntries(
            results.map((r) => {
              const violations = r.prediction.riskFlags.length;
              return [r.name, Math.max(0, 100 - violations * 25)];
            })
          ),
        },
        // Feature count as a proxy for data richness
        {
          axis: "Features",
          ...Object.fromEntries(
            results.map((r) => [r.name, Math.min(100, r.prediction.featureContributions.length * 16)])
          ),
        },
      ]
    : [];

  return (
    <div className="space-y-4">
      {/* Selection */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <GitCompareArrows className="h-4 w-4" />
            Compare Molecules (select 2–3)
          </CardTitle>
          <Button size="sm" onClick={runComparison} disabled={loading || selected.length < 2}>
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <GitCompareArrows className="h-3.5 w-3.5 mr-1.5" />}
            Compare
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {sampleMolecules.map((m) => (
              <label
                key={m.name}
                className="flex items-center gap-2 cursor-pointer select-none rounded-md border border-border px-3 py-1.5 text-sm transition-colors hover:bg-secondary/60 data-[checked=true]:border-primary data-[checked=true]:bg-primary/10"
                data-checked={selected.includes(m.name)}
              >
                <Checkbox
                  checked={selected.includes(m.name)}
                  onCheckedChange={() => toggle(m.name)}
                  disabled={!selected.includes(m.name) && selected.length >= 3}
                />
                {m.name}
              </label>
            ))}
          </div>
          {selected.length > 0 && (
            <p className="text-xs text-muted-foreground mt-2">
              {selected.length}/3 selected: {selected.join(", ")}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Radar chart */}
      {results.length >= 2 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Side-by-Side Radar Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis
                    dataKey="axis"
                    tick={{ fill: "hsl(var(--foreground))", fontSize: 12 }}
                  />
                  <PolarRadiusAxis
                    angle={30}
                    domain={[0, 100]}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                  />
                  {results.map((r, i) => (
                    <Radar
                      key={r.name}
                      name={r.name}
                      dataKey={r.name}
                      stroke={COLORS[i]}
                      fill={COLORS[i]}
                      fillOpacity={0.15}
                      strokeWidth={2}
                    />
                  ))}
                  <Legend />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* Summary table */}
            <div className="overflow-x-auto mt-4">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="text-left py-2 pr-3">Metric</th>
                    {results.map((r) => (
                      <th key={r.name} className="text-right py-2 px-2">{r.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {["Overall", "Efficacy", "Safety", "Confidence"].map((metric) => (
                    <tr key={metric} className="border-b border-border/50">
                      <td className="py-2 pr-3 font-medium text-foreground">{metric}</td>
                      {results.map((r) => {
                        const val =
                          metric === "Overall" ? r.prediction.overallScore :
                          metric === "Efficacy" ? r.prediction.efficacyScore :
                          metric === "Safety" ? r.prediction.safetyScore :
                          r.prediction.confidence;
                        return (
                          <td key={r.name} className="text-right py-2 px-2 font-mono">
                            {val.toFixed(1)}%
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  <tr>
                    <td className="py-2 pr-3 font-medium text-foreground">Verdict</td>
                    {results.map((r) => (
                      <td key={r.name} className="text-right py-2 px-2">
                        <Badge
                          variant={r.prediction.verdict === "High Potential" ? "default" : r.prediction.verdict === "Fail" ? "destructive" : "secondary"}
                          className="text-[10px]"
                        >
                          {r.prediction.verdict}
                        </Badge>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {!loading && results.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-6">
          Select 2–3 molecules above, then click "Compare" to see a side-by-side radar chart.
        </p>
      )}
    </div>
  );
};

export default MoleculeComparison;
