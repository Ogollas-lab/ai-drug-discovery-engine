import { useState } from "react";
import { CONCEPT_GLOSSARY } from "@/data/targets";
import { HelpCircle } from "lucide-react";

interface ConceptTooltipProps {
  conceptKey: string;
  children?: React.ReactNode;
}

const ConceptTooltip = ({ conceptKey, children }: ConceptTooltipProps) => {
  const [open, setOpen] = useState(false);
  const concept = CONCEPT_GLOSSARY[conceptKey];
  if (!concept) return <>{children}</>;

  return (
    <span className="relative inline-block">
      <span
        className="inline-flex items-center gap-1 cursor-help border-b border-dotted border-primary/40 text-primary/80 hover:text-primary transition-colors"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >
        {children || concept.term}
        <HelpCircle className="w-3 h-3" />
      </span>
      {open && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 glass-panel rounded-lg p-3 border border-primary/20 z-50 shadow-lg glow-primary">
          <div className="text-xs font-display font-semibold text-primary mb-1">{concept.term}</div>
          <p className="text-xs text-foreground/80 mb-2">{concept.definition}</p>
          <div className="text-[10px] text-muted-foreground border-t border-border pt-2">
            <span className="text-primary/60 font-mono">Clinical example:</span> {concept.clinicalExample}
          </div>
        </div>
      )}
    </span>
  );
};

export default ConceptTooltip;
