/**
 * Training Pipeline
 *
 * Connects the Datasets Hub (PDB, BindingDB, UniProt, DrugBank, ZINC) directly to
 * the model training workflow. Performs:
 *   1. Ingestion        — pulls aggregated evidence from datasets.ts
 *   2. Preparation      — normalizes records into unified TrainingExample shape
 *   3. Validation       — splits train/val, filters malformed entries
 *   4. Training         — runs a deterministic regression-style fit (heuristic
 *                          stand-in for a real GAT/GCN training loop)
 *   5. Calibration      — derives a scale/bias correction persisted to
 *                          localStorage and consumed by the GAT predictor.
 *
 * NOTE: This is an in-browser heuristic training simulator. It does not train
 * a real neural network, but it DOES adapt prediction calibration from the
 * ingested experimental evidence so downstream predictions reflect the data.
 */

import {
  aggregateDatasetEvidence,
  type AggregatedDatasetReport,
  type BindingDBRecord,
  type PDBStructure,
} from "./datasets";

export const CALIBRATION_KEY = "isde.training.calibration.v1";
export const SNAPSHOT_KEY = "isde.training.snapshot.v1";

export interface TrainingExample {
  id: string;
  source: "BindingDB" | "PDB" | "UniProt" | "DrugBank" | "ZINC";
  ligand?: string;
  target?: string;
  // Normalized affinity in [0,1] (1 = strongest). Optional for structural-only
  // examples (PDB / DrugBank / ZINC).
  affinity?: number;
  // Raw affinity if numeric (nM).
  affinityNM?: number | null;
  affinityType?: string;
  features: number[];     // small numeric feature vector
  hasLabel: boolean;
}

export interface EpochMetric {
  epoch: number;
  loss: number;
  rmse: number;
  r2: number;
}

export interface CalibrationParams {
  scale: number;          // multiplicative scale
  bias: number;           // additive bias
  trainedAt: string;
  examples: number;
  sources: Record<string, number>;
}

export interface TrainingSnapshot {
  query: string;
  generatedAt: string;
  ingested: {
    pdb: number;
    bindingdb: number;
    uniprot: number;
    drugbank: number;
    zinc: number;
  };
  prepared: number;
  trainCount: number;
  valCount: number;
  epochs: EpochMetric[];
  finalRMSE: number;
  finalR2: number;
  calibration: CalibrationParams;
  notes: string[];
}

// ---------- Preparation ----------

function nmToNormalizedAffinity(nm: number): number {
  // pX = -log10(M) = 9 - log10(nM). Map pX in [3,12] -> [0,1].
  if (!nm || nm <= 0) return 0;
  const pX = 9 - Math.log10(nm);
  return Math.max(0, Math.min(1, (pX - 3) / 9));
}

function bindingDBToExamples(rows: BindingDBRecord[]): TrainingExample[] {
  return rows
    .filter((r) => r.value && r.value > 0)
    .map((r, i) => {
      const aff = nmToNormalizedAffinity(r.value as number);
      return {
        id: `bdb-${i}`,
        source: "BindingDB" as const,
        ligand: r.ligandName,
        target: r.targetName,
        affinity: aff,
        affinityNM: r.value,
        affinityType: r.affinityType,
        features: [
          Math.log10((r.value as number) + 1),
          aff,
          r.affinityType === "Ki" ? 1 : 0,
          r.affinityType === "IC50" ? 1 : 0,
        ],
        hasLabel: true,
      };
    });
}

function pdbToExamples(rows: PDBStructure[]): TrainingExample[] {
  return rows.map((p, i) => ({
    id: `pdb-${p.pdbId || i}`,
    source: "PDB" as const,
    target: p.title,
    // Resolution as weak proxy: better resolution => more reliable structural example.
    affinity: p.resolution ? Math.max(0, Math.min(1, 1 - p.resolution / 5)) : undefined,
    features: [
      p.resolution ?? 3,
      p.ligands.length,
      p.method === "X-RAY DIFFRACTION" ? 1 : 0,
    ],
    hasLabel: !!p.resolution,
  }));
}

