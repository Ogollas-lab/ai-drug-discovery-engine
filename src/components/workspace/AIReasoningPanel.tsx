import React from 'react';
import { motion } from 'framer-motion';
import { Brain, Info, AlertTriangle, ChevronRight, BarChart3 } from 'lucide-react';

interface FeatureImportance {
  feature: string;
  impact: number; // -1 to 1
}

interface XAIReasoningProps {
  reasoning: string;
  topFeatures?: FeatureImportance[];
  loading?: boolean;
}

const AIReasoningPanel: React.FC<XAIReasoningProps> = ({ reasoning, topFeatures = [], loading = false }) => {
  if (loading) {
    return (
      <div className="animate-pulse space-y-3 p-4 bg-secondary/30 rounded-xl border border-border/50">
        <div className="h-4 bg-secondary rounded w-1/4"></div>
        <div className="h-3 bg-secondary rounded w-full"></div>
        <div className="h-3 bg-secondary rounded w-5/6"></div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Reasoning Text */}
      <div className="relative overflow-hidden p-4 rounded-xl bg-gradient-to-br from-primary/5 via-transparent to-primary/5 border border-primary/20">
        <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
        <div className="flex items-start gap-3">
          <Brain className="w-4 h-4 text-primary mt-0.5 shrink-0" />
          <div className="space-y-1">
            <h4 className="text-[11px] font-mono font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
              AI Scientific Reasoning
            </h4>
            <p className="text-xs text-foreground leading-relaxed leading-relaxed font-medium">
              {reasoning}
            </p>
          </div>
        </div>
      </div>

      {/* Feature Importance / Contributing Factors */}
      {topFeatures && topFeatures.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <BarChart3 className="w-3 h-3" />
              Structural Contributions
            </h4>
          </div>
          
          <div className="grid grid-cols-1 gap-2">
            {topFeatures.map((feat, idx) => (
              <div key={idx} className="flex items-center gap-3 p-2 rounded-lg bg-secondary/50 border border-border/40 hover:border-primary/30 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-medium truncate">{feat.feature}</span>
                    <span className={`text-[9px] font-mono ${feat.impact > 0 ? 'text-primary' : 'text-destructive'}`}>
                      {feat.impact > 0 ? '+' : ''}{(feat.impact * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-1 rounded-full bg-background overflow-hidden relative">
                    <div 
                      className="absolute top-0 left-1/2 w-px h-full bg-border z-10" 
                    />
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ 
                        width: `${Math.abs(feat.impact) * 50}%`,
                        left: feat.impact > 0 ? '50%' : `${50 - Math.abs(feat.impact) * 50}%`
                      }}
                      className={`h-full rounded-full ${feat.impact > 0 ? 'bg-primary' : 'bg-destructive'}`}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Methodology Tip */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/30 border border-border/50 text-[9px] text-muted-foreground italic">
        <Info className="w-3 h-3 text-primary shrink-0" />
        Derived from molecular fingerprint analysis intersecting with known SAR data.
      </div>
    </motion.div>
  );
};

export default AIReasoningPanel;
