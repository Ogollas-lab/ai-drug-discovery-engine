export interface TargetInfo {
  id: string;
  name: string;
  gene: string;
  mechanism: string;
  description: string;
  existingDrugs: string[];
  indications: string[];
  tags: string[];
}

export interface DiseaseInfo {
  id: string;
  name: string;
  category: string;
  targets: string[];
  description: string;
  icon: string;
}

export const TARGETS: TargetInfo[] = [
  {
    id: "egfr",
    name: "Epidermal Growth Factor Receptor",
    gene: "EGFR",
    mechanism: "EGFR is a transmembrane receptor that activates cell proliferation pathways. In cancer, mutations cause it to be always 'on,' driving uncontrolled growth. Drugs that block EGFR can slow or stop tumor growth.",
    description: "A key driver of cell growth. When mutated, it contributes to non-small cell lung cancer, colorectal, and head & neck cancers.",
    existingDrugs: ["Erlotinib", "Gefitinib", "Osimertinib", "Cetuximab"],
    indications: ["Non-Small Cell Lung Cancer", "Colorectal Cancer", "Head & Neck Cancer"],
    tags: ["oncology"],
  },
  {
    id: "ace2",
    name: "Angiotensin-Converting Enzyme 2",
    gene: "ACE2",
    mechanism: "ACE2 converts angiotensin II to angiotensin 1-7, which relaxes blood vessels and reduces inflammation. It's also the entry receptor for SARS-CoV-2. Targeting ACE2 interactions can modulate cardiovascular tone or block viral entry.",
    description: "Balances the renin-angiotensin system and serves as the SARS-CoV-2 receptor. Central to cardiovascular regulation and COVID-19 research.",
    existingDrugs: ["Lisinopril (ACE)", "Losartan (ARB)", "Recombinant ACE2"],
    indications: ["Hypertension", "Heart Failure", "COVID-19"],
    tags: ["cardiology", "infectious-disease"],
  },
  {
    id: "cox2",
    name: "Cyclooxygenase-2",
    gene: "PTGS2",
    mechanism: "COX-2 produces prostaglandins that cause inflammation, pain, and fever. Unlike COX-1 (which protects the stomach lining), COX-2 is induced at sites of injury. Selective COX-2 inhibitors reduce pain without as much GI risk — but may increase cardiovascular events.",
    description: "The inducible enzyme behind inflammation and pain. Target of NSAIDs and selective inhibitors (coxibs).",
    existingDrugs: ["Celecoxib", "Ibuprofen", "Naproxen", "Aspirin"],
    indications: ["Osteoarthritis", "Rheumatoid Arthritis", "Acute Pain"],
    tags: ["rheumatology", "pain"],
  },
  {
    id: "herg",
    name: "hERG Potassium Channel",
    gene: "KCNH2",
    mechanism: "hERG channels conduct potassium during cardiac repolarization. Drugs that inadvertently block hERG prolong the QT interval, risking torsades de pointes — a potentially fatal arrhythmia. Screening against hERG is a key safety gate in drug development.",
    description: "The cardiac safety gatekeeper. Blocking this channel is a major cause of drug-induced arrhythmia and withdrawal from market.",
    existingDrugs: ["Dofetilide (intentional)", "Terfenadine (withdrawn)"],
    indications: ["Cardiac Safety Screening"],
    tags: ["cardiology", "safety"],
  },
  {
    id: "braf",
    name: "B-Raf Proto-Oncogene",
    gene: "BRAF",
    mechanism: "BRAF is a kinase in the MAPK pathway that signals cells to grow. The V600E mutation makes it constitutively active, driving melanoma and other cancers. BRAF inhibitors block this mutant signal.",
    description: "A mutated kinase driving melanoma and other cancers. The BRAF V600E mutation is a prime drug target.",
    existingDrugs: ["Vemurafenib", "Dabrafenib", "Encorafenib"],
    indications: ["Melanoma", "Colorectal Cancer", "Thyroid Cancer"],
    tags: ["oncology"],
  },
  {
    id: "dpp4",
    name: "Dipeptidyl Peptidase-4",
    gene: "DPP4",
    mechanism: "DPP-4 breaks down incretin hormones (GLP-1, GIP) that stimulate insulin release after eating. Inhibiting DPP-4 keeps incretin levels high, improving blood sugar control without causing hypoglycemia.",
    description: "Regulates incretin hormones that control blood sugar. A well-established target for Type 2 diabetes management.",
    existingDrugs: ["Sitagliptin", "Saxagliptin", "Linagliptin", "Alogliptin"],
    indications: ["Type 2 Diabetes"],
    tags: ["endocrinology"],
  },
];