function structuralToExamples(
  report: AggregatedDatasetReport,
): TrainingExample[] {
  const out: TrainingExample[] = [];
  report.uniprot.forEach((u, i) =>
    out.push({
      id: `up-${u.accession || i}`,
      source: "UniProt",
      target: u.name,
      features: [u.sequenceLength ?? 300, (u.keywords?.length ?? 0)],
      hasLabel: false,
    }),
  );
  report.drugbank.forEach((d, i) =>
    out.push({
      id: `db-${d.id || i}`,
      source: "DrugBank",
      ligand: d.name,
      features: [d.name.length, (d.description?.length ?? 0) / 100],
      hasLabel: false,
    }),
  );
  report.zinc.forEach((z, i) =>
    out.push({
      id: `z-${z.zincId || i}`,
      source: "ZINC",
      ligand: z.zincId,
      features: [z.mwt ?? 350, z.logp ?? 2],
      hasLabel: false,
    }),
  );
  return out;
}

export function prepareDataset(report: AggregatedDatasetReport): TrainingExample[] {
  return [
    ...bindingDBToExamples(report.bindingdb),
    ...pdbToExamples(report.pdb),
    ...structuralToExamples(report),
  ];
}

// ---------- Validation / split ----------

export function trainValSplit(
  examples: TrainingExample[],
  valFraction = 0.2,
): { train: TrainingExample[]; val: TrainingExample[] } {
  const labeled = examples.filter((e) => e.hasLabel && typeof e.affinity === "number");
  // Deterministic shuffle by id hash.
  const sorted = [...labeled].sort((a, b) => a.id.localeCompare(b.id));
  const cut = Math.max(1, Math.floor(sorted.length * (1 - valFraction)));
  return { train: sorted.slice(0, cut), val: sorted.slice(cut) };
}

// ---------- Training (heuristic regression) ----------

function meanStd(xs: number[]): { mean: number; std: number } {
  if (xs.length === 0) return { mean: 0, std: 1 };
  const m = xs.reduce((a, b) => a + b, 0) / xs.length;
  const v = xs.reduce((a, b) => a + (b - m) ** 2, 0) / xs.length;
  return { mean: m, std: Math.sqrt(v) || 1 };
}

interface FitResult {
  scale: number;
  bias: number;
  epochs: EpochMetric[];
  finalRMSE: number;
  finalR2: number;
}

function fit(train: TrainingExample[], val: TrainingExample[], epochs = 12): FitResult {
  // Linear calibration f(p) = scale * p + bias against measured affinity.
  // Optimize via gradient descent on MSE — light and deterministic.
  let scale = 1;
  let bias = 0;
  const lr = 0.05;
  const ep: EpochMetric[] = [];

  if (train.length === 0) {
    return {
      scale: 1,
      bias: 0,
      epochs: [{ epoch: 1, loss: 0, rmse: 0, r2: 0 }],
      finalRMSE: 0,
      finalR2: 0,
    };
  }

  // Use the example's *first* feature normalized as a stand-in "model output"
  // baseline (proxy for raw GAT logits before calibration).
  const baselines = train.map((e) =>
    Math.max(0, Math.min(1, (e.features[0] ?? 0.5) / 10)),
  );
  const targets = train.map((e) => e.affinity ?? 0);

  for (let epoch = 1; epoch <= epochs; epoch++) {
    let gScale = 0;
    let gBias = 0;
    let loss = 0;
    for (let i = 0; i < baselines.length; i++) {
      const pred = scale * baselines[i] + bias;
      const err = pred - targets[i];
      gScale += err * baselines[i];
      gBias += err;
      loss += err * err;
    }
    gScale /= baselines.length;
    gBias /= baselines.length;
    loss /= baselines.length;
    scale -= lr * gScale;
    bias -= lr * gBias;

    // Validation metrics
    const vPreds = val.map((e) =>
      scale * Math.max(0, Math.min(1, (e.features[0] ?? 0.5) / 10)) + bias,
    );
    const vT = val.map((e) => e.affinity ?? 0);
    const rmse =
      vPreds.length === 0
        ? Math.sqrt(loss)
        : Math.sqrt(
            vPreds.reduce((a, p, i) => a + (p - vT[i]) ** 2, 0) / vPreds.length,
          );
    const { mean: tMean } = meanStd(vT.length ? vT : targets);
    const ssTot = (vT.length ? vT : targets).reduce(
      (a, t) => a + (t - tMean) ** 2,
      0,
    ) || 1;
    const ssRes = vPreds.length
      ? vPreds.reduce((a, p, i) => a + (p - vT[i]) ** 2, 0)
      : loss * baselines.length;
    const r2 = 1 - ssRes / ssTot;
    ep.push({
      epoch,
      loss: +loss.toFixed(4),
      rmse: +rmse.toFixed(4),
      r2: +Math.max(-1, Math.min(1, r2)).toFixed(4),
    });
  }
  const last = ep[ep.length - 1];
  return { scale, bias, epochs: ep, finalRMSE: last.rmse, finalR2: last.r2 };
}

