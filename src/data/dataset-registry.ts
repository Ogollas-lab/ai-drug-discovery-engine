/**
 * Dataset License & Governance Registry
 *
 * Central catalogue of biomedical datasets and research hubs ingested into
 * the AI Drug Success Predictor training pipeline. Powers automated license
 * validation, provenance tracking, and research/commercial separation.
 */

export type LicenseType =
  | "Apache-2.0"
  | "MIT"
  | "CC-BY-4.0"
  | "CC-BY-SA-4.0"
  | "CC0"
  | "Open-Access (Custom)"
  | "Research-Only"
  | "Restricted"
  | "Unknown";

export type UsageTier = "production" | "research" | "experimental" | "blocked";

export interface DatasetEntry {
  id: string;
  name: string;
  source: string;
  category:
    | "Genomics"
    | "Medical Imaging"
    | "Bioactivity"
    | "Clinical"
    | "Structural"
    | "Index/Search"
    | "Foundation Model";
  license: LicenseType;
  url: string;
  description: string;
  /** approximate sample count for tracking */
  samples: number;
  /** SemVer-style version captured at ingest */
  version: string;
  /** Citation requirement string */
  citation: string;
  /** Commercial usage permission */
  commercialUse: "permitted" | "with-attribution" | "research-only" | "prohibited";
  /** Where this dataset is allowed in the pipeline */
  tier: UsageTier;
  /** ISO date last validated */
  lastValidated: string;
  /** Optional notes (resistance, ethics, restrictions) */
  notes?: string;
}

/** Human-readable license compatibility for commercial AI products. */
export const COMMERCIAL_SAFE_LICENSES: LicenseType[] = [
  "Apache-2.0",
  "MIT",
  "CC-BY-4.0",
  "CC0",
  "Open-Access (Custom)",
];

export const RESEARCH_ONLY_LICENSES: LicenseType[] = [
  "CC-BY-SA-4.0",
  "Research-Only",
];

export const BLOCKED_LICENSES: LicenseType[] = ["Restricted", "Unknown"];

