/**
 * LangGraph StateGraph — DMTA workflow as a compiled graph.
 */
'use strict';

const { StateGraph, END, START } = require('@langchain/langgraph');
const { Annotation } = require('@langchain/langgraph');
const { analyzeMolecule } = require('../analysis/molecule-analyzer');
const { evaluateSafety } = require('../safety/guardrail');
const { generateReport } = require('./supervisor');

const WorkflowState = Annotation.Root({
  runId: Annotation(),
  smiles: Annotation(),
  targetId: Annotation(),
  targetName: Annotation(),
  discoveryResult: Annotation(),
  analysis: Annotation(),
  safety: Annotation(),
  report: Annotation(),
  error: Annotation(),
});

async function discoveryAgent(state) {
  const result = await analyzeMolecule({
    smiles: state.smiles,
    targetId: state.targetId,
    targetName: state.targetName,
  });
  if (!result.success) throw new Error(result.error);
  return { discoveryResult: result, analysis: result.analysis };
}

async function analysisAgent(state) {
  const a = state.analysis;
  return {
    analysis: {
      ...a,
      interpretation: {
        descriptors: a.descriptors,
        rules: a.rules,
        recommendations: a.recommendations,
        engagement: a.engagement,
        scaffold: a.scaffold,
      },
    },
  };
}

async function safetyAgent(state) {
  return { safety: evaluateSafety(state.analysis) };
}

async function reportingAgent(state) {
  const report = await generateReport(state.analysis, state.safety, state.targetName);
  return { report };
}

function buildDMTAGraph() {
  const graph = new StateGraph(WorkflowState)
    .addNode('discovery_agent', discoveryAgent)
    .addNode('analysis_agent', analysisAgent)
    .addNode('safety_agent', safetyAgent)
    .addNode('reporting_agent', reportingAgent)
    .addEdge(START, 'discovery_agent')
    .addEdge('discovery_agent', 'analysis_agent')
    .addEdge('analysis_agent', 'safety_agent')
    .addEdge('safety_agent', 'reporting_agent')
    .addEdge('reporting_agent', END);

  return graph.compile();
}

async function runDMTAGraph(input) {
  const graph = buildDMTAGraph();
  return graph.invoke(input);
}

module.exports = { buildDMTAGraph, runDMTAGraph, WorkflowState };