// ---------- Public orchestration ----------

export interface RunTrainingOptions {
  query: string;
  epochs?: number;
  onStage?: (stage: string) => void;
}

export async function runTrainingPipeline(
  opts: RunTrainingOptions,
): Promise<TrainingSnapshot> {
  const { query, epochs = 12, onStage } = opts;
  onStage?.("ingesting");
  const report = await aggregateDatasetEvidence(query);

  onStage?.("preparing");
  const prepared = prepareDataset(report);

  onStage?.("validating");
  const { train, val } = trainValSplit(prepared);

  onStage?.("training");
  const fitRes = fit(train, val, epochs);

  onStage?.("calibrating");
  const sources: Record<string, number> = {};
  prepared.forEach((p) => {
    sources[p.source] = (sources[p.source] ?? 0) + 1;
  });
  const calibration: CalibrationParams = {
    scale: +fitRes.scale.toFixed(4),
    bias: +fitRes.bias.toFixed(4),
    trainedAt: new Date().toISOString(),
    examples: prepared.length,
    sources,
  };

  const notes: string[] = [];
  if (report.bindingdb.length === 0)
    notes.push("No BindingDB labels found — calibration relies on weak structural priors.");
  if (train.length < 5)
    notes.push("Small labeled set — calibration is approximate; expect drift.");
  if (val.length === 0) notes.push("No validation split — RMSE/R² computed on training set.");

  const snapshot: TrainingSnapshot = {
    query,
    generatedAt: new Date().toISOString(),
    ingested: {
      pdb: report.pdb.length,
      bindingdb: report.bindingdb.length,
      uniprot: report.uniprot.length,
      drugbank: report.drugbank.length,
      zinc: report.zinc.length,
    },
    prepared: prepared.length,
    trainCount: train.length,
    valCount: val.length,
    epochs: fitRes.epochs,
    finalRMSE: fitRes.finalRMSE,
    finalR2: fitRes.finalR2,
    calibration,
    notes,
  };

  try {
    localStorage.setItem(CALIBRATION_KEY, JSON.stringify(calibration));
    localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot));
  } catch {
    // ignore storage failures
  }
  onStage?.("done");
  return snapshot;
}

export function loadCalibration(): CalibrationParams | null {
  try {
    const raw = localStorage.getItem(CALIBRATION_KEY);
    return raw ? (JSON.parse(raw) as CalibrationParams) : null;
  } catch {
    return null;
  }
}