export const DISEASES: DiseaseInfo[] = [
  {
    id: "hypertension",
    name: "Hypertension",
    category: "Cardiology",
    targets: ["ace2"],
    description: "Sustained elevated blood pressure increasing risk of stroke, MI, and renal failure. First-line therapies include ACE inhibitors, ARBs, CCBs, and thiazide diuretics.",
    icon: "❤️",
  },
  {
    id: "breast-cancer",
    name: "Breast Cancer",
    category: "Oncology",
    targets: ["egfr", "braf"],
    description: "Most common cancer in women globally. Subtypes (ER+, HER2+, triple-negative) dictate treatment strategy. Targeted therapies have transformed HER2+ outcomes.",
    icon: "🎗️",
  },
  {
    id: "t2dm",
    name: "Type 2 Diabetes",
    category: "Endocrinology",
    targets: ["dpp4"],
    description: "Metabolic disorder with insulin resistance and progressive β-cell failure. Management includes lifestyle changes, metformin, DPP-4 inhibitors, GLP-1 agonists, and SGLT2 inhibitors.",
    icon: "🩸",
  },
  {
    id: "melanoma",
    name: "Melanoma",
    category: "Oncology",
    targets: ["braf", "egfr"],
    description: "Aggressive skin cancer with high metastatic potential. BRAF V600E mutation present in ~50% of cases. Combination of BRAF + MEK inhibitors and immunotherapy are standard of care.",
    icon: "🔬",
  },
  {
    id: "rheumatoid-arthritis",
    name: "Rheumatoid Arthritis",
    category: "Rheumatology",
    targets: ["cox2"],
    description: "Chronic autoimmune inflammatory arthropathy. NSAIDs for symptom relief, DMARDs (methotrexate) for disease modification, and biologics (TNF inhibitors) for refractory cases.",
    icon: "🦴",
  },
  {
    id: "covid19",
    name: "COVID-19",
    category: "Infectious Disease",
    targets: ["ace2"],
    description: "Respiratory illness caused by SARS-CoV-2 binding ACE2. Treatments include antivirals (nirmatrelvir/ritonavir), monoclonal antibodies, and supportive care.",
    icon: "🦠",
  },
];

