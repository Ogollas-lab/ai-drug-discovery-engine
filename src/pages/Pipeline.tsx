import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Target, Search, FlaskConical, Microscope, Beaker, ShieldCheck,
  Users, Building2, ArrowRight, Clock, DollarSign, TrendingUp,
  AlertTriangle, CheckCircle, ChevronDown, ChevronUp, ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import FooterSection from "@/components/FooterSection";
import { Link } from "react-router-dom";

interface PipelineStage {
  id: string;
  phase: string;
  title: string;
  icon: typeof Target;
  duration: string;
  cost: string;
  successRate: string;
  description: string;
  details: string[];
  keyActivities: string[];
  outputs: string[];
  challenges: string[];
  africanContext?: string;
  tools: string[];
  color: string;
}

const PIPELINE_STAGES: PipelineStage[] = [
  {
    id: "target-id",
    phase: "Discovery",
    title: "Target Identification",
    icon: Target,
    duration: "1–2 years",
    cost: "$1–5M",
    successRate: "~50%",
    description: "Identify a biological target (protein, enzyme, receptor) that plays a key role in a disease. Validation confirms that modulating this target can alter disease progression.",
    details: [
      "Genomic and proteomic analysis to find disease-associated proteins",
      "Literature review and bioinformatics to prioritize targets",
      "CRISPR knockout studies to validate target essentiality",
      "Structural biology (X-ray, cryo-EM) to resolve target 3D structure",
    ],
    keyActivities: ["Target validation", "Pathway analysis", "Structural biology", "Assay development"],
    outputs: ["Validated drug target", "3D protein structure", "Biological assay"],
    challenges: ["Target may not be druggable", "Redundant biological pathways", "Species differences"],
    africanContext: "For diseases like malaria, validated targets include PfDHFR, PfATP4, and PI4K. Targets must account for parasite genetic diversity across African regions.",
    tools: ["Genomics databases", "CRISPR", "Cryo-EM", "AlphaFold"],
    color: "primary",
  },
  {
    id: "hit-finding",
    phase: "Discovery",
    title: "Hit Finding & Screening",
    icon: Search,
    duration: "1–2 years",
    cost: "$5–10M",
    successRate: "~30%",
    description: "Screen large chemical libraries (millions of compounds) against the validated target to find initial 'hits' — molecules that show activity.",
    details: [
      "High-throughput screening (HTS) of compound libraries",
      "Virtual screening using molecular docking and pharmacophore models",
      "Fragment-based drug discovery (FBDD) for novel scaffolds",
      "AI/ML-driven de novo molecule generation",
    ],
    keyActivities: ["HTS campaigns", "Virtual screening", "Fragment screening", "AI generation"],
    outputs: ["Hit compounds (IC50 < 10 µM)", "Structure-activity data", "Preliminary SAR"],
    challenges: ["High false-positive rates", "Compound availability", "Assay interference"],
    africanContext: "Open-source libraries like the MMV Malaria Box and DNDi NTD sets provide curated starting points for neglected tropical diseases prevalent in Africa.",
    tools: ["Vitalis AI Workspace", "ChEMBL", "PubChem", "AutoDock"],
    color: "accent",
  },
  {
    id: "lead-opt",
    phase: "Preclinical",
    title: "Lead Optimization",
    icon: FlaskConical,
    duration: "1–3 years",
    cost: "$10–30M",
    successRate: "~25%",
    description: "Refine hit compounds into 'leads' with improved potency, selectivity, and drug-like properties (ADMET). Medicinal chemistry iterates on the molecular structure.",
    details: [
      "Medicinal chemistry: systematic modification of functional groups",
      "ADMET profiling: absorption, distribution, metabolism, excretion, toxicity",
      "Selectivity screening against off-targets (hERG, CYP450 panel)",
      "Pharmacokinetic studies: half-life, bioavailability, clearance",
    ],
    keyActivities: ["SAR studies", "ADMET optimization", "PK profiling", "Selectivity screening"],
    outputs: ["Lead candidate", "Optimized ADMET profile", "PK data package"],
    challenges: ["Potency-toxicity trade-offs", "Metabolic instability", "Poor oral bioavailability"],
    africanContext: "Compounds must be orally bioavailable (no IV infusions in rural clinics), thermostable (no cold chain), and affordable to manufacture as generics.",
    tools: ["Vitalis Predictions", "ADMET predictors", "Medicinal chemistry", "PK modeling"],
    color: "neon-purple",
  },
  {
    id: "preclinical",
    phase: "Preclinical",
    title: "Preclinical Testing",
    icon: Microscope,
    duration: "1–2 years",
    cost: "$10–50M",
    successRate: "~20%",
    description: "Test the lead compound in laboratory and animal models to evaluate safety, efficacy, and pharmacokinetics before human trials.",
    details: [
      "In vitro toxicology: cytotoxicity, genotoxicity (Ames test), hERG",
      "In vivo efficacy: disease models in rodents and larger animals",
      "GLP toxicology: 28-day and 90-day repeated dose studies",
      "Formulation development and manufacturing process design",
    ],
    keyActivities: ["Animal efficacy", "Toxicology studies", "Formulation", "IND preparation"],
    outputs: ["IND application", "Safety data package", "CMC documentation"],
    challenges: ["Animal-to-human translation gap", "Unexpected toxicity", "Regulatory requirements"],
    africanContext: "Animal models must reflect African disease strains (e.g., P. falciparum from East vs. West Africa). Ethical review increasingly requires African institutional approval.",
    tools: ["GLP labs", "Animal models", "Regulatory science", "CMC development"],
    color: "primary",
  },
  {
    id: "phase1",
    phase: "Clinical",
    title: "Phase I Trials",
    icon: Beaker,
    duration: "1–2 years",
    cost: "$10–30M",
    successRate: "~65%",
    description: "First-in-human studies with 20–100 healthy volunteers. Primary goal: establish safety, tolerability, and pharmacokinetics — not efficacy.",
    details: [
      "Single ascending dose (SAD): escalate dose to find maximum tolerated dose",
      "Multiple ascending dose (MAD): repeated dosing to assess accumulation",
      "Food-effect studies: impact of meals on drug absorption",
      "Drug-drug interaction studies with common co-medications",
    ],
    keyActivities: ["Dose escalation", "PK/PD assessment", "Safety monitoring", "Biomarker analysis"],
    outputs: ["Maximum tolerated dose", "Human PK profile", "Safety database"],
    challenges: ["Unexpected side effects", "PK surprises vs. predictions", "Volunteer recruitment"],
    africanContext: "Phase I sites in South Africa, Kenya, and Uganda are growing. Ethical frameworks must address historical exploitation concerns and ensure genuine informed consent.",
    tools: ["Clinical sites", "Bioanalytical labs", "DSMB", "EDC systems"],
    color: "accent",
  },
  {
    id: "phase2",
    phase: "Clinical",
    title: "Phase II Trials",
    icon: ShieldCheck,
    duration: "2–3 years",
    cost: "$20–80M",
    successRate: "~33%",
    description: "Test in 100–500 patients with the target disease. Evaluate efficacy (does it work?), optimal dosing, and side effects in the patient population.",
    details: [
      "Proof-of-concept: does the drug show measurable clinical benefit?",
      "Dose-ranging: find the optimal dose balancing efficacy and safety",
      "Biomarker validation: confirm mechanism of action in patients",
      "Adaptive trial designs to accelerate decision-making",
    ],
    keyActivities: ["Efficacy assessment", "Dose optimization", "Biomarker studies", "Futility analysis"],
    outputs: ["Proof of concept", "Optimal dose", "Phase III design"],
    challenges: ["High failure rate (67%)", "Patient heterogeneity", "Endpoint selection"],
    africanContext: "African trial sites provide access to treatment-naive patients and high disease burden. Malaria Phase II trials in endemic zones yield more robust efficacy signals.",
    tools: ["Randomized controlled trials", "Adaptive designs", "Statistical analysis", "Patient registries"],
    color: "neon-purple",
  },
  {
    id: "phase3",
    phase: "Clinical",
    title: "Phase III Trials",
    icon: Users,
    duration: "3–5 years",
    cost: "$100–500M",
    successRate: "~58%",
    description: "Large-scale confirmatory trials with 1,000–10,000+ patients. Provide definitive evidence of efficacy and safety for regulatory approval.",
    details: [
      "Multicenter, multi-country randomized controlled trials",
      "Comparison against standard of care or placebo",
      "Long-term safety monitoring and adverse event reporting",
      "Regulatory submission preparation (NDA/BLA)",
    ],
    keyActivities: ["Pivotal trials", "Regulatory submissions", "Safety monitoring", "Manufacturing scale-up"],
    outputs: ["Pivotal efficacy data", "NDA/BLA submission", "Product labeling"],
    challenges: ["Enormous cost", "Multi-year timelines", "Regulatory complexity"],
    africanContext: "Including African trial sites ensures drug efficacy data reflects the populations who need it most. WHO prequalification pathway enables affordable access across the continent.",
    tools: ["Global trial networks", "CROs", "Regulatory agencies", "Manufacturing partners"],
    color: "primary",
  },
  {
    id: "approval",
    phase: "Market",
    title: "Approval & Launch",
    icon: Building2,
    duration: "1–2 years",
    cost: "$50–200M",
    successRate: "~85%",
    description: "Regulatory review by FDA, EMA, or WHO. If approved, the drug is manufactured at scale, distributed, and monitored for long-term safety (pharmacovigilance).",
    details: [
      "Regulatory review: FDA priority/standard review (6–12 months)",
      "Manufacturing scale-up: GMP production, quality control",
      "Market access: pricing, reimbursement, distribution",
      "Phase IV: post-market surveillance and real-world evidence",
    ],
    keyActivities: ["Regulatory review", "Manufacturing", "Market access", "Pharmacovigilance"],
    outputs: ["Approved drug", "Product label", "Post-market studies"],
    challenges: ["Manufacturing complexity", "Market access barriers", "Pricing pressures"],
    africanContext: "WHO prequalification enables procurement by UNICEF, Global Fund, and PEPFAR for African distribution. Voluntary licensing (e.g., MPP) allows affordable generic production.",
    tools: ["Regulatory agencies", "GMP facilities", "Distribution networks", "Pharmacovigilance systems"],
    color: "accent",
  },
];

