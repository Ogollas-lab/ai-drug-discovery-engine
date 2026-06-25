import { useState, useEffect } from "react";
import { Menu, X, ChevronDown, Sparkles } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import BrandLogo from "@/components/BrandLogo";

type NavItem = { label: string; path: string; desc?: string };
type NavGroup = { label: string; items: NavItem[] };

const navGroups: NavGroup[] = [
  {
    label: "Discover",
    items: [
      { label: "Pawanax Chat", path: "/chat", desc: "Talk to the AI — no science degree needed" },
      { label: "Workspace", path: "/workspace", desc: "DMTA mission control" },
      { label: "Screening", path: "/screening", desc: "Batch compound screening" },
      { label: "Predictions", path: "/predictions", desc: "Success probability" },
      { label: "Pipeline", path: "/pipeline", desc: "8-stage discovery timeline" },
    ],
  },
  {
    label: "Models",
    items: [
      { label: "GAT Predictor", path: "/gat", desc: "Graph attention (demo)" },
      { label: "XAI", path: "/xai", desc: "Explainability (demo)" },
      { label: "Training", path: "/training", desc: "Training simulator" },
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
  const { isAuthenticated, user, logout } = useAuth();
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

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const isGroupActive = (group: NavGroup) =>
    group.items.some((i) => i.path === location.pathname);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 safe-top ${
        scrolled
          ? "glass-panel border-b border-border/60 shadow-[0_4px_30px_hsl(220_20%_2%/0.4)]"
          : "bg-background/40 backdrop-blur-md border-b border-transparent"
      }`}
    >
      <div className="max-w-[1400px] mx-auto px-3 sm:px-4 lg:px-6 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
        <BrandLogo size="md" className="max-w-[55vw] sm:max-w-none" />

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
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-mono font-medium transition-all min-h-[40px] ${
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
                              className={`flex flex-col gap-0.5 px-3 py-2.5 rounded-md transition-colors ${
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
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-full border border-primary/20 bg-primary/5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse-slow" />
            <span className="text-[10px] font-mono text-primary tracking-wider">RESEARCH READY</span>
          </div>

          <Link to="/chat" className="hidden sm:block">
            <Button size="sm" className="h-9 bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-display font-semibold gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Chat
            </Button>
          </Link>

          <Link to="/pricing" className="hidden md:block">
            <Button size="sm" variant="outline" className="h-9 text-xs font-display">
              Pricing
            </Button>
          </Link>

          {isAuthenticated ? (
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-[10px] font-mono text-muted-foreground max-w-[100px] truncate">
                {user?.name}
              </span>
              <Button size="sm" variant="ghost" className="h-9 text-xs" onClick={logout}>
                Sign out
              </Button>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-2">
              <Link to="/chat">
                <Button size="sm" variant="ghost" className="h-9 text-xs">
                  Guest chat
                </Button>
              </Link>
              <Link to="/login">
                <Button size="sm" variant="ghost" className="h-9 text-xs">
                  Sign in
                </Button>
              </Link>
              <Link to="/signup">
                <Button
                  size="sm"
                  className="h-9 bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-display font-semibold gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Sign up
                </Button>
              </Link>
            </div>
          )}

          <button
            className="lg:hidden touch-target rounded-lg text-muted-foreground hover:text-primary hover:bg-secondary/50 transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.button
              type="button"
              aria-label="Close menu overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 top-14 sm:top-16 z-40 bg-background/60 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="lg:hidden relative z-50 border-t border-border/50 glass-panel overflow-hidden max-h-[calc(100dvh-3.5rem)] sm:max-h-[calc(100dvh-4rem)] overflow-y-auto overscroll-contain safe-bottom"
            >
              <div className="px-3 sm:px-4 py-4 flex flex-col gap-5">
                <div className="flex items-center gap-2 px-2 py-2 rounded-lg border border-primary/20 bg-primary/5">
                  <img
                    src="/pawanax-logo.png"
                    alt=""
                    className="w-5 h-5 rounded-full ring-1 ring-primary/30"
                  />
                  <span className="text-[10px] font-mono text-primary tracking-wide">
                    Pawanax AI powers Vitalis Drug Engine
                  </span>
                </div>

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
                            className={`flex flex-col gap-0.5 px-3 py-3 rounded-lg min-h-[48px] justify-center ${
                              isActive
                                ? "bg-primary/10 text-primary"
                                : "text-foreground hover:bg-secondary/60 active:bg-secondary/80"
                            }`}
                          >
                            <span className="text-sm font-display font-semibold">{item.label}</span>
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

                <div className="flex flex-col gap-2 pt-2 border-t border-border/50">
                  <Link to="/pricing">
                    <Button
                      variant="outline"
                      className="w-full min-h-[48px] font-display font-semibold"
                    >
                      Pricing
                    </Button>
                  </Link>
                  {isAuthenticated ? (
                    <div className="flex flex-col gap-2">
                      <p className="text-[10px] font-mono text-muted-foreground text-center truncate px-2">
                        {user?.name}
                      </p>
                      <Button
                        variant="ghost"
                        className="w-full min-h-[48px]"
                        onClick={logout}
                      >
                        Sign out
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <Link to="/login">
                        <Button variant="ghost" className="w-full min-h-[48px] text-xs">
                          Sign in
                        </Button>
                      </Link>
                      <Link to="/signup">
                        <Button className="w-full min-h-[48px] bg-primary text-primary-foreground hover:bg-primary/90 font-display font-semibold gap-1.5 text-xs">
                          <Sparkles className="w-3.5 h-3.5" />
                          Sign up
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
