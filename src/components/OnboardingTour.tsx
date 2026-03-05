import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Atom, FlaskConical, Shield, Wand2, GraduationCap,
  ChevronRight, ChevronLeft, X, Sparkles, Microscope,
  HeartPulse, Dna, Beaker, Target
} from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "isde-onboarding-complete";

interface OnboardingStep {
  id: string;
  badge: string;
  title: string;
  subtitle: string;
  description: string;
  icon: typeof Atom;
  accentIcon: typeof Atom;
  cta?: { label: string; route: string };
  features: { icon: typeof Atom; text: string }[];
}

const STEPS: OnboardingStep[] = [
  {
    id: "welcome",
    badge: "CLEARANCE GRANTED",
    title: "Welcome to the Lab",
    subtitle: "Virtual Pharmacology Research Division",
    description:
      "You've been selected to join an elite in-silico drug discovery team. Here, molecules are your instruments, algorithms are your assistants, and every experiment brings you closer to the next breakthrough.",
    icon: Microscope,
    accentIcon: Dna,
    features: [
      { icon: Atom, text: "Screen millions of virtual compounds" },
      { icon: HeartPulse, text: "Predict safety before the clinic" },
      { icon: Sparkles, text: "AI-powered scaffold optimization" },
    ],
  },
  {
    id: "workspace",
    badge: "STATION 01",
    title: "Mission Control",
    subtitle: "Your Command Center",
    description:
      "The Workspace is where discoveries happen. Pick a protein target — like EGFR in cancer or ACE2 in cardiovascular disease — paste a SMILES string, and watch as real PubChem data populates binding affinity, Lipinski properties, and clinical safety flags in real time.",
    icon: Target,
    accentIcon: FlaskConical,
    cta: { label: "Open Workspace", route: "/workspace" },
    features: [
      { icon: Target, text: "Browse targets by protein or disease" },
      { icon: FlaskConical, text: "Analyze molecules with real PubChem data" },
      { icon: Shield, text: "Review DDI and off-target safety profiles" },
    ],
  },
  {
    id: "whatif",
    badge: "STATION 02",
    title: "The What-If Chemist",
    subtitle: "Your AI Optimization Assistant",
    description:
      "Wonder what happens if you add a fluorine atom? Swap a methyl group? The What-If Chemist lets you modify scaffolds and instantly see how molecular weight, LogP, TPSA, and Lipinski compliance change — all backed by live PubChem lookups.",
    icon: Wand2,
    accentIcon: Beaker,
    cta: { label: "Try Modifications", route: "/workspace" },
    features: [
      { icon: Wand2, text: "Add halogens, hydroxyls, and methyl groups" },
      { icon: Atom, text: "See real-time property delta comparisons" },
      { icon: FlaskConical, text: "Track Lipinski violations before and after" },
    ],
  },
  {
    id: "education",
    badge: "STATION 03",
    title: "The Virtual Lab",
    subtitle: "Learn by Doing",
    description:
      "Step into guided clinical scenarios designed for medical students. Design a safer NSAID, find a brain-penetrant epilepsy drug, or avoid QT prolongation — each case teaches real pharmacology through hands-on molecular exploration.",
    icon: GraduationCap,
    accentIcon: HeartPulse,
    cta: { label: "Start Learning", route: "/education" },
    features: [
      { icon: GraduationCap, text: "Case-based clinical scenarios" },
      { icon: Microscope, text: "Step-by-step guided discovery" },
      { icon: Sparkles, text: "Concept tooltips in simple language" },
    ],
  },
  {
    id: "ready",
    badge: "ACCESS GRANTED",
    title: "You're Ready",
    subtitle: "Begin Your First Experiment",
    description:
      "Your lab access is now fully activated. Start by selecting a target in the Workspace, run your first molecule through the analyzer, and see drug discovery in action. Remember — every great drug started as an idea.",
    icon: Sparkles,
    accentIcon: Dna,
    cta: { label: "Launch Workspace", route: "/workspace" },
    features: [
      { icon: Target, text: "Pick a target and analyze a molecule" },
      { icon: Wand2, text: "Try the What-If Chemist" },
      { icon: GraduationCap, text: "Explore Education Mode scenarios" },
    ],
  },
];

