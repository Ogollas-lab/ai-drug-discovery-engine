import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { fetchPubChemByName } from "@/lib/pubchem";
import { predictDrugSuccess, type PredictionOutput } from "@/lib/drug-prediction";
import { Loader2, Play, BarChart3 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface Props {
  sampleMolecules: { name: string; smiles: string }[];
}

interface BatchResult {
  name: string;
  prediction: PredictionOutput;
}

const BatchRunner = ({ sampleMolecules }: Props) => {
  const [results, setResults] = useState<BatchResult[]>([]);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);

  const runBatch = async () => {
    setRunning(true);
    setResults([]);
    const batch: BatchResult[] = [];

    for (let i = 0; i < sampleMolecules.length; i++) {
      const m = sampleMolecules[i];
      setProgress(((i + 1) / sampleMolecules.length) * 100);
      const data = await fetchPubChemByName(m.name);
      if (data) {
        const pred = predictDrugSuccess({ molecule: data });
        batch.push({ name: m.name, prediction: pred });
        setResults([...batch]);
      }
      // Small delay to avoid rate limiting
      await new Promise((r) => setTimeout(r, 300));
    }
    setRunning(false);
  };

  const chartData = results.map((r) => ({
    name: r.name,
    overall: r.prediction.overallScore,
    efficacy: r.prediction.efficacyScore,
    safety: r.prediction.safetyScore,
    verdict: r.prediction.verdict,
  }));

  const verdictColor = (v: string) =>
    v === "High Potential" ? "hsl(var(--primary))" :
    v === "Moderate" ? "hsl(var(--accent))" :
    "hsl(var(--destructive))";

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Batch Screening
          </CardTitle>
          <Button size="sm" onClick={runBatch} disabled={running}>
            {running ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Play className="h-3.5 w-3.5 mr-1.5" />}
            {running ? "Running..." : "Screen All"}
          </Button>
        </CardHeader>
        <CardContent>
          {running && <Progress value={progress} className="h-2 mb-4" />}

          {results.length > 0 && (
            <>
              <div className="h-[250px] mb-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ left: 0, right: 10 }}>
                    <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                    <YAxis domain={[0, 100]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Bar dataKey="overall" name="Overall" radius={[4, 4, 0, 0]}>
                      {chartData.map((d, i) => (
                        <Cell key={i} fill={verdictColor(d.verdict)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Results table */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="text-left py-2 pr-3">Molecule</th>
                      <th className="text-right py-2 px-2">Overall</th>
                      <th className="text-right py-2 px-2">Efficacy</th>
                      <th className="text-right py-2 px-2">Safety</th>
                      <th className="text-right py-2 pl-2">Verdict</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r) => (
                      <tr key={r.name} className="border-b border-border/50">
                        <td className="py-2 pr-3 font-medium text-foreground">{r.name}</td>
                        <td className="text-right py-2 px-2 font-mono">{r.prediction.overallScore.toFixed(1)}%</td>
                        <td className="text-right py-2 px-2 font-mono">{r.prediction.efficacyScore.toFixed(1)}%</td>
                        <td className="text-right py-2 px-2 font-mono">{r.prediction.safetyScore.toFixed(1)}%</td>
                        <td className="text-right py-2 pl-2">
                          <Badge
                            variant={r.prediction.verdict === "High Potential" ? "default" : r.prediction.verdict === "Fail" ? "destructive" : "secondary"}
                            className="text-[10px]"
                          >
                            {r.prediction.verdict}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {!running && results.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">
              Click "Screen All" to run predictions on {sampleMolecules.length} molecules using live PubChem data.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BatchRunner;
