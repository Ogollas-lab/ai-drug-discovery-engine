import { motion } from "framer-motion";
import { Atom, Zap, Brain, RotateCcw } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { resetOnboarding } from "@/components/OnboardingTour";
import heroBg from "@/assets/hero-bg.jpg";

const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background image */}
      <div className="absolute inset-0">
        <img src={heroBg} alt="" className="w-full h-full object-cover opacity-30" />
        <div className="absolute inset-0 bg-background/70" />
        <div className="absolute inset-0 gradient-mesh" />
      </div>

      {/* Grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(hsl(160 100% 45% / 0.3) 1px, transparent 1px), linear-gradient(90deg, hsl(160 100% 45% / 0.3) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />

      <div className="relative z-10 max-w-6xl mx-auto px-6 text-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/5 mb-8"
        >
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse-slow" />
          <span className="text-sm font-mono text-primary tracking-wider uppercase">Production Ready</span>
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="font-display text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-6"
        >
          <span className="text-foreground">In-Silico</span>
          <br />
          <span className="text-primary glow-text">Drug Discovery</span>
          <br />
          <span className="text-foreground">Engine</span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed"
        >
          Explore how molecules bind, behave, and break down — before they reach the patient.
        </motion.p>

        {/* CTAs */}
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
              Try Education Mode
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

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="flex flex-wrap justify-center gap-8 md:gap-16"
        >
          {[
            { icon: Atom, label: "GCN / GAT / VAE", desc: "Neural Architectures" },
            { icon: Zap, label: "0.71 RMSE", desc: "GAT on ESOL" },
            { icon: Brain, label: "Explainable AI", desc: "Attention Visualization" },
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

      {/* Scroll indicator */}
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
