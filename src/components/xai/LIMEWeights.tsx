import { motion } from "framer-motion";
import { Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const LIMEWeights = ({ weights }: { weights: { feature: string; weight: number }[] }) => {
  const sorted = [...weights].sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Eye className="w-4 h-4 text-accent" />
          LIME Local Interpretability
        </CardTitle>
        <p className="text-[10px] text-muted-foreground">
          Local Interpretable Model-agnostic Explanations — feature weights from a local linear surrogate model
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {sorted.map((w, i) => (
          <motion.div key={w.feature} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="flex items-center gap-3">
            <span className="text-[10px] font-mono w-28 truncate text-muted-foreground">{w.feature}</span>
            <div className="flex-1 h-5 bg-secondary/50 rounded-full overflow-hidden relative">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.abs(w.weight) * 100}%` }}
                transition={{ delay: i * 0.05 + 0.2, duration: 0.5 }}
                className={`h-full rounded-full ${w.weight >= 0 ? 'bg-primary/70' : 'bg-destructive/70'}`}
              />
            </div>
            <span className={`text-[10px] font-mono w-12 text-right ${w.weight >= 0 ? 'text-primary' : 'text-destructive'}`}>
              {w.weight >= 0 ? '+' : ''}{(w.weight * 100).toFixed(0)}%
            </span>
          </motion.div>
        ))}
      </CardContent>
    </Card>
  );
};
