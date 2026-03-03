import { motion } from "framer-motion";
import { Target, Search, Filter, Trophy } from "lucide-react";

const phases = [
  { icon: Target, label: "Target ID", color: "text-primary" },
  { icon: Search, label: "Virtual Screen", color: "text-accent" },
  { icon: Filter, label: "Filter & ADMET", color: "text-neon-purple" },
  { icon: Trophy, label: "Prioritize", color: "text-primary" },
];

interface PipelineStripProps {
  activePhase?: number;
}

const PipelineStrip = ({ activePhase = 0 }: PipelineStripProps) => (
  <div className="flex items-center gap-1 p-3">
    {phases.map((phase, i) => (
      <div key={phase.label} className="flex items-center flex-1">
        <motion.div
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-mono transition-all w-full ${
            i <= activePhase
              ? "bg-primary/10 border border-primary/20 text-primary"
              : "bg-secondary/50 border border-border text-muted-foreground"
          }`}
          animate={i === activePhase ? { scale: [1, 1.02, 1] } : {}}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <phase.icon className={`w-3.5 h-3.5 ${i <= activePhase ? phase.color : ""}`} />
          <span className="hidden sm:inline">{phase.label}</span>
        </motion.div>
        {i < phases.length - 1 && (
          <div className={`w-4 h-px mx-1 ${i < activePhase ? "bg-primary/40" : "bg-border"}`} />
        )}
      </div>
    ))}
  </div>
);

export default PipelineStrip;
