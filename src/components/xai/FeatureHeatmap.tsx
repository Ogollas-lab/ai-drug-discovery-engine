import { motion } from "framer-motion";
import { Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { SHAPFeature } from "@/data/xai-molecules";

const categoryLabels: Record<string, string> = {
  physicochemical: "Physicochemical",
  structural: "Structural",
  pharmacokinetic: "Pharmacokinetic",
  toxicity: "Toxicity",
};

export const FeatureHeatmap = ({ features }: { features: SHAPFeature[] }) => {
  const categories = ["physicochemical", "structural", "pharmacokinetic", "toxicity"] as const;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Activity className="w-4 h-4 text-accent" />
          Feature Category Heatmap
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {categories.map(cat => {
            const catFeatures = features.filter(f => f.category === cat);
            const avgImpact = catFeatures.length > 0 ? catFeatures.reduce((s, f) => s + f.shapValue, 0) / catFeatures.length : 0;
            const intensity = Math.min(Math.abs(avgImpact) * 500, 100);

            return (
              <TooltipProvider key={cat}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      className="p-3 rounded-lg border border-border/50 cursor-pointer transition-colors hover:border-primary/30"
                      style={{
                        background: avgImpact >= 0
                          ? `hsla(160, 100%, 45%, ${intensity / 100 * 0.2})`
                          : `hsla(0, 72%, 51%, ${intensity / 100 * 0.2})`,
                      }}
                    >
                      <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground mb-1">{categoryLabels[cat]}</div>
                      <div className="flex items-baseline gap-1">
                        <span className={`text-lg font-bold ${avgImpact >= 0 ? 'text-primary' : 'text-destructive'}`}>
                          {avgImpact >= 0 ? '+' : ''}{(avgImpact * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="text-[9px] text-muted-foreground mt-1">{catFeatures.length} features</div>
                    </motion.div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-[250px]">
                    <div className="space-y-1">
                      {catFeatures.map(f => (
                        <div key={f.feature} className="flex items-center justify-between text-[10px]">
                          <span>{f.feature}</span>
                          <span className={f.shapValue >= 0 ? 'text-primary' : 'text-destructive'}>
                            {f.shapValue >= 0 ? '+' : ''}{(f.shapValue * 100).toFixed(0)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
