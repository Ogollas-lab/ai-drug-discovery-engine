import { useState, useEffect } from "react";
import { Atom, Menu, X, ChevronDown, Sparkles } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";

type NavItem = { label: string; path: string; desc?: string };
type NavGroup = { label: string; items: NavItem[] };

const navGroups: NavGroup[] = [
  {
    label: "Discover",
    items: [
      { label: "Workspace", path: "/workspace", desc: "Mission control dashboard" },
      { label: "Screening", path: "/screening", desc: "Batch compound screening" },
      { label: "Predictions", path: "/predictions", desc: "Drug success prediction" },
      { label: "Pipeline", path: "/pipeline", desc: "8-stage discovery timeline" },
    ],
  },
  {
    label: "Models",
    items: [
      { label: "GAT Predictor", path: "/gat", desc: "Graph attention network" },
      { label: "XAI", path: "/xai", desc: "Explainable AI dashboard" },
      { label: "Training", path: "/training", desc: "Model training pipeline" },
      { label: "Benchmarks", path: "/benchmarks", desc: "Model performance" },
    ],
  },
  {
    label: "Validation",
    items: [
      { label: "Grounding", path: "/grounding", desc: "Stage 1 — evidence" },
      { label: "Compatibility", path: "/compatibility", desc: "Stage 2 — structural fit" },
      { label: "Binding Realism", path: "/binding", desc: "Reality-check layer" },
      { label: "Validation", path: "/validation", desc: "Stage 4 — final verdict" },
    ],
  },
  {
    label: "Resources",
    items: [
      { label: "Datasets", path: "/datasets", desc: "PDB, BindingDB, ChEMBL" },
      { label: "Governance", path: "/governance", desc: "License & provenance" },
      { label: "Education", path: "/education", desc: "Learning hub & lab" },
      { label: "Classroom", path: "/classroom", desc: "Instructor mode" },
    ],
  },
];

const Navbar = () => {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setOpenGroup(null);
  }, [location.pathname]);

  const isGroupActive = (group: NavGroup) =>
    group.items.some((i) => i.path === location.pathname);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "glass-panel border-b border-border/60 shadow-[0_4px_30px_hsl(220_20%_2%/0.4)]"
          : "bg-background/40 backdrop-blur-md border-b border-transparent"
      }`}
    >
      <div className="max-w-[1400px] mx-auto px-4 lg:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-2.5 group shrink-0">
          <div className="relative w-9 h-9 rounded-lg bg-gradient-to-br from-primary/20 to-accent/10 border border-primary/30 flex items-center justify-center overflow-hidden">
            <Atom className="w-5 h-5 text-primary relative z-10 group-hover:rotate-90 transition-transform duration-500" />
            <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/10 transition-colors" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="font-display font-bold text-sm tracking-tight">ISDE</span>
            <span className="text-[9px] font-mono text-primary/70 tracking-widest uppercase">
              Drug Discovery
            </span>
          </div>
        </Link>

        {/* Desktop nav */}
        <div className="hidden lg:flex items-center gap-1">
          {navGroups.map((group) => {
            const active = isGroupActive(group);
            const open = openGroup === group.label;
            return (
              <div
                key={group.label}
                className="relative"
                onMouseEnter={() => setOpenGroup(group.label)}
                onMouseLeave={() => setOpenGroup(null)}
              >
                <button
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-mono font-medium transition-all ${
                    active
                      ? "text-primary bg-primary/5"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                  }`}
                >
                  {group.label}
                  <ChevronDown
                    className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`}
                  />
                </button>

                <AnimatePresence>
                  {open && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 6 }}
                      transition={{ duration: 0.15 }}
                      className="absolute top-full left-0 pt-2 min-w-[260px]"
                    >
                      <div className="glass-panel border border-border/60 rounded-xl p-2 shadow-[0_10px_40px_hsl(220_20%_2%/0.6)]">
                        {group.items.map((item) => {
                          const isActive = location.pathname === item.path;
                          return (
                            <Link
                              key={item.path}
                              to={item.path}
                              className={`flex flex-col gap-0.5 px-3 py-2 rounded-md transition-colors ${
                                isActive
                                  ? "bg-primary/10 text-primary"
                                  : "hover:bg-secondary/60 text-foreground"
                              }`}
                            >
                              <span className="text-xs font-display font-semibold">
                                {item.label}
                              </span>
                              {item.desc && (
                                <span className="text-[10px] font-mono text-muted-foreground">
                                  {item.desc}
                                </span>
                              )}
                            </Link>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        {/* Right cluster */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-full border border-primary/20 bg-primary/5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse-slow" />
            <span className="text-[10px] font-mono text-primary tracking-wider">v2.0 LIVE</span>
          </div>

          <Link to="/pricing" className="hidden sm:block">
            <Button
              size="sm"
              className="h-8 bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-display font-semibold gap-1.5 glow-primary"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Upgrade
            </Button>
          </Link>

          {/* Mobile toggle */}
          <button
            className="lg:hidden p-2 rounded-md text-muted-foreground hover:text-primary hover:bg-secondary/50 transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden border-t border-border/50 glass-panel overflow-hidden max-h-[80vh] overflow-y-auto"
          >
            <div className="px-4 py-4 flex flex-col gap-5">
              {navGroups.map((group) => (
                <div key={group.label}>
                  <div className="text-[10px] font-mono text-primary/70 tracking-widest uppercase mb-2 px-2">
                    {group.label}
                  </div>
                  <div className="flex flex-col gap-0.5">
                    {group.items.map((item) => {
                      const isActive = location.pathname === item.path;
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          className={`flex flex-col gap-0.5 px-3 py-2 rounded-md ${
                            isActive
                              ? "bg-primary/10 text-primary"
                              : "text-foreground hover:bg-secondary/60"
                          }`}
                        >
                          <span className="text-sm font-display font-semibold">
                            {item.label}
                          </span>
                          {item.desc && (
                            <span className="text-[10px] font-mono text-muted-foreground">
                              {item.desc}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
              <Link to="/pricing">
                <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-display font-semibold gap-2">
                  <Sparkles className="w-4 h-4" /> Upgrade Plan
                </Button>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
