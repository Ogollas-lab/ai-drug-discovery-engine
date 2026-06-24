import { motion } from "framer-motion";
import { Microscope, Zap, Shield, RotateCcw } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { resetOnboarding } from "@/components/OnboardingTour";
import heroBg from "@/assets/hero-bg.jpg";

const HeroSection = () => {
  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden pt-16">
      <div className="absolute inset-0">
        <img src={heroBg} alt="" className="w-full h-full object-cover opacity-25" />
        <div className="absolute inset-0 bg-background/75" />
        <div className="absolute inset-0 gradient-mesh" />
      </div>

      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `linear-gradient(hsl(357 78% 52% / 0.35) 1px, transparent 1px), linear-gradient(90deg, hsl(357 78% 52% / 0.35) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />

      <div className="relative z-10 max-w-6xl mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/5 mb-8"
        >
          <img src="/pawanax-logo.png" alt="" className="w-6 h-6 rounded-full" />
          <span className="text-sm font-mono text-primary tracking-wider uppercase">Research Platform</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="font-display text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-6"
        >
          <span className="text-foreground">Accelerate</span>
          <br />
          <span className="text-primary glow-text">Drug Discovery</span>
          <br />
          <span className="text-foreground text-4xl md:text-5xl lg:text-6xl">with Pawanax AI</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed"
        >
          Multi-agent DMTA workflows powered by PubChem-validated descriptors, NVIDIA BioNeMo, and human-in-the-loop safety — built for researchers who need honest science.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="flex flex-wrap justify-center gap-4 mb-12"
        >
          <Link to="/workspace">
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-5 text-sm font-display font-semibold glow-primary">
              Launch Workspace
            </Button>
          </Link>
          <Link to="/education">
            <Button variant="outline" className="border-primary/30 text-primary hover:bg-primary/10 px-6 py-5 text-sm font-display font-semibold">
              Education Mode
            </Button>
          </Link>
          <Button
            variant="ghost"
            onClick={() => {
              resetOnboarding();
              window.location.reload();
            }}
            className="text-muted-foreground hover:text-primary px-4 py-5 text-sm font-mono gap-2"
          >
            <RotateCcw className="w-4 h-4" /> Retake Tour
          </Button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="flex flex-wrap justify-center gap-8 md:gap-16 mb-16"
        >
          {[
            { icon: Microscope, label: "PubChem + QED", desc: "Validated descriptors" },
            { icon: Zap, label: "NVIDIA MolMIM", desc: "Lead optimization" },
            { icon: Shield, label: "HITL Safety", desc: "Human review gates" },
          ].map((stat, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                <stat.icon className="w-5 h-5 text-primary" />
              </div>
              <div className="text-left">
                <div className="text-sm font-mono text-primary">{stat.label}</div>
                <div className="text-xs text-muted-foreground">{stat.desc}</div>
              </div>
            </div>
          ))}
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <div className="w-5 h-8 rounded-full border border-primary/30 flex justify-center pt-1.5">
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="w-1 h-1 rounded-full bg-primary"
          />
        </div>
      </motion.div>
    </section>
  );
};

export default HeroSection;
