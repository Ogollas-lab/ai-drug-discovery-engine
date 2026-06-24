import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, Bot, CheckCircle2, AlertTriangle, Sparkles } from "lucide-react";
import { subscribeRunEvents, approveEngineRun, rejectEngineRun, type RunEvent } from "@/lib/engine-api";
import { Button } from "@/components/ui/button";

interface EngineProgressProps {
  runId: string | null;
  onComplete?: (event: RunEvent) => void;
}

const STEP_LABELS: Record<string, string> = {
  discovery: "Discovery — PubChem descriptors",
  docking: "Docking — structure analysis (NIM stub)",
  analysis: "Analysis — medicinal chemistry rules",
  safety: "Safety — guardrail evaluation",
  reporting: "Reporting — LLM SAR narrative",
};

export default function EngineProgress({ runId, onComplete }: EngineProgressProps) {
  const [events, setEvents] = useState<RunEvent[]>([]);
  const [status, setStatus] = useState<string>("connecting");
  const [hitlBusy, setHitlBusy] = useState(false);

  useEffect(() => {
    if (!runId) return;

    setEvents([]);
    setStatus("running");

    const unsubscribe = subscribeRunEvents(runId, (event) => {
      setEvents((prev) => [...prev, event]);
      if (event.type === "run_complete") {
        setStatus(event.status === "awaiting_hitl" ? "hitl" : "complete");
        onComplete?.(event);
      }
      if (event.type === "hitl_resolved") {
        setStatus(event.decision === "approved" ? "complete" : "rejected");
      }
      if (event.type === "run_failed") setStatus("failed");
    });

    return unsubscribe;
  }, [runId, onComplete]);

  const handleApprove = async () => {
    if (!runId) return;
    setHitlBusy(true);
    try {
      await approveEngineRun(runId, "Approved after safety review");
      setStatus("complete");
    } finally {
      setHitlBusy(false);
    }
  };

  const handleReject = async () => {
    if (!runId) return;
    setHitlBusy(true);
    try {
      await rejectEngineRun(runId, "Rejected — safety flags unresolved");
      setStatus("rejected");
    } finally {
      setHitlBusy(false);
    }
  };

  if (!runId) return null;

  const completedSteps = events.filter((e) => e.type === "step_complete").map((e) => e.step);

  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2">
      <div className="flex items-center gap-2 text-xs font-mono text-primary">
        <Sparkles className="w-3.5 h-3.5" />
        LangChain DMTA Pipeline
        {status === "running" && <Activity className="w-3 h-3 animate-spin ml-auto" />}
        {status === "complete" && <CheckCircle2 className="w-3.5 h-3.5 text-primary ml-auto" />}
        {status === "hitl" && <AlertTriangle className="w-3.5 h-3.5 text-amber-400 ml-auto" />}
      </div>

      <div className="space-y-1">
        {Object.entries(STEP_LABELS).map(([key, label]) => {
          const done = completedSteps.includes(key);
          const active = events.some((e) => e.type === "step_start" && e.step === key) && !done;
          return (
            <div key={key} className="flex items-center gap-2 text-[10px] font-mono">
              {done ? (
                <CheckCircle2 className="w-3 h-3 text-primary shrink-0" />
              ) : active ? (
                <Activity className="w-3 h-3 text-primary animate-spin shrink-0" />
              ) : (
                <Bot className="w-3 h-3 text-muted-foreground shrink-0" />
              )}
              <span className={done ? "text-primary" : active ? "text-foreground" : "text-muted-foreground"}>
                {label}
              </span>
            </div>
          );
        })}
      </div>

      <AnimatePresence>
        {status === "hitl" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
            <p className="text-[10px] text-amber-400/90 border border-amber-400/20 rounded px-2 py-1">
              Human review required — low confidence or safety flags detected.
            </p>
            <div className="flex gap-2">
              <Button size="sm" className="h-7 text-xs flex-1" onClick={handleApprove} disabled={hitlBusy}>
                Approve
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs flex-1" onClick={handleReject} disabled={hitlBusy}>
                Reject
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
