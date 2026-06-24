/**
 * DiffDock NIM tool — structure-based docking via NVIDIA integrate API.
 * Returns honest fallback when NVIDIA_API_KEY or NIM endpoint unavailable.
 */
'use strict';

const axios = require('axios');
const { config, isNvidiaConfigured } = require('../config');
const { log } = require('../observability/logger');

const DIFFDOCK_MODEL = process.env.NVIDIA_DIFFDOCK_MODEL || 'deepmind/alphafold2';

async function runDiffDock({ smiles, targetName, traceId }) {
  const base = {
    smiles,
    targetName: targetName || 'unspecified',
    modelId: 'diffdock-nim-stub',
    configured: isNvidiaConfigured(),
    disclaimer: 'Structure docking requires NVIDIA NIM DiffDock deployment. This is a gateway stub until NIM endpoint is configured.',
  };

  if (!isNvidiaConfigured()) {
    log('warn', 'diffdock_skipped_no_nvidia_key', { traceId, smiles: smiles.slice(0, 40) });
    return {
      ...base,
      status: 'unavailable',
      confidence: 0,
      poseAvailable: false,
      reason: 'NVIDIA_API_KEY not configured',
    };
  }

  try {
    // NVIDIA NIM OpenAI-compatible — invoke structure prediction placeholder
    // Production: replace with BioNeMo DiffDock NIM REST endpoint
    const url = `${config.nvidia.baseUrl}/chat/completions`;
    const res = await axios.post(
      url,
      {
        model: config.nvidia.chatModel,
        messages: [
          {
            role: 'user',
            content: `You are a structure science stub. Given SMILES ${smiles} and target ${targetName}, respond with JSON only: {"dockingScore": number 0-1, "poseQuality": "low"|"medium"|"high", "note": string}. Do not invent experimental Ki.`,
          },
        ],
        max_tokens: 256,
        temperature: 0.1,
      },
      {
        headers: {
          Authorization: `Bearer ${config.nvidia.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 60000,
      }
    );

    const text = res.data?.choices?.[0]?.message?.content || '{}';
    let parsed = {};
    try {
      parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
    } catch {
      parsed = { note: text.slice(0, 200) };
    }

    log('info', 'diffdock_nim_complete', { traceId, targetName });

    return {
      ...base,
      status: 'predicted',
      modelId: config.nvidia.chatModel,
      confidence: 0.45,
      poseAvailable: false,
      dockingScore: parsed.dockingScore ?? null,
      poseQuality: parsed.poseQuality ?? 'low',
      note: parsed.note || 'NIM stub response — replace with DiffDock NIM microservice for real poses.',
      provenance: { source: 'nvidia_nim_stub', traceId },
    };
  } catch (err) {
    log('error', 'diffdock_nim_failed', { traceId, error: err.message });
    return {
      ...base,
      status: 'error',
      confidence: 0,
      poseAvailable: false,
      reason: err.message,
    };
  }
}

module.exports = { runDiffDock };
