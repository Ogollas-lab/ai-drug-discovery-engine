import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, BookOpen, Beaker, Brain, CheckCircle, ChevronRight, GraduationCap, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import FooterSection from "@/components/FooterSection";
import ConceptTooltip from "@/components/ConceptTooltip";
import { generateMoleculeResult, SAMPLE_MOLECULES } from "@/data/targets";

interface CaseScenario {
  id: string;
  title: string;
  vignette: string;
  objectives: string[];
  icon: string;
  smiles: string;
  steps: StepInfo[];
}

interface StepInfo {
  title: string;
  content: string;
  conceptKeys: string[];
}

const CASES: CaseScenario[] = [
  {
    id: "nsaid-warfarin",
    title: "Design a Safer NSAID for a Patient on Warfarin",
    vignette: "A 68-year-old man with osteoarthritis is on warfarin for atrial fibrillation. He needs pain relief but his current NSAID is increasing his bleeding risk. Can we find a molecule with strong COX-2 affinity but lower interaction potential?",
    objectives: [
      "Understand COX-2 selectivity and its clinical importance",
      "Evaluate drug-drug interaction risk with anticoagulants",
      "Apply Lipinski's rules to assess oral bioavailability",
    ],
    icon: "💊",
    smiles: "CC(=O)OC1=CC=CC=C1C(=O)O",
    steps: [
      {
        title: "Understand the Target",
        content: "COX-2 is the inducible cyclooxygenase enzyme responsible for inflammation. Unlike COX-1 (which protects gastric mucosa), selective COX-2 inhibition provides anti-inflammatory effects with less GI bleeding — critical for a patient already on anticoagulation.",
        conceptKeys: ["ki", "docking"],
      },
      {
        title: "Choose a Starting Scaffold",
        content: "We'll start with aspirin (acetylsalicylic acid) as our reference compound. Aspirin inhibits both COX-1 and COX-2 non-selectively, and irreversibly inhibits platelet aggregation — a double problem for our warfarin patient.",
        conceptKeys: ["logp", "lipinski"],
      },
      {
        title: "Run Predictions",
        content: "Submit the SMILES string to predict binding affinity, check Lipinski compliance, and evaluate the ADMET profile. Pay special attention to CYP interactions — warfarin is metabolized by CYP2C9 and CYP3A4.",
        conceptKeys: ["admet", "qsar"],
      },
      {
        title: "Interpret Results",
        content: "Review the binding affinity score, off-target profile (especially COX-1 and hERG), and drug-drug interaction warnings. A safer NSAID for this patient would show: high COX-2 affinity, low COX-1 binding, no CYP2C9 interference, and acceptable hERG safety.",
        conceptKeys: ["herg", "tpsa"],
      },
      {
        title: "Reflect & Decide",
        content: "Would you prescribe this compound to the patient? Consider the balance between efficacy (pain relief) and safety (bleeding risk, cardiac risk). Remember: celecoxib was designed as a selective COX-2 inhibitor but later showed cardiovascular risks. No drug is without trade-offs.",
        conceptKeys: [],
      },
    ],
  },
  {
    id: "qt-prolongation",
    title: "Avoid QT Prolongation in an Antipsychotic",
    vignette: "A pharmaceutical team is developing a new atypical antipsychotic. Early screening shows moderate hERG channel binding. Your task: evaluate the compound's cardiac safety profile and suggest structural modifications.",
    objectives: [
      "Understand hERG channel blockade and QT prolongation",
      "Interpret off-target binding profiles",
      "Propose structure-activity relationship changes",
    ],
    icon: "❤️",
    smiles: "CN1C=NC2=C1C(=O)N(C(=O)N2C)C",
    steps: [
      { title: "Understand hERG Risk", content: "The hERG potassium channel controls cardiac repolarization. Blocking it delays the QT interval, risking torsades de pointes. Many drugs have been withdrawn for this reason (terfenadine, cisapride).", conceptKeys: ["herg"] },
      { title: "Analyze the Compound", content: "Submit the candidate compound and examine the hERG binding score in the off-target profile. Scores above 0.5 warrant concern.", conceptKeys: ["docking", "ki"] },
      { title: "Evaluate ADMET", content: "Check metabolic pathways — CYP3A4 inhibitors can increase blood levels of hERG-blocking drugs, amplifying QT risk. Also check LogP: highly lipophilic compounds tend to have higher hERG affinity.", conceptKeys: ["admet", "logp"] },
      { title: "Consider Modifications", content: "Reducing lipophilicity (lower LogP) often reduces hERG binding. Adding polar groups or reducing molecular weight can help. Use the 'what-if' approach to test changes.", conceptKeys: ["lipinski", "qsar"] },
      { title: "Clinical Decision", content: "Would this compound proceed to clinical trials? What monitoring would you require (regular ECGs? Baseline QTc exclusion criteria)? Reflect on the risk-benefit ratio.", conceptKeys: [] },
    ],
  },
  {
    id: "bbb-penetration",
    title: "Brain-Penetrant Drug for Epilepsy",
    vignette: "A patient with refractory temporal lobe epilepsy needs a new anticonvulsant that can cross the blood-brain barrier effectively. Current medications are not controlling seizures.",
    objectives: [
      "Understand blood-brain barrier penetration requirements",
      "Use TPSA and LogP to predict CNS access",
      "Balance efficacy with peripheral side effects",
    ],
    icon: "🧠",
    smiles: "CC(C)CC1=CC=C(C=C1)C(C)C(O)=O",
    steps: [
      { title: "BBB Requirements", content: "To cross the blood-brain barrier, a compound generally needs: MW <450, TPSA <90 Å², LogP 1-3, few H-bond donors (<3). These are guidelines, not absolute rules.", conceptKeys: ["tpsa", "logp"] },
      { title: "Analyze Candidate", content: "Submit the compound and check its physicochemical properties against BBB criteria. Pay special attention to TPSA — the most predictive single parameter for CNS penetration.", conceptKeys: ["lipinski", "admet"] },
      { title: "Off-Target Safety", content: "CNS drugs must be screened carefully against hERG (seizure drugs may also affect cardiac channels) and CYP enzymes (epilepsy patients are often on multiple medications).", conceptKeys: ["herg", "ki"] },
      { title: "Drug Interactions", content: "Epilepsy patients often take multiple anticonvulsants. CYP induction/inhibition can dramatically alter drug levels. Check for CYP3A4 and CYP2D6 interactions.", conceptKeys: ["admet", "qsar"] },
      { title: "Treatment Decision", content: "Would this compound be a good addition to the patient's regimen? Consider drug-drug interactions, CNS side effects (sedation, cognitive impairment), and monitoring needs.", conceptKeys: [] },
    ],
  },
];

