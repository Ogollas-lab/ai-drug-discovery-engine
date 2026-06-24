/**
 * LangChain tools for drug discovery agents.
 */
'use strict';

const { z } = require('zod');
const { analyzeMolecule } = require('../analysis/molecule-analyzer');
const { evaluateSafety } = require('../safety/guardrail');

async function createEngineTools() {
  const { DynamicStructuredTool } = require('@langchain/core/tools');

  const pubchemAnalyzeTool = new DynamicStructuredTool({
    name: 'analyze_molecule',
    description: 'Fetch PubChem descriptors and apply medicinal chemistry rules for a SMILES string. Returns validated descriptors and engagement proxy.',
    schema: z.object({
      smiles: z.string().describe('SMILES string of the molecule'),
      targetName: z.string().optional().describe('Target protein name'),
    }),
    func: async ({ smiles, targetName }) => {
      const result = await analyzeMolecule({ smiles, targetName });
      return JSON.stringify(result);
    },
  });

  const safetyCheckTool = new DynamicStructuredTool({
    name: 'safety_check',
    description: 'Evaluate safety guardrails on an analysis object. Returns pass/fail, warnings, and HITL requirements.',
    schema: z.object({
      analysisJson: z.string().describe('JSON string of molecule analysis from analyze_molecule'),
    }),
    func: async ({ analysisJson }) => {
      const parsed = JSON.parse(analysisJson);
      const analysis = parsed.analysis || parsed;
      const safety = evaluateSafety(analysis);
      return JSON.stringify(safety);
    },
  });

  const diffdockTool = new DynamicStructuredTool({
    name: 'run_diffdock',
    description: 'Run structure docking analysis via NVIDIA NIM (stub when unconfigured).',
    schema: z.object({
      smiles: z.string(),
      targetName: z.string().optional(),
    }),
    func: async ({ smiles, targetName }) => {
      const { runDiffDock } = require('./diffdock-tool');
      const result = await runDiffDock({ smiles, targetName });
      return JSON.stringify(result);
    },
  });

  return [pubchemAnalyzeTool, safetyCheckTool, diffdockTool];
}

module.exports = { createEngineTools };
