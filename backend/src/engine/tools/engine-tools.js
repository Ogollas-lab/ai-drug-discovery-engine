/**
 * LangChain tools — full Vitalis engine toolkit for Pawanax chat agent.
 */
'use strict';

const { z } = require('zod');
const { analyzeMolecule } = require('../analysis/molecule-analyzer');
const { evaluateSafety } = require('../safety/guardrail');
const { runDiffDock } = require('./diffdock-tool');
const { runMolMIM } = require('./molmim-tool');
const db = require('../db/client');
const { enqueueJob } = require('../queue/job-queue');

async function createEngineTools() {
  const { DynamicStructuredTool } = require('@langchain/core/tools');

  const pubchemAnalyzeTool = new DynamicStructuredTool({
    name: 'analyze_molecule',
    description: 'Analyze a SMILES string: PubChem descriptors, Lipinski/Veber rules, QED, PAINS screen, engagement proxy. Use for any compound question.',
    schema: z.object({
      smiles: z.string().describe('SMILES string'),
      targetName: z.string().optional().describe('Target protein e.g. COX-2'),
    }),
    func: async ({ smiles, targetName }) => {
      const result = await analyzeMolecule({ smiles, targetName });
      return JSON.stringify(result);
    },
  });

  const safetyCheckTool = new DynamicStructuredTool({
    name: 'safety_check',
    description: 'Safety guardrail on analysis JSON. Returns HITL flags and risk issues.',
    schema: z.object({
      analysisJson: z.string().describe('JSON from analyze_molecule'),
    }),
    func: async ({ analysisJson }) => {
      const parsed = JSON.parse(analysisJson);
      const analysis = parsed.analysis || parsed;
      return JSON.stringify(evaluateSafety(analysis));
    },
  });

  const diffdockTool = new DynamicStructuredTool({
    name: 'run_diffdock',
    description: 'Structure docking estimate via NVIDIA NIM (honest stub when unconfigured).',
    schema: z.object({
      smiles: z.string(),
      targetName: z.string().optional(),
    }),
    func: async ({ smiles, targetName }) => {
      return JSON.stringify(await runDiffDock({ smiles, targetName }));
    },
  });

  const molmimTool = new DynamicStructuredTool({
    name: 'optimize_molecule',
    description: 'Generate QED-optimized analogs around a seed SMILES using NVIDIA MolMIM.',
    schema: z.object({
      smiles: z.string(),
      numMolecules: z.number().optional().default(5),
    }),
    func: async ({ smiles, numMolecules }) => {
      return JSON.stringify(await runMolMIM({ smiles, numMolecules: numMolecules || 5 }));
    },
  });

  const dmtaRunTool = new DynamicStructuredTool({
    name: 'start_discovery_run',
    description: 'Start full async DMTA workflow (discovery → MolMIM → docking → safety → report). Returns runId for progress tracking.',
    schema: z.object({
      smiles: z.string(),
      targetName: z.string().optional(),
    }),
    func: async ({ smiles, targetName }) => {
      const run = await db.createRun({
        workflowType: 'molecule_analysis',
        input: { smiles, targetName },
      });
      await enqueueJob('molecule_analysis', {
        runId: run.id,
        smiles,
        targetName,
      });
      return JSON.stringify({
        runId: run.id,
        status: 'pending',
        eventsUrl: `/api/engine/runs/${run.id}/events`,
        message: 'DMTA workflow started — user can track progress in chat UI.',
      });
    },
  });

  return [pubchemAnalyzeTool, safetyCheckTool, diffdockTool, molmimTool, dmtaRunTool];
}

module.exports = { createEngineTools };
