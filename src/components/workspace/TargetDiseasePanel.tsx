import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ChevronRight, Target, Stethoscope } from "lucide-react";
import { TARGETS, DISEASES, type TargetInfo, type DiseaseInfo } from "@/data/targets";

interface TargetDiseasePanelProps {
  onSelectTarget: (target: TargetInfo) => void;
  selectedTarget: TargetInfo | null;
}

const TargetDiseasePanel = ({ onSelectTarget, selectedTarget }: TargetDiseasePanelProps) => {
  const [tab, setTab] = useState<"target" | "disease">("target");
  const [search, setSearch] = useState("");

  const filteredTargets = TARGETS.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.gene.toLowerCase().includes(search.toLowerCase())
  );

  const filteredDiseases = DISEASES.filter((d) =>
    d.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleDiseaseClick = (disease: DiseaseInfo) => {
    const target = TARGETS.find((t) => disease.targets.includes(t.id));
    if (target) onSelectTarget(target);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Tab header */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setTab("target")}
          className={`flex-1 py-2.5 text-xs font-mono flex items-center justify-center gap-1.5 transition-colors ${
            tab === "target" ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Target className="w-3.5 h-3.5" /> By Target
        </button>
        <button
          onClick={() => setTab("disease")}
          className={`flex-1 py-2.5 text-xs font-mono flex items-center justify-center gap-1.5 transition-colors ${
            tab === "disease" ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Stethoscope className="w-3.5 h-3.5" /> By Disease
        </button>
      </div>

      {/* Search */}
      <div className="p-3">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={tab === "target" ? "EGFR, COX-2, ACE2..." : "Hypertension, Cancer..."}
            className="w-full pl-8 pr-3 py-2 rounded-md text-xs font-mono bg-background border border-border focus:border-primary/50 focus:outline-none transition-colors"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-1">
        <AnimatePresence mode="wait">
          {tab === "target" ? (
            <motion.div key="targets" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-1">
              {filteredTargets.map((t) => (
                <button
                  key={t.id}
                  onClick={() => onSelectTarget(t)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-xs transition-all ${
                    selectedTarget?.id === t.id
                      ? "bg-primary/10 border border-primary/30"
                      : "hover:bg-secondary border border-transparent"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-mono text-primary font-semibold">{t.gene}</span>
                      <span className="text-muted-foreground ml-2">{t.name.length > 28 ? t.name.slice(0, 28) + "…" : t.name}</span>
                    </div>
                    <ChevronRight className="w-3 h-3 text-muted-foreground" />
                  </div>
                  <div className="flex gap-1 mt-1.5">
                    {t.tags.map((tag) => (
                      <span key={tag} className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-secondary text-muted-foreground">
                        {tag}
                      </span>
                    ))}
                  </div>
                </button>
              ))}
            </motion.div>
          ) : (
            <motion.div key="diseases" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-1">
              {filteredDiseases.map((d) => (
                <button
                  key={d.id}
                  onClick={() => handleDiseaseClick(d)}
                  className="w-full text-left px-3 py-2.5 rounded-lg text-xs hover:bg-secondary border border-transparent transition-all"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">{d.icon}</span>
                    <div>
                      <div className="font-semibold text-foreground">{d.name}</div>
                      <div className="text-muted-foreground text-[10px] font-mono">{d.category}</div>
                    </div>
                  </div>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Selected target detail */}
      {selectedTarget && (
        <div className="border-t border-border p-3 space-y-2">
          <div className="text-xs font-display font-semibold text-primary">{selectedTarget.gene}</div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">{selectedTarget.description}</p>
          <div className="space-y-1">
            <div className="text-[10px] font-mono text-muted-foreground">Known drugs:</div>
            <div className="flex flex-wrap gap-1">
              {selectedTarget.existingDrugs.map((d) => (
                <span key={d} className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-primary/10 text-primary border border-primary/20">
                  {d}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TargetDiseasePanel;
