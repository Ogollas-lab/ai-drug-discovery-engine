import { FlaskConical, Shield, Atom, Sparkles, Play, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ToolEvent } from "@/lib/chat-api";

interface ToolCardProps {
  event: ToolEvent;
}

export function ToolResultCard({ event }: ToolCardProps) {
  if (event.type === 'tool_start') {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-primary/20 bg-primary/5 text-xs font-mono text-primary">
        <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
        Running {formatToolName(event.tool)}…
      </div>
    );
  }

  const output = event.output as Record<string, unknown> | undefined;
  if (!output) return null;

  switch (event.tool) {
    case 'analyze_molecule':
      return <AnalyzeToolCard data={output} />;
    case 'safety_check':
      return <SafetyToolCard data={output} />;
    case 'run_diffdock':
      return <DockingToolCard data={output} />;
    case 'optimize_molecule':
      return <MolMimToolCard data={output} />;
    case 'start_discovery_run':
      return <DmtaRunCard data={output} />;
    default:
      return (
        <pre className="text-[10px] font-mono p-3 rounded-xl glass-panel border border-border/60 overflow-x-auto max-h-48">
          {JSON.stringify(output, null, 2)}
        </pre>
      );
  }
}

function formatToolName(name: string) {
  return name.replace(/_/g, ' ');
}

function AnalyzeToolCard({ data }: { data: Record<string, unknown> }) {
  const parsed = data as { success?: boolean; analysis?: {
    name: string; smiles: string;
    descriptors: Record<string, number>;
    scientific?: { qed?: { value: number }; herg?: { risk: string } };
    engagement?: { value: number; label: string; disclaimer: string };
    rules?: { lipinski?: { status: string } };
  }};
  const a = parsed.analysis;
  if (!a) return null;

  return (
    <div className="rounded-2xl border border-border/60 glass-panel p-4 space-y-3">
      <div className="flex items-center gap-2">
        <FlaskConical className="w-4 h-4 text-primary" />
        <span className="font-display text-sm font-semibold">{a.name}</span>
        <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 ml-auto">
          PubChem
        </span>
      </div>
      <p className="text-[10px] font-mono text-muted-foreground break-all">{a.smiles}</p>
      <div className="grid grid-cols-2 xs:grid-cols-4 gap-2">
        <Metric label="MW" value={`${a.descriptors?.molecularWeight?.toFixed?.(1) ?? '—'} Da`} />
        <Metric label="LogP" value={String(a.descriptors?.logP ?? '—')} />
        <Metric label="QED" value={a.scientific?.qed?.value?.toFixed(3) ?? '—'} />
        <Metric label="Lipinski" value={a.rules?.lipinski?.status ?? '—'} />
      </div>
      {a.engagement && (
        <div className="pt-2 border-t border-border/40">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">{a.engagement.label}</span>
            <span className="font-display font-bold text-primary">{a.engagement.value.toFixed(2)}</span>
          </div>
          <p className="text-[9px] text-muted-foreground mt-1">{a.engagement.disclaimer}</p>
        </div>
      )}
    </div>
  );
}

function SafetyToolCard({ data }: { data: Record<string, unknown> }) {
  const s = data as { passed?: boolean; requiresHitl?: boolean; issues?: string[]; riskLevel?: string };
  return (
    <div className={`rounded-2xl border p-4 space-y-2 ${s.requiresHitl ? 'border-destructive/40 bg-destructive/5' : 'border-border/60 glass-panel'}`}>
      <div className="flex items-center gap-2">
        <Shield className={`w-4 h-4 ${s.requiresHitl ? 'text-destructive' : 'text-primary'}`} />
        <span className="font-display text-sm font-semibold">Safety Check</span>
        {s.requiresHitl && (
          <span className="text-[9px] font-mono ml-auto text-destructive">Human review required</span>
        )}
      </div>
      {s.issues?.map((issue, i) => (
        <p key={i} className="text-xs text-muted-foreground">• {issue}</p>
      ))}
    </div>
  );
}

function DockingToolCard({ data }: { data: Record<string, unknown> }) {
  const d = data as { status: string; dockingScore?: number; poseQuality?: string; note?: string };
  return (
    <div className="rounded-2xl border border-border/60 glass-panel p-4 space-y-2">
      <div className="flex items-center gap-2">
        <Atom className="w-4 h-4 text-primary" />
        <span className="font-display text-sm font-semibold">Docking Analysis</span>
        <span className="text-[9px] font-mono ml-auto capitalize">{d.status}</span>
      </div>
      {d.dockingScore != null && (
        <p className="text-xs">Score: <span className="text-primary font-mono">{d.dockingScore}</span> · {d.poseQuality}</p>
      )}
      {d.note && <p className="text-[10px] text-muted-foreground">{d.note}</p>}
    </div>
  );
}

function MolMimToolCard({ data }: { data: Record<string, unknown> }) {
  const m = data as { status: string; candidates?: { smiles: string; score: number | null }[] };
  return (
    <div className="rounded-2xl border border-border/60 glass-panel p-4 space-y-2">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-primary" />
        <span className="font-display text-sm font-semibold">MolMIM Analogs</span>
      </div>
      <div className="space-y-1.5 max-h-36 overflow-y-auto">
        {m.candidates?.slice(0, 5).map((c, i) => (
          <div key={i} className="flex justify-between gap-2 text-[10px] font-mono">
            <span className="truncate text-muted-foreground">{c.smiles}</span>
            <span className="text-primary shrink-0">{c.score?.toFixed(3) ?? '—'}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DmtaRunCard({ data }: { data: Record<string, unknown> }) {
  const r = data as { runId: string; status: string; message?: string };
  return (
    <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 space-y-2">
      <div className="flex items-center gap-2">
        <Play className="w-4 h-4 text-primary" />
        <span className="font-display text-sm font-semibold">Discovery Run Started</span>
      </div>
      <p className="text-[10px] font-mono text-muted-foreground">Run ID: {r.runId}</p>
      {r.message && <p className="text-xs text-muted-foreground">{r.message}</p>}
      <Button size="sm" variant="outline" className="h-8 text-xs w-full" asChild>
        <a href={`/workspace?run=${r.runId}`}>Open in Workspace →</a>
      </Button>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-2 rounded-lg bg-background/50 border border-border/40">
      <div className="text-[8px] font-mono text-muted-foreground uppercase">{label}</div>
      <div className="text-xs font-display font-semibold truncate">{value}</div>
    </div>
  );
}
