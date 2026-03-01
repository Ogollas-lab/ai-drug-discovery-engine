import { Atom } from "lucide-react";

const FooterSection = () => (
  <footer className="border-t border-border py-12 px-6">
    <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
          <Atom className="w-4 h-4 text-primary" />
        </div>
        <span className="font-display font-semibold text-sm">Drug Discovery Engine</span>
      </div>
      <p className="text-xs text-muted-foreground font-mono">
        Research prototype · Not for clinical use · Last updated Feb 2026
      </p>
    </div>
  </footer>
);

export default FooterSection;
