import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { Activity, BarChart3, Download, Info, Sparkles } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell,
  Tooltip as RechartsTooltip,
} from "recharts";
import { MOCK_PREDICTIONS, AVAILABLE_MOLECULES } from "@/data/xai-molecules";

type ViewMode = "beeswarm" | "bar";

interface BeePoint {
  feature: string;
  molecule: string;
  shapValue: number;
  actualValue: string;
  category: string;
  explanation: string;
  // normalized magnitude of underlying feature value (0..1) — drives color
  magnitude: number;
}

// Heuristic: estimate a 0..1 magnitude of the actual feature value to color the dot
const estimateMagnitude = (feature: string, actualValue: string): number => {
  const num = parseFloat(actualValue.replace(/[^\d.-]/g, ""));
  if (isNaN(num)) {
    // categorical: low/negative => 0.2, moderate => 0.5, high/positive => 0.85
    const v = actualValue.toLowerCase();
    if (v.includes("negative") || v.includes("low")) return 0.2;
    if (v.includes("moderate") || v.includes("medium")) return 0.55;
    if (v.includes("high") || v.includes("positive")) return 0.85;
    return 0.5;
  }
  const f = feature.toLowerCase();
  if (f.includes("weight")) return Math.min(1, num / 500);
  if (f.includes("logp")) return Math.min(1, Math.max(0, (num + 2) / 7));
  if (f.includes("tpsa")) return Math.min(1, num / 140);
  if (f.includes("donor")) return Math.min(1, num / 5);
  if (f.includes("acceptor")) return Math.min(1, num / 10);
  if (f.includes("rotatable")) return Math.min(1, num / 10);
  if (f.includes("aromatic")) return Math.min(1, num / 4);
  return Math.min(1, Math.abs(num) / 10);
};

// Color from blue (low) -> purple -> red (high), HSL via theme tokens
const colorForMagnitude = (m: number) => {
  // Interpolate hue between primary (~155 green-cyan) and destructive (~0 red)
  // Using fixed HSL values matching biotech palette: low = cyan, high = magenta/red
  const hue = 200 - m * 200; // 200 (cyan) -> 0 (red)
  return `hsl(${hue}, 75%, 55%)`;
};

