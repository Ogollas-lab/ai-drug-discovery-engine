import { motion } from "framer-motion";
import { Cpu, Gauge, Clock, Zap, Database, Activity } from "lucide-react";
import { useEffect, useState } from "react";

const MissionControl = () => {
  const [gpuUtil, setGpuUtil] = useState(42);
  const [queueJobs, setQueueJobs] = useState(3);
  const [uptime, setUptime] = useState(99.7);

  useEffect(() => {
    const interval = setInterval(() => {
      setGpuUtil((v) => Math.min(100, Math.max(20, v + (Math.random() * 10 - 5))));
      setQueueJobs(Math.floor(Math.random() * 8));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const gauges = [
    { icon: Cpu, label: "GPU Util", value: `${Math.round(gpuUtil)}%`, color: gpuUtil > 80 ? "text-destructive" : "text-primary" },
    { icon: Database, label: "Queue", value: `${queueJobs} jobs`, color: "text-accent" },
    { icon: Clock, label: "Uptime", value: `${uptime}%`, color: "text-primary" },
    { icon: Zap, label: "Throughput", value: "847/hr", color: "text-neon-cyan" },
  ];

  return (
    <div className="glass-panel rounded-xl border border-border/50 p-4 glow-border">
      <div className="flex items-center gap-2 mb-3">
        <Activity className="w-4 h-4 text-primary" />
        <span className="text-xs font-display font-semibold">Mission Control</span>
        <motion.div
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-1.5 h-1.5 rounded-full bg-primary ml-auto"
        />
        <span className="text-[10px] font-mono text-primary">LIVE</span>
      </div>
      <div className="grid grid-cols-4 gap-3">
        {gauges.map((g) => (
          <div key={g.label} className="text-center">
            <g.icon className={`w-4 h-4 mx-auto mb-1 ${g.color}`} />
            <div className={`text-sm font-mono font-bold ${g.color}`}>{g.value}</div>
            <div className="text-[9px] text-muted-foreground font-mono">{g.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MissionControl;
