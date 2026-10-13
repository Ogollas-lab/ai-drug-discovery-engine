import { useState } from "react";
import { Atom } from "lucide-react";

interface MoleculeViewerProps {
  /** PubChem CID — preferred, most reliable image source. */
  cid?: number | null;
  /** SMILES string — used when no CID is available. */
  smiles?: string;
  name?: string;
  /** Pixel size of the rendered image (square). */
  size?: number;
  className?: string;
}

/**
 * Renders a 2D molecular structure using PubChem's image service.
 * Falls back from CID-based lookup to SMILES-based lookup, then to a placeholder.
 */
export function MoleculeViewer({ cid, smiles, name, size = 220, className = "" }: MoleculeViewerProps) {
  const sources: string[] = [];
  if (cid != null) {
    sources.push(`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/PNG?image_size=${size}x${size}`);
  }
  if (smiles) {
    sources.push(`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/smiles/${encodeURIComponent(smiles)}/PNG?image_size=${size}x${size}`);
  }

  const [idx, setIdx] = useState(0);
  const [failed, setFailed] = useState(false);

  if (sources.length === 0 || failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border border-border/40 bg-background/50 text-muted-foreground ${className}`}
        style={{ width: size, height: size }}
      >
        <Atom className="w-6 h-6" aria-hidden />
        <span className="text-[9px] font-mono">Structure unavailable</span>
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border border-border/40 bg-white p-1.5 shrink-0 ${className}`}
      style={{ width: size + 14, height: size + 14 }}
    >
      <img
        src={sources[idx]}
        alt={name ? `2D structure of ${name}` : "2D molecular structure"}
        width={size}
        height={size}
        loading="lazy"
        className="w-full h-full object-contain"
        onError={() => {
          if (idx + 1 < sources.length) setIdx(idx + 1);
          else setFailed(true);
        }}
      />
    </div>
  );
}

/** Extract a likely SMILES token from free text (mirrors the edge function heuristic). */
export function detectSmilesInText(text: string): string | null {
  const tokens = text.match(/\b[A-Za-z0-9@+\-\[\]\(\)=#\\/%]{8,}\b/g);
  if (!tokens) return null;
  for (const cand of tokens) {
    if (/[a-z]/.test(cand) && /[A-Z]/.test(cand) && /[\(\)=\[\]cnos]/.test(cand)) {
      return cand;
    }
  }
  return null;
}
