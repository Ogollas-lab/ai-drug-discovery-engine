/**
 * Pawanax Chat API — SSE streaming via Lovable Cloud edge function.
 */
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
const CHAT_URL = SUPABASE_URL
  ? `${SUPABASE_URL}/functions/v1/chat`
  : `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/engine/chat/stream`;

export type ChatRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  toolEvents?: ToolEvent[];
  streaming?: boolean;
}

export type ToolEvent =
  | { type: 'tool_start'; tool: string; input?: unknown }
  | { type: 'tool_result'; tool: string; output: unknown };

export type ChatStreamEvent =
  | { type: 'connected'; traceId?: string }
  | { type: 'status'; data: { status: string; traceId?: string } }
  | { type: 'token'; data: { text: string; traceId?: string } }
  | { type: 'tool_start'; data: { tool: string; input?: unknown; traceId?: string } }
  | { type: 'tool_result'; data: { tool: string; output: unknown; traceId?: string } }
  | { type: 'done'; data: { traceId?: string } }
  | { type: 'error'; data: { message: string; traceId?: string } };

export async function streamChat(
  messages: { role: ChatRole; content: string }[],
  onEvent: (event: ChatStreamEvent) => void,
  signal?: AbortSignal
): Promise<void> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (SUPABASE_PUBLISHABLE_KEY) {
    headers.Authorization = `Bearer ${SUPABASE_PUBLISHABLE_KEY}`;
    headers.apikey = SUPABASE_PUBLISHABLE_KEY;
  }

  const res = await fetch(CHAT_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({ messages }),
    signal,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Chat failed (${res.status})`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error('No response stream');

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          onEvent(JSON.parse(line.slice(6)));
        } catch {
          /* skip malformed */
        }
      }
    }
  }
}

export const STARTER_PROMPTS = [
  { label: 'Analyze aspirin', prompt: 'Can you analyze aspirin (CC(=O)Oc1ccccc1C(=O)O) for COX-2? Explain simply.' },
  { label: 'What is QED?', prompt: 'What is QED in drug discovery and how do you calculate it for my molecule?' },
  { label: 'Find safer analogs', prompt: 'Optimize CC(=O)Oc1ccccc1C(=O)O for better drug-likeness using MolMIM.' },
  { label: 'Full discovery run', prompt: 'Start a full discovery workflow for ibuprofen CC(C)Cc1ccccc1C(C)C(=O)O targeting inflammation.' },
];