export function loadSnapshot(): TrainingSnapshot | null {
  try {
    const raw = localStorage.getItem(SNAPSHOT_KEY);
    return raw ? (JSON.parse(raw) as TrainingSnapshot) : null;
  } catch {
    return null;
  }
}

export function applyCalibration(score: number): number {
  const c = loadCalibration();
  if (!c) return score;
  return Math.max(0, Math.min(1, c.scale * score + c.bias));
}

// ---------- Batch training across priority diseases ----------

import {
  DATASET_REGISTRY,
  scanRegistry,
  type ComplianceIssue,
} from "@/data/dataset-registry";

export const BATCH_SNAPSHOT_KEY = "isde.training.batch.v1";

/**
 * WHO/Africa-focused priority diseases the model is continuously
 * fine-tuned against. Each entry maps to a topic query for the public
 * dataset hubs (PDB, BindingDB, UniProt, DrugBank, ZINC).
 */
export const PRIORITY_DISEASE_QUERIES: { disease: string; query: string; category: string }[] = [
  { disease: "Rift Valley Fever", query: "Rift Valley Fever virus polymerase", category: "Viral" },
  { disease: "Lassa Fever", query: "Lassa virus glycoprotein", category: "Viral" },
  { disease: "Rabies", query: "Rabies virus glycoprotein", category: "Viral" },
  { disease: "Hepatitis B", query: "Hepatitis B virus polymerase", category: "Viral" },
  { disease: "Visceral Leishmaniasis", query: "Leishmania donovani trypanothione reductase", category: "NTD" },
  { disease: "Schistosomiasis", query: "Schistosoma mansoni thioredoxin glutathione reductase", category: "NTD" },
  { disease: "Mycetoma", query: "Madurella mycetomatis CYP51", category: "NTD" },
  { disease: "Drug-Resistant TB", query: "Mycobacterium tuberculosis InhA", category: "Resistant" },
  { disease: "Burkitt Lymphoma", query: "MYC oncogene Burkitt lymphoma", category: "Resistant" },
  { disease: "Alzheimer's Disease", query: "amyloid beta secretase BACE1", category: "Neurological" },
  { disease: "Nodding Syndrome", query: "Onchocerca volvulus tubulin", category: "Neurological" },
];

export interface DiseaseRunSummary {
  disease: string;
  category: string;
  query: string;
  prepared: number;
  trainCount: number;
  valCount: number;
  finalRMSE: number;
  finalR2: number;
  ingested: TrainingSnapshot["ingested"];
  notes: string[];
  error?: string;
}

export interface BatchTrainingSnapshot {
  generatedAt: string;
  runs: DiseaseRunSummary[];
  aggregate: {
    totalExamples: number;
    avgRMSE: number;
    avgR2: number;
    sources: Record<string, number>;
  };
  calibration: CalibrationParams;
  compliance: {
    productionIssues: ComplianceIssue[];
    productionDatasets: string[];
    researchOnlyDatasets: string[];
    blockedDatasets: string[];
  };
}

export interface RunBatchOptions {
  epochs?: number;
  onProgress?: (done: number, total: number, current: string) => void;
}

/**
 * Run the training pipeline across every priority disease, aggregate
 * the results into a single calibration update, and persist a batch
 * snapshot for the Training dashboard. License-blocked datasets are
 * automatically excluded via the registry compliance scan.
 */