const CUMULATIVE_STATS = {
  totalTime: "10–15 years",
  totalCost: "$1–3 billion",
  overallSuccess: "~5–10%",
  compoundsScreened: "10,000+",
  compoundsApproved: "1",
};

const Pipeline = () => {
  const [activeStage, setActiveStage] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  const activeData = PIPELINE_STAGES.find((s) => s.id === activeStage);
  const activeIndex = PIPELINE_STAGES.findIndex((s) => s.id === activeStage);
  const progressPercent = activeStage
    ? ((activeIndex + 1) / PIPELINE_STAGES.length) * 100
    : 0;

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-20 pb-16 px-4 md:px-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <span className="text-xs font-mono text-primary tracking-[0.3em] uppercase">
              Interactive Guide
            </span>
            <h1 className="font-display text-3xl md:text-5xl font-bold mt-3">
              Drug Discovery <span className="text-primary">Pipeline</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-3 max-w-2xl mx-auto">
              From target identification to clinic — click each stage to explore the journey
              a molecule takes to become a medicine.
            </p>
          </motion.div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
            {[
              { icon: Clock, label: "Timeline", value: CUMULATIVE_STATS.totalTime },
              { icon: DollarSign, label: "Total Cost", value: CUMULATIVE_STATS.totalCost },
              { icon: TrendingUp, label: "Success Rate", value: CUMULATIVE_STATS.overallSuccess },
              { icon: Search, label: "Screened", value: CUMULATIVE_STATS.compoundsScreened },
              { icon: CheckCircle, label: "Approved", value: CUMULATIVE_STATS.compoundsApproved },
            ].map((stat) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-panel rounded-xl p-3 border border-border/50 text-center"
              >
                <stat.icon className="w-4 h-4 text-primary mx-auto mb-1" />
                <div className="text-xs text-muted-foreground">{stat.label}</div>
                <div className="text-sm font-mono font-semibold text-foreground">{stat.value}</div>
              </motion.div>
            ))}
          </div>

          {/* Progress Bar */}
          <div className="mb-2">
            <div className="flex justify-between text-[10px] font-mono text-muted-foreground mb-1">
              <span>Discovery</span>
              <span>Preclinical</span>
              <span>Clinical Trials</span>
              <span>Market</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>

          {/* Timeline Pipeline */}
          <div className="relative mb-8">
            {/* Connector line */}
            <div className="hidden md:block absolute top-10 left-0 right-0 h-0.5 bg-border z-0" />

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2 md:gap-1 relative z-10">
              {PIPELINE_STAGES.map((stage, i) => {
                const isActive = activeStage === stage.id;
                const Icon = stage.icon;
                return (
                  <motion.button
                    key={stage.id}
                    onClick={() => setActiveStage(isActive ? null : stage.id)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.97 }}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all cursor-pointer ${
                      isActive
                        ? "bg-primary/10 border-primary/40 shadow-lg shadow-primary/10"
                        : "bg-card border-border/50 hover:border-primary/20"
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
                        isActive ? "bg-primary/20" : "bg-secondary"
                      }`}
                    >
                      <Icon className={`w-4.5 h-4.5 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                    </div>
                    <span className={`text-[10px] font-mono text-center leading-tight ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                      {stage.title}
                    </span>
                    <span className="text-[9px] text-muted-foreground">{stage.duration}</span>
                    {i < PIPELINE_STAGES.length - 1 && (
                      <ArrowRight className="hidden lg:block absolute -right-2 top-10 w-3 h-3 text-border" />
                    )}
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Detail Panel */}
          <AnimatePresence mode="wait">
            {activeData && (
              <motion.div
                key={activeData.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="glass-panel rounded-2xl border border-primary/20 p-6 md:p-8 glow-border"
              >
                {/* Stage Header */}
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                      <activeData.icon className="w-7 h-7 text-primary" />
                    </div>
                    <div>
                      <Badge variant="outline" className="mb-1 text-[10px]">{activeData.phase}</Badge>
                      <h2 className="text-2xl font-display font-bold text-foreground">{activeData.title}</h2>
                      <p className="text-sm text-muted-foreground mt-1 max-w-xl">{activeData.description}</p>
                    </div>
                  </div>
                  <div className="flex gap-3 shrink-0">
                    {[
                      { icon: Clock, label: "Duration", value: activeData.duration },
                      { icon: DollarSign, label: "Cost", value: activeData.cost },
                      { icon: TrendingUp, label: "Success", value: activeData.successRate },
                    ].map((m) => (
                      <div key={m.label} className="text-center px-3 py-2 bg-secondary/50 rounded-lg border border-border/50">
                        <m.icon className="w-3.5 h-3.5 text-primary mx-auto mb-0.5" />
                        <div className="text-[10px] text-muted-foreground">{m.label}</div>
                        <div className="text-xs font-mono font-semibold text-foreground">{m.value}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Content Grid */}
                <div className="grid md:grid-cols-2 gap-4">
                  {/* Details */}
                  <CollapsibleSection
                    title="What Happens"
                    items={activeData.details}
                    isOpen={expandedSections["details"] !== false}
                    onToggle={() => toggleSection("details")}
                  />

                  {/* Key Activities */}
                  <div className="bg-secondary/30 rounded-xl p-4 border border-border/50">
                    <h4 className="text-xs font-mono text-primary mb-3 uppercase tracking-wider">Key Activities</h4>
                    <div className="flex flex-wrap gap-2">
                      {activeData.keyActivities.map((a) => (
                        <span key={a} className="px-2.5 py-1 bg-primary/10 text-primary text-xs rounded-lg border border-primary/20">
                          {a}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Outputs */}
                  <div className="bg-secondary/30 rounded-xl p-4 border border-border/50">
                    <h4 className="text-xs font-mono text-primary mb-3 uppercase tracking-wider">Outputs</h4>
                    <ul className="space-y-2">
                      {activeData.outputs.map((o) => (
                        <li key={o} className="flex items-center gap-2 text-sm text-foreground">
                          <CheckCircle className="w-3.5 h-3.5 text-primary shrink-0" />
                          {o}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Challenges */}
                  <div className="bg-secondary/30 rounded-xl p-4 border border-border/50">
                    <h4 className="text-xs font-mono text-destructive mb-3 uppercase tracking-wider">Challenges</h4>
                    <ul className="space-y-2">
                      {activeData.challenges.map((c) => (
                        <li key={c} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <AlertTriangle className="w-3.5 h-3.5 text-destructive shrink-0" />
                          {c}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* African Context */}
                {activeData.africanContext && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-4 p-4 rounded-xl bg-primary/5 border border-primary/20"
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-lg">🌍</span>
                      <div>
                        <h4 className="text-xs font-mono text-primary mb-1 uppercase tracking-wider">African Health Context</h4>
                        <p className="text-sm text-foreground/80 leading-relaxed">{activeData.africanContext}</p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Tools & Vitalis Link */}
                <div className="mt-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-1.5">
                    {activeData.tools.map((t) => (
                      <span key={t} className="px-2 py-0.5 text-[10px] font-mono text-muted-foreground bg-secondary rounded border border-border/50">
                        {t}
                      </span>
                    ))}
                  </div>
                  {(activeData.tools.includes("Vitalis AI Workspace") || activeData.tools.includes("Vitalis Predictions")) && (
                    <Link to={activeData.tools.includes("Vitalis AI Workspace") ? "/workspace" : "/predictions"}>
                      <Button size="sm" variant="outline" className="gap-1.5 text-xs">
                        <ExternalLink className="w-3 h-3" />
                        Try in Vitalis
                      </Button>
                    </Link>
                  )}
                </div>

                {/* Navigation */}
                <div className="flex justify-between mt-6 pt-4 border-t border-border/50">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={activeIndex <= 0}
                    onClick={() => setActiveStage(PIPELINE_STAGES[activeIndex - 1]?.id)}
                    className="text-xs gap-1"
                  >
                    <ArrowRight className="w-3 h-3 rotate-180" /> Previous
                  </Button>
                  <span className="text-[10px] font-mono text-muted-foreground self-center">
                    {activeIndex + 1} / {PIPELINE_STAGES.length}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={activeIndex >= PIPELINE_STAGES.length - 1}
                    onClick={() => setActiveStage(PIPELINE_STAGES[activeIndex + 1]?.id)}
                    className="text-xs gap-1"
                  >
                    Next <ArrowRight className="w-3 h-3" />
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Empty state */}
          {!activeData && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12 text-muted-foreground"
            >
              <Target className="w-10 h-10 mx-auto mb-3 text-primary/40" />
              <p className="text-sm">Click any stage above to explore its details</p>
            </motion.div>
          )}
        </div>
      </div>
      <FooterSection />
    </div>
  );
};

/* ── Collapsible Section ── */
const CollapsibleSection = ({
  title,
  items,
  isOpen,
  onToggle,
}: {
  title: string;
  items: string[];
  isOpen: boolean;
  onToggle: () => void;
}) => (
  <div className="bg-secondary/30 rounded-xl p-4 border border-border/50">
    <button onClick={onToggle} className="flex items-center justify-between w-full mb-2">
      <h4 className="text-xs font-mono text-primary uppercase tracking-wider">{title}</h4>
      {isOpen ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
    </button>
    <AnimatePresence>
      {isOpen && (
        <motion.ul
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="space-y-2 overflow-hidden"
        >
          {items.map((d, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-foreground/80">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
              {d}
            </li>
          ))}
        </motion.ul>
      )}
    </AnimatePresence>
  </div>
);

export default Pipeline;
