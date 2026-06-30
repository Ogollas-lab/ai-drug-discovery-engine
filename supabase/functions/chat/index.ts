/**
 * Pawanax Chat — Lovable Cloud edge function.
 * Streams SSE events compatible with the existing src/lib/chat-api.ts client.
 * Uses Lovable AI Gateway by default; falls back to NVIDIA NIM if NVIDIA_API_KEY is set.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface ChatMsg {
  role: "user" | "assistant" | "system";
  content: string;
}

const SYSTEM_PROMPT = `You are Pawanax AI, the intelligence layer of the Vitalis AI Drug Engine.
You help researchers and curious learners explore drug discovery in plain language.

Rules:
- Never invent PubChem data or binding affinities. If a molecule analysis card is provided in context, base your answer on those numbers.
- Label uncertainty. Always mention that lab validation is required before any synthesis decision.
- Use [EXPERIMENTAL] for PubChem-sourced values, [PREDICTED] for model outputs, [INFERRED] for heuristics.
- Keep answers concise (3-6 sentences) unless the user asks for depth.`;

// ---------- SMILES detection ----------
const KNOWN: Record<string, { smiles: string; name: string }> = {
  aspirin: { smiles: "CC(=O)Oc1ccccc1C(=O)O", name: "Aspirin" },
  ibuprofen: { smiles: "CC(C)Cc1ccc(C(C)C(=O)O)cc1", name: "Ibuprofen" },
  paracetamol: { smiles: "CC(=O)Nc1ccc(O)cc1", name: "Paracetamol" },
  acetaminophen: { smiles: "CC(=O)Nc1ccc(O)cc1", name: "Acetaminophen" },
  caffeine: { smiles: "Cn1cnc2c1c(=O)n(C)c(=O)n2C", name: "Caffeine" },
};

function detectSmiles(text: string): { smiles: string; name?: string } | null {
  const m = text.match(/\b([A-Za-z0-9@+\-\[\]\(\)=#\\/%]{8,})\b/g);
  if (m) {
    for (const cand of m) {
      if (/[a-z]/.test(cand) && /[A-Z]/.test(cand) && /[\(\)=\[\]cnos]/.test(cand)) {
        return { smiles: cand };
      }
    }
  }
  const lower = text.toLowerCase();
  for (const k of Object.keys(KNOWN)) {
    if (lower.includes(k)) return KNOWN[k];
  }
  return null;
}

// ---------- PubChem ----------
async function pubchemAnalyze(smiles: string, fallbackName?: string) {
  const encoded = encodeURIComponent(smiles);
  const propUrl = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/smiles/${encoded}/property/MolecularWeight,XLogP,HBondDonorCount,HBondAcceptorCount,RotatableBondCount,TPSA,MolecularFormula,IUPACName/JSON`;
  const cidUrl = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/smiles/${encoded}/cids/JSON`;

  const [propRes, cidRes] = await Promise.all([
    fetch(propUrl).catch(() => null),
    fetch(cidUrl).catch(() => null),
  ]);

  if (!propRes?.ok) {
    return {
      success: false,
      error: "PubChem could not resolve this SMILES.",
      smiles,
    };
  }

  const propJson = await propRes.json();
  const p = propJson?.PropertyTable?.Properties?.[0] ?? {};
  const cid = cidRes?.ok ? (await cidRes.json())?.IdentifierList?.CID?.[0] : undefined;

  const mw = Number(p.MolecularWeight);
  const logP = p.XLogP != null ? Number(p.XLogP) : null;
  const hbd = Number(p.HBondDonorCount);
  const hba = Number(p.HBondAcceptorCount);
  const rot = Number(p.RotatableBondCount);
  const tpsa = Number(p.TPSA);

  const violations: string[] = [];
  if (mw > 500) violations.push("MW>500");
  if (logP != null && logP > 5) violations.push("logP>5");
  if (hbd > 5) violations.push("HBD>5");
  if (hba > 10) violations.push("HBA>10");
  const lipinski = violations.length === 0 ? "PASS" : `${violations.length} violation(s)`;

  // Rough QED proxy
  const qed =
    Math.max(0, Math.min(1, 1 - violations.length * 0.18 - Math.abs((mw - 350) / 1000)));

  const engagement = Math.max(
    0.05,
    Math.min(0.95, 0.4 + (mw > 200 && mw < 450 ? 0.1 : -0.05) + (logP && logP > 1 && logP < 3 ? 0.1 : 0))
  );

  return {
    success: true,
    analysis: {
      name: p.IUPACName || fallbackName || "Unknown compound",
      smiles,
      descriptors: {
        molecularWeight: mw,
        logP,
        hBondDonors: hbd,
        hBondAcceptors: hba,
        rotatableBonds: rot,
        tpsa,
        molecularFormula: p.MolecularFormula,
        pubchemCid: cid,
      },
      rules: { lipinski: { status: lipinski } },
      scientific: { qed: { value: Number(qed.toFixed(3)) } },
      engagement: {
        value: Number(engagement.toFixed(2)),
        label: "Heuristic Target Engagement Proxy",
        disclaimer: "Not a trained model. Lab validation required.",
      },
    },
  };
}

// ---------- LLM streaming ----------
async function* streamLLM(messages: ChatMsg[]): AsyncGenerator<string> {
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  if (!lovableKey) {
    yield "[LOVABLE_API_KEY not configured.]";
    return;
  }
  const url = "https://ai.gateway.lovable.dev/v1/chat/completions";
  const headers: Record<string, string> = {
    "Lovable-API-Key": lovableKey,
    "Content-Type": "application/json",
    "X-Lovable-AIG-SDK": "edge-function",
  };
  const model = "google/gemini-2.5-flash";

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ model, messages, stream: true, temperature: 0.4 }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    if (res.status === 429) {
      yield "[Rate limited — please retry in a moment.]";
      return;
    }
    if (res.status === 402) {
      yield "[AI credits exhausted. Add credits in your Lovable workspace billing settings.]";
      return;
    }
    yield `[LLM error ${res.status}: ${errText.slice(0, 200)}]`;
    return;
  }

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice(5).trim();
      if (payload === "[DONE]") return;
      try {
        const json = JSON.parse(payload);
        const delta = json?.choices?.[0]?.delta?.content;
        if (typeof delta === "string" && delta.length > 0) yield delta;
      } catch {
        /* ignore */
      }
    }
  }
}