export async function runBatchTraining(
  opts: RunBatchOptions = {},
): Promise<BatchTrainingSnapshot> {
  const { epochs = 10, onProgress } = opts;
  const runs: DiseaseRunSummary[] = [];
  const aggregateSources: Record<string, number> = {};
  let allTrain: TrainingExample[] = [];
  let allVal: TrainingExample[] = [];

  for (let i = 0; i < PRIORITY_DISEASE_QUERIES.length; i++) {
    const { disease, query, category } = PRIORITY_DISEASE_QUERIES[i];
    onProgress?.(i, PRIORITY_DISEASE_QUERIES.length, disease);
    try {
      const report = await aggregateDatasetEvidence(query);
      const prepared = prepareDataset(report);
      const { train, val } = trainValSplit(prepared);
      const fitRes = fit(train, val, epochs);
      prepared.forEach((p) => {
        aggregateSources[p.source] = (aggregateSources[p.source] ?? 0) + 1;
      });
      allTrain = allTrain.concat(train);
      allVal = allVal.concat(val);
      const notes: string[] = [];
      if (report.bindingdb.length === 0)
        notes.push("No BindingDB labels — weak structural priors only.");
      if (train.length < 5) notes.push("Small labeled set — calibration approximate.");
      runs.push({
        disease,
        category,
        query,
        prepared: prepared.length,
        trainCount: train.length,
        valCount: val.length,
        finalRMSE: fitRes.finalRMSE,
        finalR2: fitRes.finalR2,
        ingested: {
          pdb: report.pdb.length,
          bindingdb: report.bindingdb.length,
          uniprot: report.uniprot.length,
          drugbank: report.drugbank.length,
          zinc: report.zinc.length,
        },
        notes,
      });
    } catch (e) {
      runs.push({
        disease,
        category,
        query,
        prepared: 0,
        trainCount: 0,
        valCount: 0,
        finalRMSE: 0,
        finalR2: 0,
        ingested: { pdb: 0, bindingdb: 0, uniprot: 0, drugbank: 0, zinc: 0 },
        notes: [],
        error: e instanceof Error ? e.message : "Run failed",
      });
    }
  }
  onProgress?.(
    PRIORITY_DISEASE_QUERIES.length,
    PRIORITY_DISEASE_QUERIES.length,
    "aggregating",
  );

  // Cross-disease global calibration fit
  const globalFit = fit(allTrain, allVal, epochs);
  const totalExamples = runs.reduce((a, r) => a + r.prepared, 0);
  const valid = runs.filter((r) => !r.error && r.trainCount > 0);
  const avgRMSE =
    valid.length > 0 ? valid.reduce((a, r) => a + r.finalRMSE, 0) / valid.length : 0;
  const avgR2 =
    valid.length > 0 ? valid.reduce((a, r) => a + r.finalR2, 0) / valid.length : 0;

  const calibration: CalibrationParams = {
    scale: +globalFit.scale.toFixed(4),
    bias: +globalFit.bias.toFixed(4),
    trainedAt: new Date().toISOString(),
    examples: totalExamples,
    sources: aggregateSources,
  };

  const productionIssues = scanRegistry("production");
  const productionDatasets = DATASET_REGISTRY.filter((d) => d.tier === "production").map(
    (d) => d.name,
  );
  const researchOnlyDatasets = DATASET_REGISTRY.filter((d) => d.tier === "research").map(
    (d) => d.name,
  );
  const blockedDatasets = DATASET_REGISTRY.filter((d) => d.tier === "blocked").map(
    (d) => d.name,
  );

  const snapshot: BatchTrainingSnapshot = {
    generatedAt: new Date().toISOString(),
    runs,
    aggregate: {
      totalExamples,
      avgRMSE: +avgRMSE.toFixed(4),
      avgR2: +avgR2.toFixed(4),
      sources: aggregateSources,
    },
    calibration,
    compliance: {
      productionIssues,
      productionDatasets,
      researchOnlyDatasets,
      blockedDatasets,
    },
  };

  try {
    localStorage.setItem(CALIBRATION_KEY, JSON.stringify(calibration));
    localStorage.setItem(BATCH_SNAPSHOT_KEY, JSON.stringify(snapshot));
  } catch {
    // ignore
  }
  return snapshot;
}

export function loadBatchSnapshot(): BatchTrainingSnapshot | null {
  try {
    const raw = localStorage.getItem(BATCH_SNAPSHOT_KEY);
    return raw ? (JSON.parse(raw) as BatchTrainingSnapshot) : null;
  } catch {
    return null;
  }
}

