/**
 * MolMIM NIM — real NVIDIA BioNeMo molecular generation / optimization.
 * https://health.api.nvidia.com/v1/biology/nvidia/molmim/generate
 */
'use strict';

const axios = require('axios');
const { config, isNvidiaConfigured } = require('../config');
const { log } = require('../observability/logger');

const MOLMIM_URL = process.env.NVIDIA_MOLMIM_URL
  || 'https://health.api.nvidia.com/v1/biology/nvidia/molmim/generate';

async function runMolMIM({ smiles, numMolecules = 5, propertyName = 'QED', traceId }) {
  const base = {
    seedSmiles: smiles,
    modelId: 'nvidia/molmim',
    configured: isNvidiaConfigured(),
    disclaimer: 'MolMIM generates analogs in latent space — validate all structures before synthesis.',
  };

  if (!isNvidiaConfigured()) {
    return { ...base, status: 'unavailable', reason: 'NVIDIA_API_KEY not configured' };
  }

  try {
    const res = await axios.post(
      MOLMIM_URL,
      {
        smi: smiles,
        algorithm: 'CMA-ES',
        num_molecules: numMolecules,
        iterations: 3,
        property_name: propertyName,
        particles: 10,
        minimize: false,
        min_similarity: 0.6,
        scaled_radius: 1,
      },
      {
        headers: {
          Authorization: `Bearer ${config.nvidia.apiKey}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        timeout: 120000,
      }
    );

    let molecules = [];
    const raw = res.data?.molecules;
    if (typeof raw === 'string') {
      try { molecules = JSON.parse(raw); } catch { molecules = []; }
    } else if (Array.isArray(raw)) {
      molecules = raw;
    } else if (Array.isArray(res.data)) {
      molecules = res.data;
    }

    log('info', 'molmim_complete', { traceId, count: molecules.length });

    return {
      ...base,
      status: 'success',
      propertyOptimized: propertyName,
      candidates: molecules.slice(0, numMolecules).map((m) => ({
        smiles: m.sample || m.smiles || m,
        score: m.score ?? null,
      })),
      confidence: molecules.length > 0 ? 0.7 : 0.2,
      provenance: { source: 'nvidia_molmim_nim', traceId, endpoint: MOLMIM_URL },
    };
  } catch (err) {
    log('error', 'molmim_failed', { traceId, error: err.message });
    return {
      ...base,
      status: 'error',
      reason: err.response?.data?.detail || err.message,
      confidence: 0,
    };
  }
}

module.exports = { runMolMIM };
