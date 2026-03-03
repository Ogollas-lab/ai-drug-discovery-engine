import { useState } from "react";
import Navbar from "@/components/Navbar";
import FooterSection from "@/components/FooterSection";
import TargetDiseasePanel from "@/components/workspace/TargetDiseasePanel";
import WorkspaceAnalyzer from "@/components/workspace/WorkspaceAnalyzer";
import ClinicalSafetyPanel from "@/components/workspace/ClinicalSafetyPanel";
import PipelineStrip from "@/components/workspace/PipelineStrip";
import MissionControl from "@/components/workspace/MissionControl";
import { type TargetInfo, type MoleculeResult } from "@/data/targets";

const Workspace = () => {
  const [selectedTarget, setSelectedTarget] = useState<TargetInfo | null>(null);
  const [analysisResult, setAnalysisResult] = useState<MoleculeResult | null>(null);

  const activePhase = analysisResult ? 3 : selectedTarget ? 1 : 0;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-16 pb-8 px-4">
        <div className="max-w-[1400px] mx-auto">
          {/* Experiment header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h1 className="font-display text-xl font-bold">Workspace</h1>
              {selectedTarget && (
                <span className="px-2.5 py-1 rounded-md text-xs font-mono bg-primary/10 text-primary border border-primary/20">
                  {selectedTarget.tags[0]} · {selectedTarget.gene}
                </span>
              )}
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${analysisResult ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground"}`}>
                {analysisResult ? "Completed" : selectedTarget ? "Running" : "Idle"}
              </span>
            </div>
          </div>

          {/* Pipeline strip */}
          <PipelineStrip activePhase={activePhase} />

          {/* Mission control */}
          <div className="mb-4">
            <MissionControl />
          </div>

          {/* 3-column layout */}
          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_280px] gap-4 min-h-[600px]">
            {/* Left: Target & Disease */}
            <div className="glass-panel rounded-xl border border-border/50 overflow-hidden glow-border">
              <TargetDiseasePanel
                onSelectTarget={setSelectedTarget}
                selectedTarget={selectedTarget}
              />
            </div>

            {/* Center: Analyzer */}
            <div className="glass-panel rounded-xl border border-border/50 overflow-hidden glow-border">
              <WorkspaceAnalyzer
                selectedTarget={selectedTarget}
                onResult={setAnalysisResult}
              />
            </div>

            {/* Right: Clinical Safety */}
            <div className="glass-panel rounded-xl border border-border/50 overflow-hidden glow-border">
              <ClinicalSafetyPanel result={analysisResult} />
            </div>
          </div>
        </div>
      </div>
      <FooterSection />
    </div>
  );
};

export default Workspace;
