/**
 * Streaming chat agent — Pawanax AI conversational layer over Vitalis engine tools.
 */
'use strict';

const { config, isNvidiaConfigured } = require('../config');
const { gateway } = require('../models/gateway');
const { createEngineTools } = require('../tools/engine-tools');
const { analyzeMolecule } = require('../analysis/molecule-analyzer');
const { log } = require('../observability/logger');

const SYSTEM_PROMPT = `You are Pawanax AI, the intelligence layer powering the Vitalis AI Drug Engine.
You help researchers AND non-scientists explore drug discovery in plain language.

Rules:
- Use tools for any molecule analysis — never invent PubChem data or binding affinities.
- Explain results simply when the user is not technical; use precise chemistry terms when they are.
- Always mention uncertainty and that lab validation is required before synthesis.
- Available tools: analyze_molecule, safety_check, run_diffdock, optimize_molecule (MolMIM), start_discovery_run (full DMTA).
- When a user gives a compound name (e.g. aspirin), ask for SMILES or use common SMILES if you know it confidently.
- Label outputs: [EXPERIMENTAL] for PubChem, [PREDICTED] for models, [INFERRED] for heuristics.`;

async function hasToolCapableModel() {
  return isNvidiaConfigured() || Boolean(config.gemini.apiKey);
}

async function createChatAgent() {
  const { createReactAgent } = require('@langchain/langgraph/prebuilt');
  const tools = await createEngineTools();
  const model = await gateway.getChatModel();
  return createReactAgent({
    llm: model,
    tools,
    stateModifier: SYSTEM_PROMPT,
  });
}

async function* streamChatHeuristic({ messages, traceId }) {
  const last = messages.filter((m) => m.role === 'user').pop()?.content || '';
  yield { type: 'status', data: { status: 'analyzing', traceId } };

  let smiles = null;
  const match = last.match(/SMILES[:\s]+([^\s,]+)/i);
  if (match) smiles = match[1];
  else if (/aspirin/i.test(last)) smiles = 'CC(=O)Oc1ccccc1C(=O)O';
  else if (/ibuprofen/i.test(last)) smiles = 'CC(C)Cc1ccccc1C(C)C(=O)O';

  if (smiles) {
    yield { type: 'tool_start', data: { tool: 'analyze_molecule', input: { smiles }, traceId } };
    const result = await analyzeMolecule({ smiles, targetName: 'unspecified' });
    yield { type: 'tool_result', data: { tool: 'analyze_molecule', output: result, traceId } };

    const name = result.analysis?.name || 'compound';
    const qed = result.analysis?.scientific?.qed?.value;
    yield {
      type: 'token',
      data: {
        text: `[Configure NVIDIA_API_KEY for full conversational AI]\n\nI analyzed **${name}** using PubChem data. QED ≈ ${qed?.toFixed(3) ?? 'n/a'}. See the interactive card above for descriptors. Lab validation is required before any synthesis decision.`,
        traceId,
      },
    };
  } else {
    yield {
      type: 'token',
      data: {
        text: 'Hi! I\'m Pawanax AI. Share a SMILES string or ask about a drug like aspirin — I\'ll run real PubChem analysis and show results inline. Configure `NVIDIA_API_KEY` for full natural-language reasoning.',
        traceId,
      },
    };
  }
  yield { type: 'done', data: { traceId } };
}

async function* streamChatWithAgent({ messages, traceId }) {
  const { HumanMessage, AIMessage, SystemMessage } = require('@langchain/core/messages');

  const agent = await createChatAgent();
  const lcMessages = messages.map((m) => {
    if (m.role === 'user') return new HumanMessage(m.content);
    if (m.role === 'assistant') return new AIMessage(m.content);
    return new SystemMessage(m.content);
  });

  log('info', 'chat_stream_start', { traceId, messageCount: messages.length });
  yield { type: 'status', data: { status: 'thinking', traceId } };

  try {
    const eventStream = agent.streamEvents({ messages: lcMessages }, { version: 'v2' });

    for await (const event of eventStream) {
      const name = event.event;

      if (name === 'on_chat_model_stream') {
        const chunk = event.data?.chunk;
        const text = typeof chunk?.content === 'string' ? chunk.content : '';
        if (text) yield { type: 'token', data: { text, traceId } };
      }

      if (name === 'on_tool_start') {
        yield {
          type: 'tool_start',
          data: { tool: event.name, input: event.data?.input, traceId },
        };
      }

      if (name === 'on_tool_end') {
        let output = event.data?.output;
        if (typeof output === 'string') {
          try { output = JSON.parse(output); } catch { /* keep */ }
        }
        yield {
          type: 'tool_result',
          data: { tool: event.name, output, traceId },
        };
      }
    }

    yield { type: 'done', data: { traceId } };
    log('info', 'chat_stream_complete', { traceId });
  } catch (err) {
    log('error', 'chat_stream_failed', { traceId, error: err.message });
    yield { type: 'error', data: { message: err.message, traceId } };
  }
}

async function* streamChat({ messages, traceId }) {
  if (!(await hasToolCapableModel())) {
    yield* streamChatHeuristic({ messages, traceId });
    return;
  }
  yield* streamChatWithAgent({ messages, traceId });
}

module.exports = { createChatAgent, streamChat, streamChatHeuristic, SYSTEM_PROMPT };
