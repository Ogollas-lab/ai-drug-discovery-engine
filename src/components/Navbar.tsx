import { Atom } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

const navItems = [
  { label: "Workspace", path: "/workspace" },
  { label: "Screening", path: "/screening" },
  { label: "Learn", path: "/education" },
  { label: "Benchmarks", path: "/benchmarks" },
  { label: "Classroom", path: "/classroom" },
];

const Navbar = () => {
  const location = useLocation();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-panel border-b border-border/50">
      <div className="max-w-[1400px] mx-auto px-6 h-14 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Atom className="w-4 h-4 text-primary" />
          </div>
          <span className="font-display font-semibold text-sm tracking-tight">ISDE</span>
        </Link>
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
      </div>
    </nav>
  );
};

export default Navbar;