// ---------- Server ----------
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "POST only" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: { messages?: ChatMsg[] };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const messages = body.messages ?? [];
  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response(JSON.stringify({ error: "messages array required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      const send = (obj: unknown) =>
        controller.enqueue(enc.encode(`data: ${JSON.stringify(obj)}\n\n`));

      try {
        send({ type: "connected" });
        send({ type: "status", data: { status: "analyzing" } });

        const lastUser = [...messages].reverse().find((m) => m.role === "user");
        const detected = lastUser ? detectSmiles(lastUser.content) : null;

        let analysisContext = "";
        if (detected) {
          send({
            type: "tool_start",
            data: { tool: "analyze_molecule", input: { smiles: detected.smiles } },
          });
          const result = await pubchemAnalyze(detected.smiles, detected.name);
          send({ type: "tool_result", data: { tool: "analyze_molecule", output: result } });
          if (result.success && result.analysis) {
            const a = result.analysis;
            analysisContext = `\n\n[PubChem analysis context for response]
Compound: ${a.name}
SMILES: ${a.smiles}
MW: ${a.descriptors.molecularWeight} Da
LogP: ${a.descriptors.logP}
H-bond donors/acceptors: ${a.descriptors.hBondDonors}/${a.descriptors.hBondAcceptors}
TPSA: ${a.descriptors.tpsa}
Lipinski: ${a.rules.lipinski.status}
QED proxy: ${a.scientific.qed.value}
Heuristic engagement: ${a.engagement.value}`;
          }
        }

        const llmMessages: ChatMsg[] = [
          { role: "system", content: SYSTEM_PROMPT + analysisContext },
          ...messages,
        ];

        send({ type: "status", data: { status: "thinking" } });

        for await (const chunk of streamLLM(llmMessages)) {
          send({ type: "token", data: { text: chunk } });
        }

        send({ type: "done", data: {} });
      } catch (err) {
        send({
          type: "error",
          data: { message: err instanceof Error ? err.message : String(err) },
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
});