export const SHAPBeeswarm = () => {
  const [view, setView] = useState<ViewMode>("beeswarm");
  const [selectedMolecules, setSelectedMolecules] = useState<string[]>(AVAILABLE_MOLECULES);

  const toggleMolecule = (m: string) => {
    setSelectedMolecules(prev =>
      prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]
    );
  };

  // Aggregate SHAP across selected molecules, grouped by feature
  const { features, points, barData, insight } = useMemo(() => {
    const pts: BeePoint[] = [];
    selectedMolecules.forEach(mKey => {
      const pred = MOCK_PREDICTIONS[mKey];
      if (!pred) return;
      pred.shapFeatures.forEach(f => {
        pts.push({
          feature: f.feature,
          molecule: pred.molecule,
          shapValue: f.shapValue,
          actualValue: f.actualValue,
          category: f.category,
          explanation: f.explanation,
          magnitude: estimateMagnitude(f.feature, f.actualValue),
        });
      });
    });

    // Order features by mean(|shap|) desc
    const featureMap = new Map<string, number[]>();
    pts.forEach(p => {
      if (!featureMap.has(p.feature)) featureMap.set(p.feature, []);
      featureMap.get(p.feature)!.push(p.shapValue);
    });
    const featureStats = Array.from(featureMap.entries()).map(([name, vals]) => ({
      name,
      meanAbs: vals.reduce((a, b) => a + Math.abs(b), 0) / vals.length,
      mean: vals.reduce((a, b) => a + b, 0) / vals.length,
      count: vals.length,
    })).sort((a, b) => b.meanAbs - a.meanAbs);

    const orderedFeatures = featureStats.map(f => f.name);

    const bar = featureStats.map(f => ({
      name: f.name,
      value: Math.round(f.meanAbs * 100),
      direction: f.mean >= 0 ? "positive" : "negative",
    }));

    const top = featureStats.slice(0, 3);
    const insightText = top.length > 0
      ? `Across ${selectedMolecules.length} molecule${selectedMolecules.length === 1 ? "" : "s"}, ${top[0].name} is the most influential feature (mean |SHAP| ≈ ${(top[0].meanAbs * 100).toFixed(1)}%), generally ${top[0].mean >= 0 ? "increasing" : "decreasing"} the predicted score. ${top[1] ? `Followed by ${top[1].name} and ${top[2]?.name ?? "others"}.` : ""}`
      : "Select at least one molecule to see global feature importance.";

    return { features: orderedFeatures, points: pts, barData: bar, insight: insightText };
  }, [selectedMolecules]);

  // Beeswarm geometry
  const rowHeight = 38;
  const padding = { top: 20, right: 24, bottom: 36, left: 160 };
  const innerWidth = 720;
  const innerHeight = features.length * rowHeight;
  const svgWidth = padding.left + innerWidth + padding.right;
  const svgHeight = padding.top + innerHeight + padding.bottom;

  const maxAbs = Math.max(0.01, ...points.map(p => Math.abs(p.shapValue)));
  const xScale = (v: number) => padding.left + innerWidth / 2 + (v / maxAbs) * (innerWidth / 2 - 8);

  // Jitter + simple anti-collision per row
  const placedPoints = useMemo(() => {
    const byFeature = new Map<string, BeePoint[]>();
    points.forEach(p => {
      if (!byFeature.has(p.feature)) byFeature.set(p.feature, []);
      byFeature.get(p.feature)!.push(p);
    });
    const out: (BeePoint & { cx: number; cy: number })[] = [];
    features.forEach((feat, idx) => {
      const rowY = padding.top + idx * rowHeight + rowHeight / 2;
      const items = (byFeature.get(feat) || []).slice().sort((a, b) => a.shapValue - b.shapValue);
      const occupied: { x: number; y: number }[] = [];
      items.forEach(p => {
        const baseX = xScale(p.shapValue);
        let y = rowY;
        let attempts = 0;
        const radius = 6;
        while (
          attempts < 12 &&
          occupied.some(o => Math.hypot(o.x - baseX, o.y - y) < radius * 1.6)
        ) {
          // alternate above/below
          const dir = attempts % 2 === 0 ? -1 : 1;
          y = rowY + dir * Math.ceil((attempts + 1) / 2) * 4;
          attempts++;
        }
        occupied.push({ x: baseX, y });
        out.push({ ...p, cx: baseX, cy: y });
      });
    });
    return out;
  }, [points, features]);

  const handleExport = () => {
    const csv = [
      "feature,molecule,shap_value,actual_value,category",
      ...points.map(p => `"${p.feature}","${p.molecule}",${p.shapValue},"${p.actualValue}","${p.category}"`),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "shap_summary.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              Global Feature Importance (SHAP Summary)
            </CardTitle>
            <p className="text-[10px] text-muted-foreground mt-1">
              Distribution of SHAP values per feature across the full molecule library — color encodes the underlying feature magnitude
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="flex rounded-md border border-border overflow-hidden">
              <Button
                variant={view === "beeswarm" ? "default" : "ghost"}
                size="sm"
                className="h-7 px-2.5 text-[10px] rounded-none gap-1"
                onClick={() => setView("beeswarm")}
              >
                <Sparkles className="w-3 h-3" /> Beeswarm
              </Button>
              <Button
                variant={view === "bar" ? "default" : "ghost"}
                size="sm"
                className="h-7 px-2.5 text-[10px] rounded-none gap-1"
                onClick={() => setView("bar")}
              >
                <BarChart3 className="w-3 h-3" /> Bar
              </Button>
            </div>
            <Button variant="outline" size="sm" className="h-7 px-2.5 text-[10px] gap-1" onClick={handleExport}>
              <Download className="w-3 h-3" /> CSV
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Molecule filter */}
        <div className="flex flex-wrap gap-1.5">
          <span className="text-[10px] text-muted-foreground self-center mr-1">Filter:</span>
          {AVAILABLE_MOLECULES.map(m => {
            const active = selectedMolecules.includes(m);
            return (
              <Button
                key={m}
                variant={active ? "default" : "outline"}
                size="sm"
                className="h-6 text-[9px] px-2"
                onClick={() => toggleMolecule(m)}
              >
                {MOCK_PREDICTIONS[m]?.molecule || m}
              </Button>
            );
          })}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-[9px] px-2"
            onClick={() => setSelectedMolecules(AVAILABLE_MOLECULES)}
          >
            All
          </Button>
        </div>

        {/* Insight */}
        <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/10 text-[11px]">
          <Info className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
          <span className="leading-relaxed text-foreground/90">{insight}</span>
        </div>

        {features.length === 0 ? (
          <div className="text-center text-xs text-muted-foreground py-12">
            No molecules selected. Pick at least one from the filter above.
          </div>
        ) : view === "beeswarm" ? (
          <TooltipProvider delayDuration={50}>
            <div className="w-full overflow-x-auto">
              <svg
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                className="w-full min-w-[640px] h-auto"
                role="img"
                aria-label="SHAP beeswarm summary plot"
              >
                {/* Zero line */}
                <line
                  x1={padding.left + innerWidth / 2}
                  y1={padding.top}
                  x2={padding.left + innerWidth / 2}
                  y2={padding.top + innerHeight}
                  stroke="hsl(var(--border))"
                  strokeDasharray="3 3"
                />
                {/* Row labels & guide lines */}
                {features.map((f, i) => {
                  const y = padding.top + i * rowHeight + rowHeight / 2;
                  return (
                    <g key={f}>
                      <line
                        x1={padding.left}
                        y1={y}
                        x2={padding.left + innerWidth}
                        y2={y}
                        stroke="hsl(var(--border))"
                        strokeOpacity={0.25}
                      />
                      <text
                        x={padding.left - 8}
                        y={y + 3}
                        textAnchor="end"
                        className="fill-foreground"
                        style={{ fontSize: 10 }}
                      >
                        {f}
                      </text>
                    </g>
                  );
                })}
                {/* X axis */}
                <line
                  x1={padding.left}
                  y1={padding.top + innerHeight + 4}
                  x2={padding.left + innerWidth}
                  y2={padding.top + innerHeight + 4}
                  stroke="hsl(var(--border))"
                />
                {[-maxAbs, -maxAbs / 2, 0, maxAbs / 2, maxAbs].map((v, i) => {
                  const x = xScale(v);
                  return (
                    <g key={i}>
                      <line x1={x} y1={padding.top + innerHeight + 4} x2={x} y2={padding.top + innerHeight + 8} stroke="hsl(var(--border))" />
                      <text
                        x={x}
                        y={padding.top + innerHeight + 22}
                        textAnchor="middle"
                        className="fill-muted-foreground"
                        style={{ fontSize: 9 }}
                      >
                        {v >= 0 ? "+" : ""}{(v * 100).toFixed(0)}%
                      </text>
                    </g>
                  );
                })}
                <text
                  x={padding.left + innerWidth / 2}
                  y={svgHeight - 4}
                  textAnchor="middle"
                  className="fill-muted-foreground"
                  style={{ fontSize: 10 }}
                >
                  SHAP value (impact on model output) →
                </text>

                {/* Beeswarm dots */}
                {placedPoints.map((p, i) => (
                  <Tooltip key={i}>
                    <TooltipTrigger asChild>
                      <motion.circle
                        initial={{ opacity: 0, r: 0 }}
                        animate={{ opacity: 0.85, r: 5 }}
                        transition={{ delay: Math.min(i * 0.005, 0.4), duration: 0.3 }}
                        cx={p.cx}
                        cy={p.cy}
                        fill={colorForMagnitude(p.magnitude)}
                        stroke="hsl(var(--background))"
                        strokeWidth={1}
                        className="cursor-pointer hover:opacity-100"
                      />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-[11px] max-w-[260px]">
                      <div className="font-semibold">{p.molecule}</div>
                      <div className="text-muted-foreground">{p.feature}</div>
                      <div className="mt-1 flex items-center gap-2">
                        <Badge variant={p.shapValue >= 0 ? "default" : "destructive"} className="text-[9px] px-1.5 py-0">
                          SHAP {p.shapValue >= 0 ? "+" : ""}{(p.shapValue * 100).toFixed(1)}%
                        </Badge>
                        <span className="text-muted-foreground">Value: {p.actualValue}</span>
                      </div>
                      <div className="mt-1 text-muted-foreground italic">{p.explanation}</div>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </svg>
            </div>

            {/* Color legend */}
            <div className="flex items-center justify-between flex-wrap gap-3 pt-2">
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <span>Feature value:</span>
                <span>Low</span>
                <div
                  className="h-2 w-32 rounded"
                  style={{ background: "linear-gradient(to right, hsl(200,75%,55%), hsl(100,75%,55%), hsl(0,75%,55%))" }}
                />
                <span>High</span>
              </div>
              <div className="flex gap-3 text-[10px] text-muted-foreground">
                <span>← Decreases prediction</span>
                <span>Increases prediction →</span>
              </div>
            </div>
          </TooltipProvider>
        ) : (
          <div className="h-[420px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} layout="vertical" margin={{ left: 140, right: 30, top: 5, bottom: 5 }}>
                <XAxis type="number" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} tickFormatter={(v) => `${v}%`} />
                <YAxis type="category" dataKey="name" tick={{ fill: "hsl(var(--foreground))", fontSize: 10 }} width={130} />
                <RechartsTooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }}
                  formatter={(v: any) => [`Mean |SHAP|: ${v}%`, "Importance"]}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {barData.map((d, i) => (
                    <Cell key={i} fill={d.direction === "positive" ? "hsl(var(--primary))" : "hsl(var(--destructive))"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
