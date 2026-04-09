import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, ArrowRight, BookOpen, Beaker, Brain, CheckCircle, ChevronRight,
  GraduationCap, Lightbulb, Search, Clock, BarChart3, Globe, Microscope,
  FlaskConical, Dna, BookMarked, Sparkles, ChevronDown, ChevronUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import FooterSection from "@/components/FooterSection";
import ConceptTooltip from "@/components/ConceptTooltip";
import { generateMoleculeResult, SAMPLE_MOLECULES } from "@/data/targets";
import {
  LEARNING_PATHS, LEARNING_MODULES, EXPANDED_GLOSSARY, QUICK_FACTS,
  type LearningModule, type GlossaryEntry
} from "@/data/education-content";

// ─── Types ──────────────────────────────────────────────────────
interface CaseScenario {
  id: string;
  title: string;
  vignette: string;
  objectives: string[];
  icon: string;
  smiles: string;
  steps: StepInfo[];
  category: string;
}

interface StepInfo {
  title: string;
  content: string;
  conceptKeys: string[];
}

type ViewMode = "hub" | "cases" | "case-detail" | "modules" | "module-detail" | "glossary";

// ─── Case Scenarios ─────────────────────────────────────────────
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
    category: "Clinical Pharmacology",
    steps: [
      { title: "Understand the Target", content: "COX-2 is the inducible cyclooxygenase enzyme responsible for inflammation. Unlike COX-1 (which protects gastric mucosa), selective COX-2 inhibition provides anti-inflammatory effects with less GI bleeding — critical for a patient already on anticoagulation.", conceptKeys: ["ki", "docking"] },
      { title: "Choose a Starting Scaffold", content: "We'll start with aspirin (acetylsalicylic acid) as our reference compound. Aspirin inhibits both COX-1 and COX-2 non-selectively, and irreversibly inhibits platelet aggregation — a double problem for our warfarin patient.", conceptKeys: ["logp", "lipinski"] },
      { title: "Run Predictions", content: "Submit the SMILES string to predict binding affinity, check Lipinski compliance, and evaluate the ADMET profile. Pay special attention to CYP interactions — warfarin is metabolized by CYP2C9 and CYP3A4.", conceptKeys: ["admet", "qsar"] },
      { title: "Interpret Results", content: "Review the binding affinity score, off-target profile (especially COX-1 and hERG), and drug-drug interaction warnings. A safer NSAID for this patient would show: high COX-2 affinity, low COX-1 binding, no CYP2C9 interference, and acceptable hERG safety.", conceptKeys: ["herg", "tpsa"] },
      { title: "Reflect & Decide", content: "Would you prescribe this compound to the patient? Consider the balance between efficacy (pain relief) and safety (bleeding risk, cardiac risk). Remember: celecoxib was designed as a selective COX-2 inhibitor but later showed cardiovascular risks. No drug is without trade-offs.", conceptKeys: [] },
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
    category: "Cardiac Safety",
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
    category: "CNS Drug Design",
    steps: [
      { title: "BBB Requirements", content: "To cross the blood-brain barrier, a compound generally needs: MW <450, TPSA <90 Å², LogP 1-3, few H-bond donors (<3). These are guidelines, not absolute rules.", conceptKeys: ["tpsa", "logp"] },
      { title: "Analyze Candidate", content: "Submit the compound and check its physicochemical properties against BBB criteria. Pay special attention to TPSA — the most predictive single parameter for CNS penetration.", conceptKeys: ["lipinski", "admet"] },
      { title: "Off-Target Safety", content: "CNS drugs must be screened carefully against hERG (seizure drugs may also affect cardiac channels) and CYP enzymes (epilepsy patients are often on multiple medications).", conceptKeys: ["herg", "ki"] },
      { title: "Drug Interactions", content: "Epilepsy patients often take multiple anticonvulsants. CYP induction/inhibition can dramatically alter drug levels. Check for CYP3A4 and CYP2D6 interactions.", conceptKeys: ["admet", "qsar"] },
      { title: "Treatment Decision", content: "Would this compound be a good addition to the patient's regimen? Consider drug-drug interactions, CNS side effects (sedation, cognitive impairment), and monitoring needs.", conceptKeys: [] },
    ],
  },
  {
    id: "malaria-resistance",
    title: "Overcoming Antimalarial Drug Resistance",
    vignette: "In a rural clinic in sub-Saharan Africa, a child with severe P. falciparum malaria is not responding to standard artemisinin-based combination therapy (ACT). The local resistance map shows K13 C580Y mutations. You need to evaluate an alternative compound.",
    objectives: [
      "Understand artemisinin resistance mechanisms",
      "Evaluate compounds against resistant Plasmodium strains",
      "Consider oral bioavailability for resource-limited settings",
    ],
    icon: "🦟",
    smiles: "OC(=O)C1=CC=CC=C1O",
    category: "African Health",
    steps: [
      { title: "Resistance Mechanisms", content: "Artemisinin resistance in P. falciparum is primarily mediated by mutations in the K13 (Kelch13) propeller domain, especially C580Y. These mutations allow the parasite to enter a quiescent state during the ring stage, surviving artemisinin exposure. This doesn't eliminate artemisinin activity but delays parasite clearance.", conceptKeys: ["ki"] },
      { title: "Target Selection", content: "For resistant malaria, we look beyond traditional targets. PfATP4 (sodium pump) and PI4K (lipid kinase) are promising because they act through mechanisms independent of artemisinin. No cross-resistance has been observed.", conceptKeys: ["docking"] },
      { title: "Evaluate the Candidate", content: "Run prediction analysis on the candidate molecule. For antimalarials in Africa, prioritize: oral bioavailability (critical — no IV access), thermal stability (no cold chain), low cost of synthesis, and a short treatment course (3 days maximum for adherence).", conceptKeys: ["lipinski", "admet"] },
      { title: "Safety for Children", content: "Children under 5 account for 80% of malaria deaths. The compound must have: acceptable taste (for pediatric suspensions), weight-based dosing flexibility, no teratogenicity, and minimal interaction with nutritional supplements (iron, zinc).", conceptKeys: ["tpsa", "logp"] },
      { title: "Public Health Impact", content: "Consider the compound's potential for combination therapy (ACTs are the standard). Is it compatible with existing partner drugs? Could it be manufactured affordably (<$1/treatment)? Reflect on the global health equity implications.", conceptKeys: [] },
    ],
  },
  {
    id: "scd-hbf-induction",
    title: "Inducing Fetal Hemoglobin for Sickle Cell Disease",
    vignette: "A 12-year-old Nigerian girl with sickle cell disease (HbSS) is experiencing frequent vaso-occlusive crises despite hydroxyurea therapy. Her HbF level is only 8%. The team wants to evaluate a novel HbF inducer that could be used alongside or instead of hydroxyurea.",
    objectives: [
      "Understand the role of fetal hemoglobin in SCD management",
      "Evaluate drug candidates for HbF induction potential",
      "Consider safety in the context of existing SCD complications",
    ],
    icon: "🩸",
    smiles: "CC(C)CC1=CC=C(C=C1)C(C)C(O)=O",
    category: "African Health",
    steps: [
      { title: "HbF and Sickle Cell", content: "Fetal hemoglobin (HbF, α2γ2) inhibits HbS polymerization by disrupting the deoxy-HbS fiber contacts. Patients with naturally high HbF (>20%) have milder disease. Hydroxyurea induces HbF but has dose-limiting myelosuppression. The BCL11A transcription factor represses γ-globin — inhibiting BCL11A is a validated approach.", conceptKeys: ["ki", "docking"] },
      { title: "Evaluate Compound Properties", content: "For chronic daily therapy in African SCD patients, the compound needs: excellent oral bioavailability (MW <500, LogP 0–3), long half-life (once-daily dosing), and minimal bone marrow toxicity. Check Lipinski compliance and ADMET profile.", conceptKeys: ["lipinski", "admet"] },
      { title: "Safety Assessment", content: "SCD patients have pre-existing organ damage: sickle nephropathy (kidneys), hepatopathy (liver from iron overload and sickling), and stroke risk. Avoid compounds that are nephrotoxic, hepatotoxic, or that increase stroke risk. hERG safety is relevant as SCD patients may have cardiac complications.", conceptKeys: ["herg", "tpsa"] },
      { title: "Drug Interactions", content: "Many SCD patients take hydroxyurea, folic acid, penicillin prophylaxis, and iron chelators (deferasirox). Check for CYP interactions with these co-medications. Deferasirox is a CYP3A4 substrate — interactions could alter its levels.", conceptKeys: ["admet", "qsar"] },
      { title: "Access & Equity", content: "Reflect: 75% of SCD births occur in sub-Saharan Africa, but most SCD drug development occurs in the US/Europe. Gene therapy (e.g., Casgevy) costs >$2M/patient — inaccessible in Africa. Affordable oral HbF inducers could save thousands of lives. What price point would be equitable?", conceptKeys: [] },
    ],
  },
];

