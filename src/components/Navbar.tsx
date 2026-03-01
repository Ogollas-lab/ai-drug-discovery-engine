import { Atom } from "lucide-react";

const Navbar = () => (
  <nav className="fixed top-0 left-0 right-0 z-50 glass-panel border-b border-border/50">
    <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-7 h-7 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center">
          <Atom className="w-4 h-4 text-primary" />
        </div>
        <span className="font-display font-semibold text-sm tracking-tight">ISDE</span>
      </div>
      <div className="hidden md:flex items-center gap-6 text-xs font-mono text-muted-foreground">
        <a href="#analyzer" className="hover:text-primary transition-colors">Analyzer</a>
        <span className="text-border">|</span>
        <span className="text-primary/70">v1.0</span>
      </div>
    </div>
  </nav>
);

export default Navbar;