export const DATASET_REGISTRY: DatasetEntry[] = [
  // ---------- Foundation models / Genomics LLMs ----------
  {
    id: "opengenomellm",
    name: "OpenGenomeLLM Datasets",
    source: "OpenGenomeLLM Consortium",
    category: "Foundation Model",
    license: "Apache-2.0",
    url: "https://huggingface.co/datasets/OpenGenome",
    description:
      "Genomic language modeling corpus covering >100B DNA tokens across bacteria, parasites, and human reference genomes. Used for pre-training genomic foundation models.",
    samples: 100_000_000_000,
    version: "2025.03",
    citation: "OpenGenome Consortium (2025). OpenGenomeLLM Pretraining Corpus.",
    commercialUse: "permitted",
    tier: "production",
    lastValidated: "2026-04-12",
    notes: "Compatible with downstream commercial fine-tuning under Apache-2.0.",
  },
  {
    id: "stanford-aimi",
    name: "Stanford AIMI Dataset Index",
    source: "Stanford AIMI Center",
    category: "Medical Imaging",
    license: "CC-BY-4.0",
    url: "https://aimi.stanford.edu/datasets",
    description:
      "Curated index of medical imaging datasets (CheXpert, MURA, MedMNIST, etc.) used for clinical AI benchmarking and multimodal healthcare research.",
    samples: 4_500_000,
    version: "2025-Q4",
    citation: "Stanford AIMI Center. Medical Imaging Dataset Index.",
    commercialUse: "with-attribution",
    tier: "production",
    lastValidated: "2026-04-12",
    notes: "Each sub-dataset requires its own attribution; some subsets are research-only.",
  },
  {
    id: "datamed",
    name: "DataMed Biomedical Dataset Search",
    source: "NIH bioCADDIE",
    category: "Index/Search",
    license: "Open-Access (Custom)",
    url: "https://datamed.org/",
    description:
      "Federated discovery index across >70 biomedical data repositories — used for metadata-driven dataset discovery and provenance tracking.",
    samples: 2_400_000,
    version: "2025.10",
    citation: "Chen X. et al. (2018). DataMed — an open source discovery index.",
    commercialUse: "with-attribution",
    tier: "production",
    lastValidated: "2026-04-12",
  },
  {
    id: "medimg",
    name: "MedImg Database",
    source: "MedImg Consortium",
    category: "Medical Imaging",
    license: "CC-BY-4.0",
    url: "https://medpix.nlm.nih.gov/",
    description:
      "Open medical imaging database for disease classification and diagnostic AI training across radiology, pathology, and dermatology modalities.",
    samples: 59_000,
    version: "2025.08",
    citation: "U.S. National Library of Medicine — MedPix/MedImg Database.",
    commercialUse: "with-attribution",
    tier: "production",
    lastValidated: "2026-04-12",
  },
  // ---------- Bioactivity / structural ----------
  {
    id: "chembl",
    name: "ChEMBL Bioactivity Database",
    source: "EMBL-EBI",
    category: "Bioactivity",
    license: "CC-BY-SA-4.0",
    url: "https://www.ebi.ac.uk/chembl/",
    description:
      "Curated bioactivities (IC50, Ki, Kd) across >2.4M compounds and 15K targets. Foundation of binding-affinity training set.",
    samples: 20_300_000,
    version: "ChEMBL_34",
    citation: "Mendez D. et al. (2024). ChEMBL_34 release.",
    commercialUse: "with-attribution",
    tier: "research",
    lastValidated: "2026-04-12",
    notes: "Share-alike (CC-BY-SA) restricts derivative redistribution under same license.",
  },
  {
    id: "bindingdb",
    name: "BindingDB",
    source: "UCSD",
    category: "Bioactivity",
    license: "CC-BY-4.0",
    url: "https://www.bindingdb.org/",
    description:
      "Public, web-accessible measured binding affinities. Used for validation and continuous training.",
    samples: 2_900_000,
    version: "2025.11",
    citation: "Gilson M.K. et al. (2016). BindingDB.",
    commercialUse: "with-attribution",
    tier: "production",
    lastValidated: "2026-04-12",
  },
  {
    id: "pdb",
    name: "RCSB Protein Data Bank",
    source: "RCSB",
    category: "Structural",
    license: "CC0",
    url: "https://www.rcsb.org/",
    description:
      "Open archive of 3D structures of proteins, nucleic acids, and complex assemblies. Drives docking and structural compatibility checks.",
    samples: 220_000,
    version: "Live",
    citation: "Berman H.M. et al. (2000). The Protein Data Bank.",
    commercialUse: "permitted",
    tier: "production",
    lastValidated: "2026-04-12",
  },
  {
    id: "uniprot",
    name: "UniProt Knowledgebase",
    source: "UniProt Consortium",
    category: "Genomics",
    license: "CC-BY-4.0",
    url: "https://www.uniprot.org/",
    description:
      "Comprehensive protein sequence and functional annotation resource feeding the target-grounding layer.",
    samples: 250_000_000,
    version: "2025_05",
    citation: "UniProt Consortium (2025). UniProt: the universal protein knowledgebase.",
    commercialUse: "with-attribution",
    tier: "production",
    lastValidated: "2026-04-12",
  },
  {
    id: "tritrypdb",
    name: "TriTrypDB",
    source: "VEuPathDB",
    category: "Genomics",
    license: "CC-BY-4.0",
    url: "https://tritrypdb.org/",
    description:
      "Genomic and functional resource for trypanosomatids (Leishmania, Trypanosoma) — supports VL drug-resistance prediction.",
    samples: 140_000,
    version: "2025.09",
    citation: "Aslett M. et al. (2010). TriTrypDB.",
    commercialUse: "with-attribution",
    tier: "production",
    lastValidated: "2026-04-12",
  },
  // ---------- Indexes / clinical ----------
  {
    id: "who-blueprint",
    name: "WHO R&D Blueprint",
    source: "WHO",
    category: "Clinical",
    license: "Open-Access (Custom)",
    url: "https://www.who.int/teams/blueprint",
    description:
      "Priority pathogen target product profiles (RVF, Ebola, Lassa, Nipah). Used for disease-specific scoring constraints.",
    samples: 0,
    version: "2025",
    citation: "WHO R&D Blueprint (2025).",
    commercialUse: "with-attribution",
    tier: "production",
    lastValidated: "2026-04-12",
  },
  {
    id: "reseqtb",
    name: "ReSeqTB Mutation Catalog",
    source: "WHO/CRyPTIC",
    category: "Clinical",
    license: "Open-Access (Custom)",
    url: "https://platform.reseqtb.org/",
    description:
      "Catalogued resistance mutations for major TB drugs — feeds the MDR-TB resistance prediction module.",
    samples: 38_000,
    version: "2024.2",
    citation: "WHO Global TB Programme (2024). Catalogue of mutations in M. tuberculosis.",
    commercialUse: "research-only",
    tier: "research",
    lastValidated: "2026-04-12",
  },
  {
    id: "mycetos",
    name: "MycetOS Open Source Project",
    source: "MycetOS",
    category: "Bioactivity",
    license: "CC-BY-4.0",
    url: "https://www.mycetos.org/",
    description:
      "Open-source mycetoma drug discovery dataset — antifungal screens against M. mycetomatis.",
    samples: 350,
    version: "2025.04",
    citation: "MycetOS Consortium (2025).",
    commercialUse: "with-attribution",
    tier: "production",
    lastValidated: "2026-04-12",
  },
];