const Education = () => {
  const [selectedCase, setSelectedCase] = useState<CaseScenario | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [analysisResult, setAnalysisResult] = useState<ReturnType<typeof generateMoleculeResult> | null>(null);

  const handleSelectCase = (c: CaseScenario) => {
    setSelectedCase(c);
    setCurrentStep(0);
    setAnalysisResult(null);
  };

  const runAnalysis = () => {
    if (selectedCase) {
      const result = generateMoleculeResult(selectedCase.smiles);
      setAnalysisResult(result);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-20 pb-16 px-6">
        <div className="max-w-6xl mx-auto">
          {!selectedCase ? (
            /* Scenario selector */
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <div className="flex items-center gap-3 mb-2">
                <Link to="/">
                  <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                </Link>
                <div>
                  <h1 className="font-display text-3xl font-bold">
                    Education <span className="text-primary">Mode</span>
                  </h1>
                  <p className="text-sm text-muted-foreground mt-1">Virtual Lab — learn drug discovery through guided clinical scenarios</p>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4 mt-8">
                {CASES.map((c) => (
                  <motion.button
                    key={c.id}
                    whileHover={{ y: -4 }}
                    onClick={() => handleSelectCase(c)}
                    className="glass-panel rounded-xl p-5 glow-border text-left hover:border-primary/30 transition-all"
                  >
                    <div className="text-3xl mb-3">{c.icon}</div>
                    <h3 className="font-display font-semibold text-sm mb-2">{c.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed mb-3 line-clamp-3">{c.vignette}</p>
                    <div className="space-y-1">
                      {c.objectives.map((obj, i) => (
                        <div key={i} className="flex items-start gap-1.5 text-[10px] text-muted-foreground">
                          <Lightbulb className="w-3 h-3 text-primary shrink-0 mt-0.5" />
                          {obj}
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-1 mt-4 text-xs text-primary font-mono">
                      Start case <ChevronRight className="w-3 h-3" />
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          ) : (
            /* Step-by-step panel */
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="flex items-center gap-3 mb-6">
                <Button variant="ghost" size="icon" onClick={() => setSelectedCase(null)} className="text-muted-foreground hover:text-foreground">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{selectedCase.icon}</span>
                    <h1 className="font-display text-lg font-bold">{selectedCase.title}</h1>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">Step {currentStep + 1} of {selectedCase.steps.length}</p>
                </div>
              </div>

              <div className="grid lg:grid-cols-[200px_1fr_280px] gap-4">
                {/* Left: Step navigation */}
                <div className="glass-panel rounded-xl p-3 glow-border">
                  <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-3">Steps</div>
                  <div className="space-y-1">
                    {selectedCase.steps.map((step, i) => (
                      <button
                        key={i}
                        onClick={() => setCurrentStep(i)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all flex items-center gap-2 ${
                          i === currentStep
                            ? "bg-primary/10 border border-primary/30 text-primary"
                            : i < currentStep
                            ? "text-primary/60"
                            : "text-muted-foreground hover:bg-secondary"
                        }`}
                      >
                        {i < currentStep ? (
                          <CheckCircle className="w-3 h-3 shrink-0" />
                        ) : (
                          <span className="w-3 h-3 rounded-full border border-current shrink-0 text-center text-[8px] leading-3">
                            {i + 1}
                          </span>
                        )}
                        <span className="truncate">{step.title}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Center: Content */}
                <div className="glass-panel rounded-xl p-6 glow-border">
                  <AnimatePresence mode="wait">
                    <motion.div key={currentStep} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Beaker className="w-4 h-4 text-primary" />
                        <h2 className="font-display font-semibold">{selectedCase.steps[currentStep].title}</h2>
                      </div>
                      <p className="text-sm text-foreground/80 leading-relaxed">{selectedCase.steps[currentStep].content}</p>

                      {currentStep === 2 && !analysisResult && (
                        <Button onClick={runAnalysis} className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2">
                          <Beaker className="w-4 h-4" /> Run Analysis
                        </Button>
                      )}

                      {analysisResult && currentStep >= 2 && (
                        <div className="glass-panel rounded-lg p-4 border border-primary/20 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-xs text-primary">{analysisResult.name}</span>
                            <span className={`text-xs font-mono ${analysisResult.drugLike ? "text-primary" : "text-destructive"}`}>
                              {analysisResult.drugLike ? "✓ Drug-like" : `✗ ${analysisResult.violations} violation(s)`}
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-[10px]">
                            <div className="bg-background/50 rounded p-2 border border-border">
                              <div className="text-muted-foreground font-mono">Affinity</div>
                              <div className="text-sm font-bold text-primary">{analysisResult.affinity.toFixed(2)}</div>
                            </div>
                            <div className="bg-background/50 rounded p-2 border border-border">
                              <div className="text-muted-foreground font-mono">hERG Risk</div>
                              <div className={`text-sm font-bold ${analysisResult.admet.hergRisk === "high" ? "text-destructive" : analysisResult.admet.hergRisk === "moderate" ? "text-yellow-400" : "text-primary"}`}>
                                {analysisResult.admet.hergRisk}
                              </div>
                            </div>
                            <div className="bg-background/50 rounded p-2 border border-border">
                              <div className="text-muted-foreground font-mono">CYP3A4</div>
                              <div className={`text-sm font-bold ${analysisResult.admet.cyp3a4 ? "text-yellow-400" : "text-primary"}`}>
                                {analysisResult.admet.cyp3a4 ? "Substrate" : "Clear"}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Navigation */}
                      <div className="flex justify-between pt-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={currentStep === 0}
                          onClick={() => setCurrentStep((s) => s - 1)}
                          className="gap-1 text-muted-foreground"
                        >
                          <ArrowLeft className="w-3 h-3" /> Previous
                        </Button>
                        <Button
                          size="sm"
                          disabled={currentStep === selectedCase.steps.length - 1}
                          onClick={() => setCurrentStep((s) => s + 1)}
                          className="bg-primary text-primary-foreground hover:bg-primary/90 gap-1"
                        >
                          Next <ArrowRight className="w-3 h-3" />
                        </Button>
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Right: Teach-me panel */}
                <div className="glass-panel rounded-xl p-4 glow-border">
                  <div className="flex items-center gap-2 mb-3">
                    <GraduationCap className="w-4 h-4 text-accent" />
                    <span className="text-xs font-display font-semibold">Concepts</span>
                  </div>
                  <div className="space-y-3">
                    {selectedCase.steps[currentStep].conceptKeys.length > 0 ? (
                      selectedCase.steps[currentStep].conceptKeys.map((key) => (
                        <div key={key} className="space-y-1">
                          <ConceptTooltip conceptKey={key} />
                        </div>
                      ))
                    ) : (
                      <div className="text-xs text-muted-foreground">
                        <Brain className="w-6 h-6 mx-auto mb-2 opacity-30" />
                        <p className="text-center">Reflection step — no new concepts. Consider what you've learned and how it applies to the clinical scenario.</p>
                      </div>
                    )}
                  </div>

                  {/* Vignette reminder */}
                  <div className="mt-6 pt-4 border-t border-border">
                    <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-2">Clinical Vignette</div>
                    <p className="text-[11px] text-foreground/60 leading-relaxed">{selectedCase.vignette}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
      <FooterSection />
    </div>
  );
};

export default Education;