const OnboardingTour = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const completed = localStorage.getItem(STORAGE_KEY);
    if (!completed) {
      const timer = setTimeout(() => setIsOpen(true), 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  const complete = (route?: string) => {
    localStorage.setItem(STORAGE_KEY, "true");
    setIsOpen(false);
    if (route) navigate(route);
  };

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="onboarding-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-background/90 backdrop-blur-md" />

        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(hsl(var(--primary) / 0.4) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary) / 0.4) 1px, transparent 1px)`,
            backgroundSize: "40px 40px",
          }}
        />

        {/* Modal */}
        <motion.div
          key={current.id}
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="relative z-10 w-full max-w-2xl"
        >
          {/* Close button */}
          <button
            onClick={() => complete()}
            className="absolute -top-2 -right-2 z-20 w-8 h-8 rounded-full bg-secondary border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Card */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-2xl shadow-primary/5">
            {/* Top accent bar */}
            <div className="h-1 bg-gradient-to-r from-primary via-accent to-primary" />

            {/* Header area with icon */}
            <div className="relative px-8 pt-8 pb-4">
              {/* Floating accent icon */}
              <motion.div
                animate={{ y: [0, -6, 0], rotate: [0, 5, -5, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-6 right-8 text-primary/10"
              >
                <current.accentIcon className="w-24 h-24" />
              </motion.div>

              {/* Badge */}
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/5 mb-4"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                <span className="text-[10px] font-mono text-primary tracking-widest uppercase">
                  {current.badge}
                </span>
              </motion.div>

              {/* Title */}
              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="font-display text-3xl md:text-4xl font-bold text-foreground mb-1"
              >
                {current.title}
              </motion.h2>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-sm font-mono text-primary"
              >
                {current.subtitle}
              </motion.p>
            </div>

            {/* Content */}
            <div className="px-8 pb-6">
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-sm text-muted-foreground leading-relaxed mb-6"
              >
                {current.description}
              </motion.p>

              {/* Feature pills */}
              <div className="space-y-2.5 mb-6">
                {current.features.map((feat, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -15 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.35 + i * 0.1 }}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-secondary/50 border border-border"
                  >
                    <div className="w-7 h-7 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                      <feat.icon className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <span className="text-xs font-mono text-foreground/80">{feat.text}</span>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Footer with navigation */}
            <div className="px-8 py-4 border-t border-border bg-secondary/20 flex items-center justify-between">
              {/* Progress dots */}
              <div className="flex items-center gap-1.5">
                {STEPS.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setStep(i)}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      i === step
                        ? "w-6 bg-primary"
                        : i < step
                        ? "w-1.5 bg-primary/40"
                        : "w-1.5 bg-border"
                    }`}
                  />
                ))}
                <span className="ml-2 text-[10px] font-mono text-muted-foreground">
                  {step + 1}/{STEPS.length}
                </span>
              </div>

              {/* Buttons */}
              <div className="flex items-center gap-2">
                {step > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setStep(step - 1)}
                    className="text-muted-foreground gap-1 text-xs"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" /> Back
                  </Button>
                )}
                {step === 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => complete()}
                    className="text-muted-foreground text-xs"
                  >
                    Skip tour
                  </Button>
                )}
                {isLast ? (
                  <Button
                    size="sm"
                    onClick={() => complete(current.cta?.route)}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5 text-xs font-display font-semibold glow-primary"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    {current.cta?.label || "Get Started"}
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => setStep(step + 1)}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 gap-1 text-xs font-display font-semibold"
                  >
                    Next <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default OnboardingTour;

/** Trigger to reopen the tour from anywhere */
export const resetOnboarding = () => localStorage.removeItem(STORAGE_KEY);