// ─── Component ──────────────────────────────────────────────────
const Education = () => {
  const [view, setView] = useState<ViewMode>("hub");
  const [selectedCase, setSelectedCase] = useState<CaseScenario | null>(null);
  const [selectedModule, setSelectedModule] = useState<LearningModule | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [currentSection, setCurrentSection] = useState(0);
  const [analysisResult, setAnalysisResult] = useState<ReturnType<typeof generateMoleculeResult> | null>(null);
  const [glossarySearch, setGlossarySearch] = useState("");
  const [expandedGlossary, setExpandedGlossary] = useState<string | null>(null);

  const randomFact = useMemo(() => QUICK_FACTS[Math.floor(Math.random() * QUICK_FACTS.length)], []);

  const filteredGlossary = useMemo(() => {
    if (!glossarySearch) return EXPANDED_GLOSSARY;
    const q = glossarySearch.toLowerCase();
    return EXPANDED_GLOSSARY.filter(
      (e) => e.term.toLowerCase().includes(q) || e.definition.toLowerCase().includes(q) || e.category.toLowerCase().includes(q)
    );
  }, [glossarySearch]);

  const handleSelectCase = (c: CaseScenario) => {
    setSelectedCase(c);
    setCurrentStep(0);
    setAnalysisResult(null);
    setView("case-detail");
  };

  const handleSelectModule = (m: LearningModule) => {
    setSelectedModule(m);
    setCurrentSection(0);
    setView("module-detail");
  };

  const runAnalysis = () => {
    if (selectedCase) {
      const result = generateMoleculeResult(selectedCase.smiles);
      setAnalysisResult(result);
    }
  };

  const goBack = () => {
    if (view === "case-detail") setView("cases");
    else if (view === "module-detail") setView("modules");
    else setView("hub");
  };

  const difficultyColor = (d: string) => {
    if (d === "beginner") return "text-primary bg-primary/10 border-primary/20";
    if (d === "intermediate") return "text-yellow-400 bg-yellow-400/10 border-yellow-400/20";
    return "text-red-400 bg-red-400/10 border-red-400/20";
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-20 pb-16 px-6">
        <div className="max-w-6xl mx-auto">
          <AnimatePresence mode="wait">
            {/* ─── Hub View ─────────────────────────────────────── */}
            {view === "hub" && (
              <motion.div key="hub" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <div className="flex items-center gap-3 mb-2">
                  <Link to="/">
                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                      <ArrowLeft className="w-5 h-5" />
                    </Button>
                  </Link>
                  <div>
                    <h1 className="font-display text-3xl font-bold">
                      Learning <span className="text-primary">Hub</span>
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">Master drug discovery — from molecular targets to clinical impact</p>
                  </div>
                </div>

                {/* Quick fact banner */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="mt-6 glass-panel rounded-xl p-4 glow-border border-primary/20 flex items-start gap-3"
                >
                  <Sparkles className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] font-mono text-primary uppercase tracking-wider">Did you know?</span>
                    <p className="text-sm text-foreground/80 mt-1">{randomFact}</p>
                  </div>
                </motion.div>

                {/* Learning Paths */}
                <div className="mt-8">
                  <h2 className="font-display text-lg font-semibold flex items-center gap-2 mb-4">
                    <GraduationCap className="w-5 h-5 text-primary" />
                    Learning Paths
                  </h2>
                  <div className="grid md:grid-cols-3 gap-4">
                    {LEARNING_PATHS.map((path) => (
                      <motion.button
                        key={path.id}
                        whileHover={{ y: -4 }}
                        onClick={() => setView("modules")}
                        className="glass-panel rounded-xl p-5 glow-border text-left hover:border-primary/30 transition-all"
                      >
                        <div className="text-3xl mb-3">{path.icon}</div>
                        <h3 className="font-display font-semibold text-sm mb-1">{path.title}</h3>
                        <p className="text-xs text-muted-foreground leading-relaxed mb-3">{path.description}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" /> ~{path.estimatedHours}h
                          </span>
                          <span className="text-[10px] text-muted-foreground">{path.modules.length} modules</span>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Hub Navigation Cards */}
                <div className="grid md:grid-cols-3 gap-4 mt-8">
                  <motion.button
                    whileHover={{ y: -4 }}
                    onClick={() => setView("modules")}
                    className="glass-panel rounded-xl p-6 glow-border text-left hover:border-primary/30 transition-all group"
                  >
                    <BookOpen className="w-8 h-8 text-primary mb-3 group-hover:scale-110 transition-transform" />
                    <h3 className="font-display font-semibold mb-1">Guided Modules</h3>
                    <p className="text-xs text-muted-foreground">Structured lessons covering drug discovery fundamentals, computational methods, and African health challenges.</p>
                    <div className="flex items-center gap-1 mt-3 text-xs text-primary font-mono">
                      {LEARNING_MODULES.length} modules <ChevronRight className="w-3 h-3" />
                    </div>
                  </motion.button>

                  <motion.button
                    whileHover={{ y: -4 }}
                    onClick={() => setView("cases")}
                    className="glass-panel rounded-xl p-6 glow-border text-left hover:border-primary/30 transition-all group"
                  >
                    <FlaskConical className="w-8 h-8 text-primary mb-3 group-hover:scale-110 transition-transform" />
                    <h3 className="font-display font-semibold mb-1">Virtual Lab Cases</h3>
                    <p className="text-xs text-muted-foreground">Clinical case scenarios with interactive molecular analysis. Learn by solving real-world drug design challenges.</p>
                    <div className="flex items-center gap-1 mt-3 text-xs text-primary font-mono">
                      {CASES.length} cases <ChevronRight className="w-3 h-3" />
                    </div>
                  </motion.button>

                  <motion.button
                    whileHover={{ y: -4 }}
                    onClick={() => setView("glossary")}
                    className="glass-panel rounded-xl p-6 glow-border text-left hover:border-primary/30 transition-all group"
                  >
                    <BookMarked className="w-8 h-8 text-primary mb-3 group-hover:scale-110 transition-transform" />
                    <h3 className="font-display font-semibold mb-1">Glossary & Reference</h3>
                    <p className="text-xs text-muted-foreground">Searchable glossary of pharmacology, drug design, and safety terms with clinical examples and context.</p>
                    <div className="flex items-center gap-1 mt-3 text-xs text-primary font-mono">
                      {EXPANDED_GLOSSARY.length} terms <ChevronRight className="w-3 h-3" />
                    </div>
                  </motion.button>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-8">
                  {[
                    { label: "Learning Modules", value: LEARNING_MODULES.length, icon: BookOpen },
                    { label: "Clinical Cases", value: CASES.length, icon: FlaskConical },
                    { label: "Glossary Terms", value: EXPANDED_GLOSSARY.length, icon: BookMarked },
                    { label: "Disease Models", value: "8", icon: Globe },
                  ].map((stat) => (
                    <div key={stat.label} className="glass-panel rounded-lg p-4 glow-border text-center">
                      <stat.icon className="w-5 h-5 text-primary mx-auto mb-2" />
                      <div className="text-2xl font-bold text-primary">{stat.value}</div>
                      <div className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">{stat.label}</div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ─── Modules List ─────────────────────────────────── */}
            {view === "modules" && (
              <motion.div key="modules" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <div className="flex items-center gap-3 mb-6">
                  <Button variant="ghost" size="icon" onClick={() => setView("hub")} className="text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                  <div>
                    <h1 className="font-display text-2xl font-bold">
                      Guided <span className="text-primary">Modules</span>
                    </h1>
                    <p className="text-sm text-muted-foreground mt-0.5">Structured lessons on drug discovery and computational pharmacology</p>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  {LEARNING_MODULES.map((mod) => (
                    <motion.button
                      key={mod.id}
                      whileHover={{ y: -3 }}
                      onClick={() => handleSelectModule(mod)}
                      className="glass-panel rounded-xl p-5 glow-border text-left hover:border-primary/30 transition-all"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <span className="text-2xl">{mod.icon}</span>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${difficultyColor(mod.difficulty)}`}>
                            {mod.difficulty}
                          </span>
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {mod.duration}
                          </span>
                        </div>
                      </div>
                      <h3 className="font-display font-semibold text-sm mb-1">{mod.title}</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed mb-3">{mod.description}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground/60 font-mono uppercase">{mod.category.replace("-", " ")}</span>
                        <span className="text-xs text-primary flex items-center gap-1">
                          {mod.sections.length} sections <ChevronRight className="w-3 h-3" />
                        </span>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ─── Module Detail ────────────────────────────────── */}
            {view === "module-detail" && selectedModule && (
              <motion.div key="module-detail" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="flex items-center gap-3 mb-6">
                  <Button variant="ghost" size="icon" onClick={goBack} className="text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{selectedModule.icon}</span>
                      <h1 className="font-display text-lg font-bold">{selectedModule.title}</h1>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Section {currentSection + 1} of {selectedModule.sections.length} · {selectedModule.duration}
                    </p>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border ${difficultyColor(selectedModule.difficulty)}`}>
                    {selectedModule.difficulty}
                  </span>
                </div>

                <div className="grid lg:grid-cols-[200px_1fr] gap-4">
                  {/* Left: Section navigation */}
                  <div className="glass-panel rounded-xl p-3 glow-border">
                    <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-3">Sections</div>
                    <div className="space-y-1">
                      {selectedModule.sections.map((sec, i) => (
                        <button
                          key={i}
                          onClick={() => setCurrentSection(i)}
                          className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all flex items-center gap-2 ${
                            i === currentSection
                              ? "bg-primary/10 border border-primary/30 text-primary"
                              : i < currentSection
                              ? "text-primary/60"
                              : "text-muted-foreground hover:bg-secondary"
                          }`}
                        >
                          {i < currentSection ? (
                            <CheckCircle className="w-3 h-3 shrink-0" />
                          ) : (
                            <span className="w-3 h-3 rounded-full border border-current shrink-0 text-center text-[8px] leading-3">
                              {i + 1}
                            </span>
                          )}
                          <span className="truncate">{sec.title}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Center: Content */}
                  <div className="glass-panel rounded-xl p-6 glow-border">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={currentSection}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-5"
                      >
                        <div className="flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-primary" />
                          <h2 className="font-display text-lg font-semibold">{selectedModule.sections[currentSection].title}</h2>
                        </div>

                        <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-line">
                          {selectedModule.sections[currentSection].content}
                        </p>

                        {/* Key Points */}
                        <div className="bg-primary/5 rounded-lg p-4 border border-primary/10">
                          <h3 className="text-xs font-display font-semibold text-primary mb-3 flex items-center gap-2">
                            <Lightbulb className="w-4 h-4" /> Key Takeaways
                          </h3>
                          <ul className="space-y-2">
                            {selectedModule.sections[currentSection].keyPoints.map((point, i) => (
                              <li key={i} className="flex items-start gap-2 text-xs text-foreground/80">
                                <CheckCircle className="w-3 h-3 text-primary shrink-0 mt-0.5" />
                                {point}
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Navigation */}
                        <div className="flex justify-between pt-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={currentSection === 0}
                            onClick={() => setCurrentSection((s) => s - 1)}
                            className="gap-1 text-muted-foreground"
                          >
                            <ArrowLeft className="w-3 h-3" /> Previous
                          </Button>
                          {currentSection === selectedModule.sections.length - 1 ? (
                            <Button size="sm" onClick={goBack} className="bg-primary text-primary-foreground hover:bg-primary/90 gap-1">
                              <CheckCircle className="w-3 h-3" /> Complete Module
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => setCurrentSection((s) => s + 1)}
                              className="bg-primary text-primary-foreground hover:bg-primary/90 gap-1"
                            >
                              Next <ArrowRight className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </motion.div>
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ─── Cases List ──────────────────────────────────── */}
            {view === "cases" && (
              <motion.div key="cases" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <div className="flex items-center gap-3 mb-6">
                  <Button variant="ghost" size="icon" onClick={() => setView("hub")} className="text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                  <div>
                    <h1 className="font-display text-2xl font-bold">
                      Virtual Lab <span className="text-primary">Cases</span>
                    </h1>
                    <p className="text-sm text-muted-foreground mt-0.5">Interactive clinical scenarios — learn drug design by solving real problems</p>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {CASES.map((c) => (
                    <motion.button
                      key={c.id}
                      whileHover={{ y: -4 }}
                      onClick={() => handleSelectCase(c)}
                      className="glass-panel rounded-xl p-5 glow-border text-left hover:border-primary/30 transition-all"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="text-3xl">{c.icon}</div>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground border border-border">
                          {c.category}
                        </span>
                      </div>
                      <h3 className="font-display font-semibold text-sm mb-2">{c.title}</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed mb-3 line-clamp-3">{c.vignette}</p>
                      <div className="space-y-1 mb-3">
                        {c.objectives.map((obj, i) => (
                          <div key={i} className="flex items-start gap-1.5 text-[10px] text-muted-foreground">
                            <Lightbulb className="w-3 h-3 text-primary shrink-0 mt-0.5" />
                            {obj}
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground">{c.steps.length} steps</span>
                        <span className="text-xs text-primary font-mono flex items-center gap-1">
                          Start case <ChevronRight className="w-3 h-3" />
                        </span>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ─── Case Detail ─────────────────────────────────── */}
            {view === "case-detail" && selectedCase && (
              <motion.div key="case-detail" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="flex items-center gap-3 mb-6">
                  <Button variant="ghost" size="icon" onClick={goBack} className="text-muted-foreground hover:text-foreground">
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
                          <Button variant="ghost" size="sm" disabled={currentStep === 0} onClick={() => setCurrentStep((s) => s - 1)} className="gap-1 text-muted-foreground">
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
                    <div className="mt-6 pt-4 border-t border-border">
                      <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-2">Clinical Vignette</div>
                      <p className="text-[11px] text-foreground/60 leading-relaxed">{selectedCase.vignette}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ─── Glossary ────────────────────────────────────── */}
            {view === "glossary" && (
              <motion.div key="glossary" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <div className="flex items-center gap-3 mb-6">
                  <Button variant="ghost" size="icon" onClick={() => setView("hub")} className="text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                  <div className="flex-1">
                    <h1 className="font-display text-2xl font-bold">
                      Glossary & <span className="text-primary">Reference</span>
                    </h1>
                    <p className="text-sm text-muted-foreground mt-0.5">Key terms in drug discovery, pharmacology, and safety</p>
                  </div>
                </div>

                {/* Search */}
                <div className="glass-panel rounded-xl p-3 glow-border mb-6 flex items-center gap-3">
                  <Search className="w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search terms..."
                    value={glossarySearch}
                    onChange={(e) => setGlossarySearch(e.target.value)}
                    className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
                  />
                  {glossarySearch && (
                    <span className="text-[10px] text-muted-foreground">{filteredGlossary.length} results</span>
                  )}
                </div>

                {/* Entries */}
                <div className="space-y-3">
                  {filteredGlossary.map((entry) => (
                    <motion.div
                      key={entry.term}
                      layout
                      className="glass-panel rounded-xl glow-border overflow-hidden"
                    >
                      <button
                        onClick={() => setExpandedGlossary(expandedGlossary === entry.term ? null : entry.term)}
                        className="w-full text-left p-4 flex items-center justify-between hover:bg-secondary/30 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-mono">
                            {entry.category}
                          </span>
                          <h3 className="font-display font-semibold text-sm">{entry.term}</h3>
                        </div>
                        {expandedGlossary === entry.term ? (
                          <ChevronUp className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        )}
                      </button>
                      <AnimatePresence>
                        {expandedGlossary === entry.term && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="px-4 pb-4 space-y-3"
                          >
                            <p className="text-sm text-foreground/80 leading-relaxed">{entry.definition}</p>
                            <div className="bg-primary/5 rounded-lg p-3 border border-primary/10">
                              <div className="text-[10px] font-mono text-primary uppercase tracking-wider mb-1">Clinical Relevance</div>
                              <p className="text-xs text-foreground/70">{entry.clinicalRelevance}</p>
                            </div>
                            {entry.relatedTerms.length > 0 && (
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[10px] text-muted-foreground">Related:</span>
                                {entry.relatedTerms.map((t) => (
                                  <span key={t} className="text-[10px] px-2 py-0.5 rounded bg-secondary text-muted-foreground border border-border">
                                    {t}
                                  </span>
                                ))}
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      <FooterSection />
    </div>
  );
};

export default Education;