export const CONCEPT_GLOSSARY: Record<string, { term: string; definition: string; clinicalExample: string }> = {
  ki: {
    term: "Ki (Inhibition Constant)",
    definition: "The concentration of inhibitor needed to occupy 50% of the target. Lower Ki = stronger binding.",
    clinicalExample: "Osimertinib has a Ki of ~1 nM for EGFR T790M, meaning tiny doses achieve strong target engagement.",
  },
  docking: {
    term: "Molecular Docking",
    definition: "A computational method that predicts how a small molecule fits into a protein's binding pocket, estimating the strength and orientation of binding.",
    clinicalExample: "Docking predicted that ivermectin could interact with SARS-CoV-2 main protease — though in-vitro concentrations were far above clinical doses.",
  },
  logp: {
    term: "LogP (Partition Coefficient)",
    definition: "Measures how much a drug prefers oil vs water. Higher LogP = more lipophilic (fat-soluble). Affects absorption, distribution, and metabolism.",
    clinicalExample: "Amiodarone has a very high LogP (~7), contributing to its extreme tissue accumulation and long half-life (~40–55 days).",
  },
  lipinski: {
    term: "Lipinski's Rule of Five",
    definition: "Guidelines predicting oral bioavailability: MW ≤500, LogP ≤5, H-bond donors ≤5, H-bond acceptors ≤10. Violations suggest poor oral absorption.",
    clinicalExample: "Cyclosporine violates all rules (MW 1202) but is still orally bioavailable — exceptions exist, especially for cyclic peptides.",
  },
  admet: {
    term: "ADMET",
    definition: "Absorption, Distribution, Metabolism, Excretion, and Toxicity — the five pillars of pharmacokinetics and safety that determine if a compound can become a drug.",
    clinicalExample: "Terfenadine (antihistamine) had good efficacy but lethal metabolism issues (CYP3A4 interactions → QT prolongation), leading to its withdrawal.",
  },
  tpsa: {
    term: "TPSA (Topological Polar Surface Area)",
    definition: "Sum of surface areas of polar atoms. Predicts membrane permeability and blood-brain barrier penetration. Low TPSA (<90 Å²) suggests good CNS access.",
    clinicalExample: "Levodopa (TPSA ~104 Å²) needs a carrier to cross the BBB, while caffeine (TPSA ~58 Å²) crosses freely.",
  },
  herg: {
    term: "hERG Liability",
    definition: "Risk that a compound blocks the hERG potassium channel, prolonging cardiac repolarization (QT interval) and potentially causing fatal arrhythmias.",
    clinicalExample: "Cisapride was withdrawn worldwide due to hERG blockade causing torsades de pointes, especially with CYP3A4 inhibitors.",
  },
  qsar: {
    term: "QSAR (Quantitative Structure-Activity Relationship)",
    definition: "Mathematical models that predict biological activity from chemical structure. Used to optimize compounds before synthesis.",
    clinicalExample: "QSAR models predicted that adding a fluorine atom to ciprofloxacin's structure would improve antimicrobial potency — which proved correct.",
  },
};

export const SAMPLE_MOLECULES: Record<string, { name: string; smiles: string; drugClass: string; tags: string[] }> = {
  "CC(=O)OC1=CC=CC=C1C(=O)O": { name: "Aspirin", smiles: "CC(=O)OC1=CC=CC=C1C(=O)O", drugClass: "NSAID", tags: ["pain", "cardiology"] },
  "CN1C=NC2=C1C(=O)N(C(=O)N2C)C": { name: "Caffeine", smiles: "CN1C=NC2=C1C(=O)N(C(=O)N2C)C", drugClass: "Xanthine", tags: ["CNS"] },
  "CC(C)CC1=CC=C(C=C1)C(C)C(O)=O": { name: "Ibuprofen", smiles: "CC(C)CC1=CC=C(C=C1)C(C)C(O)=O", drugClass: "NSAID", tags: ["pain", "rheumatology"] },
  "CC12CCC3C(C1CCC2O)CCC4=CC(=O)CCC34C": { name: "Testosterone", smiles: "CC12CCC3C(C1CCC2O)CCC4=CC(=O)CCC34C", drugClass: "Androgen", tags: ["endocrinology"] },
  "OC(=O)C1=CC=CC=C1O": { name: "Salicylic Acid", smiles: "OC(=O)C1=CC=CC=C1O", drugClass: "Keratolytic", tags: ["dermatology"] },
};

export interface MoleculeResult {
  smiles: string;
  name: string;
  drugClass: string;
  tags: string[];
  affinity: number;
  mw: number;
  logp: number;
  hDonors: number;
  hAcceptors: number;
  rotBonds: number;
  tpsa: number;
  violations: number;
  drugLike: boolean;
  admet: {
    solubility: "high" | "moderate" | "low";
    permeability: "high" | "moderate" | "low";
    cyp3a4: boolean;
    hergRisk: "low" | "moderate" | "high";
    hepatotoxicity: "low" | "moderate" | "high";
  };
  offTargets: { target: string; score: number }[];
  similarDrugs: string[];
  ddiWarnings: string[];
  organWarnings: string[];
}

