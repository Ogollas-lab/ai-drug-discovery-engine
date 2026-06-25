/**
 * Engine API client — connects frontend to LangChain-backed discovery engine.
 */
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export interface EngineAnalysis {
  success: boolean;
  analysis?: {
    smiles: string;
    name: string;
    descriptors: Record<string, number | string | null>;
    rules: Record<string, unknown>;
    engagement: {
      value: number;
      confidence: number;
      source: string;
      label: string;
      disclaimer: string;
      modelId: string;
    };
    recommendations: Array<{ type: string; severity: string; text: string }>;
    scientific?: {
      qed?: { value: number; interpretation: string };
      pains?: { passed: boolean; alerts: { label: string; severity: string }[] };
      veber?: { passed: boolean; status: string };
      herg?: { risk: string; score: number };
      overallRisk?: string;
      citations?: string[];
    };
  };
  provenance?: Record<string, unknown>;
  error?: string;
  message?: string;
}

export interface EngineRun {
  success: boolean;
  runId: string;
  status: string;
  eventsUrl: string;
}

export interface RunEvent {
  type: string;
  runId?: string;
  step?: string;
  agent?: string;
  output?: unknown;
  error?: string;
  status?: string;
  decision?: string;
}

async function engineFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('token');
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(`${BASE_URL}${endpoint}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `Engine API error ${res.status}`);
  return data as T;
}

export async function analyzeMoleculeEngine(
  smiles: string,
  targetName?: string
): Promise<EngineAnalysis> {
  return engineFetch('/api/engine/analyze', {
    method: 'POST',
    body: JSON.stringify({ smiles, targetName }),
  });
}

export async function startEngineRun(
  smiles: string,
  targetName?: string
): Promise<EngineRun> {
  return engineFetch('/api/engine/runs', {
    method: 'POST',
    body: JSON.stringify({ smiles, targetName }),
  });
}

export async function getEngineRun(runId: string) {
  return engineFetch<{ success: boolean; run: unknown; steps: unknown[] }>(
    `/api/engine/runs/${runId}`
  );
}

export function subscribeRunEvents(
  runId: string,
  onEvent: (event: RunEvent) => void
): () => void {
  const url = `${BASE_URL}/api/engine/runs/${runId}/events`;
  const source = new EventSource(url);

  source.onmessage = (msg) => {
    try {
      onEvent(JSON.parse(msg.data));
    } catch {
      /* ignore parse errors */
    }
  };

  source.onerror = () => {
    source.close();
  };

  return () => source.close();
}

export async function approveEngineRun(runId: string, rationale?: string) {
  return engineFetch<{ success: boolean; status: string }>(`/api/engine/runs/${runId}/approve`, {
    method: 'POST',
    body: JSON.stringify({ rationale, decidedBy: 'ui-reviewer' }),
  });
}

export async function rejectEngineRun(runId: string, rationale?: string) {
  return engineFetch<{ success: boolean; status: string }>(`/api/engine/runs/${runId}/reject`, {
    method: 'POST',
    body: JSON.stringify({ rationale, decidedBy: 'ui-reviewer' }),
  });
}

export async function engineHealth() {
  return engineFetch<{ success: boolean; engine: string; database: string; models: unknown }>(
    '/api/engine/health'
  );
}
