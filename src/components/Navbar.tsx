import { useState } from "react";
import { Atom, Menu, X } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";

const navItems = [
  { label: "Workspace", path: "/workspace" },
  { label: "Screening", path: "/screening" },
  { label: "Predictions", path: "/predictions" },
  { label: "Learn", path: "/education" },
  { label: "Pipeline", path: "/pipeline" },
  { label: "Benchmarks", path: "/benchmarks" },
  { label: "Classroom", path: "/classroom" },
  { label: "Pricing", path: "/pricing" },
];

const Navbar = () => {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-panel border-b border-border/50">
      <div className="max-w-[1400px] mx-auto px-6 h-14 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Atom className="w-4 h-4 text-primary" />
          </div>
          <span className="font-display font-semibold text-sm tracking-tight">ISDE</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-5 text-xs font-mono">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`transition-colors ${
                location.pathname === item.path
                  ? "text-primary"
                  : "text-muted-foreground hover:text-primary"
              }`}
            >
              {item.label}
            </Link>
          ))}
          <span className="text-border">|</span>
          <span className="text-primary/70">v2.0</span>
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden text-muted-foreground hover:text-primary transition-colors"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-border/50 glass-panel overflow-hidden"
          >
            <div className="px-6 py-4 flex flex-col gap-3">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  className={`text-sm font-mono py-1.5 transition-colors ${
                    location.pathname === item.path
                      ? "text-primary"
                      : "text-muted-foreground hover:text-primary"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
