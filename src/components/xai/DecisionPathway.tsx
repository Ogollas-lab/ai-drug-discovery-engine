import { motion } from "framer-motion";
import { TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { XAIPrediction } from "@/data/xai-molecules";

export const DecisionPathway = ({ path }: { path: XAIPrediction["decisionPath"] }) => (
  <Card>
    <CardHeader className="pb-2">
      <CardTitle className="text-sm flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-primary" />
        Decision Pathway
      </CardTitle>
      <p className="text-[10px] text-muted-foreground">Step-by-step model reasoning trace</p>
    </CardHeader>
    <CardContent>
      <div className="space-y-0">
        {path.map((step, i) => (
          <motion.div key={step.node} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="relative">
            {i < path.length - 1 && (
              <div className={`absolute left-[11px] top-[28px] w-px h-[calc(100%-4px)] ${step.passed ? 'bg-primary/30' : 'bg-destructive/30'}`} />
            )}
            <div className="flex items-start gap-3 py-2.5">
              <div className={`w-[23px] h-[23px] rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${step.passed ? 'border-primary bg-primary/10' : 'border-destructive bg-destructive/10'}`}>
                <span className="text-[8px] font-mono font-bold">{i + 1}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium">{step.node}</span>
                  <Badge variant={step.passed ? "default" : "destructive"} className="text-[8px] h-4 px-1.5">{step.result}</Badge>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">{step.condition}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </CardContent>
  </Card>
);