/** Determine tier from license. */
export function tierForLicense(license: LicenseType): UsageTier {
  if (BLOCKED_LICENSES.includes(license)) return "blocked";
  if (COMMERCIAL_SAFE_LICENSES.includes(license)) return "production";
  if (RESEARCH_ONLY_LICENSES.includes(license)) return "research";
  return "experimental";
}

/** Automated compliance scan — returns issues per dataset. */
export interface ComplianceIssue {
  datasetId: string;
  severity: "info" | "warning" | "critical";
  message: string;
}

export function scanRegistry(targetTier: UsageTier = "production"): ComplianceIssue[] {
  const issues: ComplianceIssue[] = [];
  for (const d of DATASET_REGISTRY) {
    const computedTier = tierForLicense(d.license);
    if (BLOCKED_LICENSES.includes(d.license)) {
      issues.push({
        datasetId: d.id,
        severity: "critical",
        message: `License "${d.license}" is blocked — exclude from training.`,
      });
      continue;
    }
    if (targetTier === "production" && computedTier !== "production") {
      issues.push({
        datasetId: d.id,
        severity: "warning",
        message: `License "${d.license}" is not production-safe. Restrict to research models.`,
      });
    }
    if (!d.citation) {
      issues.push({
        datasetId: d.id,
        severity: "info",
        message: "Missing citation string — required for attribution.",
      });
    }
    const ageDays =
      (Date.now() - new Date(d.lastValidated).getTime()) / (1000 * 60 * 60 * 24);
    if (ageDays > 180) {
      issues.push({
        datasetId: d.id,
        severity: "warning",
        message: `License last validated ${Math.round(ageDays)} days ago — re-verify.`,
      });
    }
  }
  return issues;
}

/** Provenance record for a single training sample. */
export interface ProvenanceRecord {
  sampleId: string;
  datasetId: string;
  collectedAt: string;
  pipelineSteps: string[];
  trainingRunId?: string;
}

/** Build a synthetic provenance trail from a dataset slug (deterministic demo). */
export function buildProvenanceTrail(datasetId: string, count = 5): ProvenanceRecord[] {
  const steps = [
    "ingest:fetch",
    "validate:schema",
    "validate:license",
    "transform:normalize-units",
    "transform:dedupe",
    "split:train/val/test",
    "register:training-run",
  ];
  return Array.from({ length: count }, (_, i) => ({
    sampleId: `${datasetId.toUpperCase()}-${(i + 1).toString().padStart(5, "0")}`,
    datasetId,
    collectedAt: new Date(Date.now() - (i + 1) * 86400_000).toISOString(),
    pipelineSteps: steps,
    trainingRunId: `run-${datasetId}-2026-w${18 - i}`,
  }));
}