export function generateMoleculeResult(smiles: string): MoleculeResult {
  let hash = 0;
  for (let i = 0; i < smiles.length; i++) hash = ((hash << 5) - hash + smiles.charCodeAt(i)) | 0;
  const h = Math.abs(hash);

  const known = SAMPLE_MOLECULES[smiles];
  const affinity = Math.round(((h % 100) / 100) * 100) / 100;
  const mw = known ? (smiles === "CC(=O)OC1=CC=CC=C1C(=O)O" ? 180.16 : Math.round((120 + (h % 400)) * 100) / 100) : Math.round((120 + (h % 400)) * 100) / 100;
  const logp = known ? (smiles === "CC(=O)OC1=CC=CC=C1C(=O)O" ? 1.31 : Math.round(((h % 600) / 100 - 2) * 100) / 100) : Math.round(((h % 600) / 100 - 2) * 100) / 100;
  const hDonors = h % 5;
  const hAcceptors = (h >> 3) % 10;
  const rotBonds = (h >> 5) % 8;
  const tpsa = Math.round(((h % 1500) / 10) * 100) / 100;
  const violations = (mw > 500 ? 1 : 0) + (logp > 5 ? 1 : 0) + (hDonors > 5 ? 1 : 0) + (hAcceptors > 10 ? 1 : 0);

  const offTargets = [
    { target: "hERG", score: Math.round(((h >> 2) % 100) / 100 * 100) / 100 },
    { target: "CYP3A4", score: Math.round(((h >> 4) % 100) / 100 * 100) / 100 },
    { target: "CYP2D6", score: Math.round(((h >> 6) % 100) / 100 * 100) / 100 },
    { target: "COX-1", score: Math.round(((h >> 8) % 100) / 100 * 100) / 100 },
    { target: "P-gp", score: Math.round(((h >> 10) % 100) / 100 * 100) / 100 },
  ];

  const hergScore = offTargets[0].score;
  const cyp3a4Score = offTargets[1].score;

  const ddiWarnings: string[] = [];
  const organWarnings: string[] = [];
  if (cyp3a4Score > 0.6) ddiWarnings.push("CYP3A4 interaction: may affect levels of statins, immunosuppressants, and some antiarrhythmics.");
  if (hergScore > 0.5) ddiWarnings.push("Caution with QT-prolonging agents (macrolides, antipsychotics, class III antiarrhythmics).");
  if (logp > 4) organWarnings.push("High lipophilicity: monitor for hepatic accumulation.");
  if (tpsa < 25) organWarnings.push("Very low TPSA: potential for high CNS penetration — watch for neurological side effects.");
  if (mw > 400) organWarnings.push("Higher MW compounds may have reduced renal clearance in impaired patients.");

  return {
    smiles,
    name: known?.name || `Compound-${(h % 9999).toString().padStart(4, "0")}`,
    drugClass: known?.drugClass || "Unknown",
    tags: known?.tags || [],
    affinity,
    mw,
    logp,
    hDonors,
    hAcceptors,
    rotBonds,
    tpsa,
    violations,
    drugLike: violations === 0,
    admet: {
      solubility: tpsa > 75 ? "high" : tpsa > 40 ? "moderate" : "low",
      permeability: tpsa < 90 ? "high" : tpsa < 140 ? "moderate" : "low",
      cyp3a4: cyp3a4Score > 0.5,
      hergRisk: hergScore > 0.7 ? "high" : hergScore > 0.4 ? "moderate" : "low",
      hepatotoxicity: logp > 4 ? "moderate" : "low",
    },
    offTargets,
    similarDrugs: known ? [known.name] : ["No close matches"],
    ddiWarnings,
    organWarnings,
  };
}
