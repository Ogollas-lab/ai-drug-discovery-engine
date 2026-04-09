/**
 * Educational Content for Drug Discovery Learning Hub
 * Structured guides, learning paths, and expanded glossary
 */

export interface LearningModule {
  id: string;
  title: string;
  icon: string;
  category: "fundamentals" | "techniques" | "clinical" | "african-health";
  difficulty: "beginner" | "intermediate" | "advanced";
  duration: string;
  description: string;
  sections: ModuleSection[];
}

export interface ModuleSection {
  title: string;
  content: string;
  keyPoints: string[];
  illustration?: string;
}

export interface GlossaryEntry {
  term: string;
  definition: string;
  category: string;
  clinicalRelevance: string;
  relatedTerms: string[];
}

export interface LearningPath {
  id: string;
  title: string;
  description: string;
  icon: string;
  modules: string[];
  estimatedHours: number;
}

// ─── Learning Paths ─────────────────────────────────────────────
export const LEARNING_PATHS: LearningPath[] = [
  {
    id: "drug-discovery-101",
    title: "Drug Discovery Fundamentals",
    description: "Start here. Learn the complete drug development pipeline from target identification to clinical trials.",
    icon: "🎓",
    modules: ["target-id", "hit-finding", "lead-optimization", "preclinical"],
    estimatedHours: 4,
  },
  {
    id: "computational-pharma",
    title: "Computational Pharmacology",
    description: "Master in-silico methods: molecular docking, QSAR modeling, ADMET prediction, and AI-driven drug design.",
    icon: "💻",
    modules: ["molecular-descriptors", "docking-sim", "qsar-models", "ai-drug-design"],
    estimatedHours: 6,
  },
  {
    id: "african-health",
    title: "African Health Drug Discovery",
    description: "Focus on diseases disproportionately affecting Africa: malaria, TB, HIV, sickle cell, and neglected tropical diseases.",
    icon: "🌍",
    modules: ["ntd-overview", "malaria-drugs", "tb-resistance", "pharmacogenomics-africa"],
    estimatedHours: 5,
  },
];

// ─── Learning Modules ───────────────────────────────────────────
export const LEARNING_MODULES: LearningModule[] = [
  {
    id: "target-id",
    title: "Target Identification & Validation",
    icon: "🎯",
    category: "fundamentals",
    difficulty: "beginner",
    duration: "45 min",
    description: "Understand how scientists identify and validate the molecular targets that drugs are designed to interact with.",
    sections: [
      {
        title: "What is a Drug Target?",
        content: "A drug target is a molecule in the body — usually a protein — that is directly involved in a disease process. The goal of target identification is to find the right molecule to modulate with a drug. Most targets are proteins: receptors, enzymes, ion channels, or transporters. About 60% of approved drugs target G-protein coupled receptors (GPCRs) or kinases.",
        keyPoints: [
          "Most drug targets are proteins (enzymes, receptors, ion channels)",
          "A valid target must be causally linked to the disease",
          "Target validation confirms that modulating the target changes disease outcome",
          "~60% of approved drugs target GPCRs or kinases",
        ],
      },
      {
        title: "Methods of Target Discovery",
        content: "Target identification combines genomics, proteomics, and clinical observation. Genome-Wide Association Studies (GWAS) link genetic variants to diseases. CRISPR knockout screens reveal which genes are essential for disease processes. Proteomics maps which proteins are upregulated in disease states. Clinical observations — such as the accidental discovery that finasteride (a prostate drug) grew hair — also reveal targets.",
        keyPoints: [
          "GWAS identifies genetic variants associated with disease risk",
          "CRISPR screens can systematically test gene function",
          "Proteomics reveals altered protein expression in disease",
          "Serendipitous clinical observations remain a source of new targets",
        ],
      },
      {
        title: "Validation Strategies",
        content: "Finding a potential target is only the beginning. Validation requires evidence that modulating the target genuinely affects the disease. Key validation methods include: genetic evidence (patients with target mutations show altered disease), animal knockout models, small molecule tool compounds, and antisense oligonucleotides. The strongest targets have multiple independent lines of evidence.",
        keyPoints: [
          "Genetic evidence (human mutations) is the strongest validation",
          "Animal models test whether target modulation changes disease",
          "Tool compounds provide pharmacological proof-of-concept",
          "Multiple evidence lines increase confidence in a target",
        ],
      },
    ],
  },
  {
    id: "hit-finding",
    title: "Hit Finding & Screening",
    icon: "🔍",
    category: "fundamentals",
    difficulty: "beginner",
    duration: "40 min",
    description: "Learn how initial drug candidates are discovered through high-throughput screening and virtual methods.",
    sections: [
      {
        title: "High-Throughput Screening (HTS)",
        content: "HTS tests millions of compounds against a target in automated assays. Robotic systems can test 100,000+ compounds per day using miniaturized 384- or 1536-well plates. A 'hit' is a compound showing activity above a threshold (typically <10 μM IC50). Hit rates are usually 0.1–1%, yielding hundreds to thousands of starting points.",
        keyPoints: [
          "HTS tests massive compound libraries (1–2 million) against a target",
          "Typical hit rate is 0.1–1% of compounds screened",
          "Hits require confirmation through dose-response curves",
          "False positives from aggregation or assay interference are common",
        ],
      },
      {
        title: "Virtual Screening",
        content: "Virtual screening uses computer models to predict which compounds might bind a target, dramatically reducing the number needing physical testing. Structure-based virtual screening uses the 3D structure of the target protein. Ligand-based methods use known active compounds as templates. AI/ML methods learn patterns from existing bioactivity data to predict new actives.",
        keyPoints: [
          "Structure-based: uses protein 3D structure (docking)",
          "Ligand-based: uses known active compounds as templates",
          "AI/ML: learns activity patterns from large datasets",
          "Virtual screening enriches hit rates 10–100× over random screening",
        ],
      },
      {
        title: "Fragment-Based Drug Discovery",
        content: "Fragment screening tests very small molecules (MW 120–250) that bind weakly but efficiently. Because fragments are small, a library of just 1,000–3,000 covers more chemical space than millions of larger molecules. Hits are detected by biophysical methods (X-ray crystallography, NMR, SPR). Fragments are then grown or linked to create potent drug-like molecules. Vemurafenib (melanoma) was discovered this way.",
        keyPoints: [
          "Fragments are tiny molecules (MW 120–250) with weak but efficient binding",
          "Small libraries (1,000–3,000) cover vast chemical space",
          "Detection requires biophysical methods (X-ray, NMR, SPR)",
          "Vemurafenib was discovered through fragment-based methods",
        ],
      },
    ],
  },
  {
    id: "lead-optimization",
    title: "Lead Optimization & Medicinal Chemistry",
    icon: "⚗️",
    category: "fundamentals",
    difficulty: "intermediate",
    duration: "50 min",
    description: "Explore how chemists modify hit compounds to improve potency, selectivity, and drug-like properties.",
    sections: [
      {
        title: "From Hit to Lead",
        content: "A hit compound rarely has all the properties needed for a drug. Lead optimization is the iterative process of modifying the chemical structure to improve potency (stronger target binding), selectivity (fewer off-target effects), pharmacokinetics (absorption, distribution, metabolism), and safety. Medicinal chemists make hundreds of analogs, testing each for improvements.",
        keyPoints: [
          "Hits need optimization of potency, selectivity, PK, and safety",
          "Structure-Activity Relationships (SAR) guide modifications",
          "Hundreds of analogs are typically synthesized and tested",
          "Multi-parameter optimization balances competing properties",
        ],
      },
      {
        title: "Key Properties to Optimize",
        content: "Drug-like properties follow patterns. Lipinski's Rule of Five predicts oral bioavailability (MW ≤500, LogP ≤5, HBD ≤5, HBA ≤10). Beyond Lipinski: metabolic stability (half-life >2h), low CYP inhibition (avoiding drug interactions), acceptable hERG safety (no cardiac risk), and appropriate lipophilicity (LogP 1–3 is the sweet spot for many targets).",
        keyPoints: [
          "Lipinski's Rule of Five: MW ≤500, LogP ≤5, HBD ≤5, HBA ≤10",
          "LogP sweet spot is typically 1–3 for oral drugs",
          "Metabolic stability ensures adequate drug exposure",
          "hERG safety is a critical go/no-go checkpoint",
        ],
      },
      {
        title: "Common Optimization Strategies",
        content: "Bioisosteric replacement swaps functional groups with similar shape/electronics (e.g., replacing a carboxylic acid with a tetrazole to improve metabolic stability). Fluorination increases metabolic stability by blocking vulnerable sites. Reducing molecular weight improves oral absorption. Adding solubilizing groups (morpholine, piperazine) improves aqueous solubility. Constraining flexible bonds improves selectivity.",
        keyPoints: [
          "Bioisosteres maintain activity while improving properties",
          "Fluorine atoms block metabolically vulnerable positions",
          "Reducing MW and LogP generally improves oral bioavailability",
          "Constraining rotatable bonds can improve selectivity and potency",
        ],
      },
    ],
  },
  {
    id: "preclinical",
    title: "Preclinical Development & Safety",
    icon: "🧪",
    category: "fundamentals",
    difficulty: "intermediate",
    duration: "45 min",
    description: "Understand preclinical testing requirements: ADMET profiling, toxicology studies, and the path to IND filing.",
    sections: [
      {
        title: "ADMET Profiling",
        content: "ADMET (Absorption, Distribution, Metabolism, Excretion, Toxicity) characterizes how a drug behaves in the body. Absorption: Caco-2 cell permeability predicts intestinal absorption. Distribution: plasma protein binding and tissue distribution determine where the drug goes. Metabolism: CYP450 enzyme profiling reveals metabolic pathways and interaction risks. Excretion: renal and hepatic clearance rates determine dosing frequency.",
        keyPoints: [
          "Caco-2 cells model intestinal absorption",
          "CYP450 profiling identifies metabolic liabilities and DDI risks",
          "Plasma protein binding affects free (active) drug concentration",
          "Clearance rate determines dosing frequency and accumulation risk",
        ],
      },
      {
        title: "Toxicology Studies",
        content: "Before human testing, regulatory agencies require comprehensive toxicology studies. Single-dose (acute) and repeat-dose studies identify target organs of toxicity. Genotoxicity assays (Ames test, micronucleus) assess DNA damage potential. Cardiovascular safety (hERG, telemetry in dogs) evaluates cardiac risk. Reproductive toxicity studies assess effects on fertility and fetal development.",
        keyPoints: [
          "Acute and repeat-dose studies identify organ toxicity",
          "Ames test screens for mutagenic potential",
          "hERG assay and in-vivo telemetry assess cardiac safety",
          "Two animal species (rodent + non-rodent) are typically required",
        ],
      },
      {
        title: "The IND Application",
        content: "The Investigational New Drug (IND) application is the gateway to human clinical trials. It includes: preclinical safety data (toxicology), manufacturing information (drug substance and drug product), clinical protocol (phase I trial design), and investigator qualifications. Regulatory review takes ~30 days. Approximately 90% of INDs proceed without clinical hold.",
        keyPoints: [
          "IND contains: safety data, manufacturing info, clinical protocol",
          "FDA reviews IND within 30 days",
          "~90% of INDs proceed without hold",
          "Phase I trials test safety in 20–100 healthy volunteers",
        ],
      },
    ],
  },
  {
    id: "molecular-descriptors",
    title: "Molecular Descriptors & Properties",
    icon: "📊",
    category: "techniques",
    difficulty: "beginner",
    duration: "35 min",
    description: "Learn the key molecular descriptors used in drug design: molecular weight, LogP, TPSA, and beyond.",
    sections: [
      {
        title: "Physicochemical Properties",
        content: "Molecular descriptors quantify chemical properties that determine drug behavior. Molecular Weight (MW) correlates with oral absorption (best <500 Da). Lipophilicity (LogP) measures oil-vs-water preference — drugs need enough to cross membranes (LogP >0) but not so much they accumulate in fat (LogP <5). Polar Surface Area (TPSA) predicts membrane permeability and blood-brain barrier penetration.",
        keyPoints: [
          "MW <500 Da: better oral absorption (Lipinski's Rule)",
          "LogP 1–3: optimal range for most oral drugs",
          "TPSA <140 Å²: good intestinal absorption",
          "TPSA <90 Å²: potential for blood-brain barrier penetration",
        ],
      },
      {
        title: "Hydrogen Bonding & Flexibility",
        content: "Hydrogen bond donors (HBD) and acceptors (HBA) affect solubility and permeability in opposite ways. Too many HBDs (>5) reduce membrane permeation. Rotatable bonds measure molecular flexibility — more flexibility means more conformational entropy penalty upon binding, reducing potency. The sweet spot is <7 rotatable bonds for oral drugs.",
        keyPoints: [
          "HBD ≤5 and HBA ≤10 for oral bioavailability (Lipinski)",
          "Rotatable bonds ≤7 for good oral absorption (Veber's rules)",
          "Intramolecular H-bonds can mask polarity and improve permeability",
          "Macrocycles achieve oral bioavailability by reducing flexibility",
        ],
      },
    ],
  },
  {
    id: "ntd-overview",
    title: "Neglected Tropical Diseases: An Overview",
    icon: "🌍",
    category: "african-health",
    difficulty: "beginner",
    duration: "40 min",
    description: "Understand NTDs, their impact on Africa, and the unique challenges of drug development for resource-limited settings.",
    sections: [
      {
        title: "What are Neglected Tropical Diseases?",
        content: "Neglected Tropical Diseases (NTDs) are a group of 20 conditions recognized by the WHO that predominantly affect populations in tropical and subtropical regions. They are 'neglected' because they receive disproportionately low research funding relative to their disease burden. Over 1.7 billion people require treatment for NTDs. In Africa, NTDs cause more DALYs (disability-adjusted life years) than malaria or tuberculosis combined.",
        keyPoints: [
          "20 WHO-recognized NTDs affect 1.7 billion people globally",
          "Africa bears the highest NTD burden worldwide",
          "NTDs receive <5% of global health R&D funding",
          "Co-infections are common (malaria + NTD + HIV)",
        ],
      },
      {
        title: "Drug Development Challenges",
        content: "Developing drugs for NTDs faces unique challenges: low commercial incentive (affected populations cannot afford Western drug prices), requirement for oral formulations (no cold chain or IV infrastructure), need for short treatment courses (patients can't return for follow-up), and limited clinical trial infrastructure in endemic regions. Public-private partnerships like DNDi and MMV have pioneered innovative funding models.",
        keyPoints: [
          "Low commercial return discourages pharmaceutical investment",
          "Oral, thermostable, short-course treatments are essential",
          "Cost target: <$1/treatment for mass drug administration",
          "DNDi, MMV, and GHIT Fund bridge the R&D funding gap",
        ],
      },
      {
        title: "Key NTDs in Africa",
        content: "The most impactful NTDs in Africa include: Schistosomiasis (240M infected, causes liver fibrosis), Leishmaniasis (fatal visceral form in East Africa), Human African Trypanosomiasis (sleeping sickness, near elimination), Lymphatic Filariasis (elephantiasis), Onchocerciasis (river blindness), and Soil-transmitted Helminths. Praziquantel (schistosomiasis) and ivermectin (onchocerciasis) have been transformative but face resistance concerns.",
        keyPoints: [
          "Schistosomiasis: most prevalent NTD in Africa (240M infected)",
          "Visceral leishmaniasis is fatal without treatment",
          "HAT near elimination thanks to fexinidazole (first all-oral treatment)",
          "Mass drug administration programs treat hundreds of millions annually",
        ],
      },
    ],
  },
  {
    id: "pharmacogenomics-africa",
    title: "Pharmacogenomics in African Populations",
    icon: "🧬",
    category: "african-health",
    difficulty: "advanced",
    duration: "50 min",
    description: "Explore how genetic diversity in African populations affects drug response, metabolism, and safety.",
    sections: [
      {
        title: "Africa's Unique Genetic Diversity",
        content: "Africa has the highest genetic diversity of any continent — a reflection of humanity's origin there. This diversity has profound implications for drug metabolism. CYP2D6, a key drug-metabolizing enzyme, has over 100 alleles, many unique to African populations. The CYP2B6*6 allele (affecting efavirenz metabolism) occurs at 30–50% frequency in some African populations vs. 15–25% in Europeans.",
        keyPoints: [
          "Africa has the highest human genetic diversity globally",
          "CYP2D6 ultra-rapid metabolizers are more common in East Africa",
          "CYP2B6*6 (efavirenz toxicity risk) is highly prevalent in Africa",
          "Most pharmacogenomics research has been conducted in European populations",
        ],
      },
      {
        title: "Clinical Impact",
        content: "Genetic variation directly affects drug safety and efficacy. Efavirenz: CYP2B6 slow metabolizers (common in Africa) accumulate toxic levels, causing CNS side effects. Warfarin: VKORC1 and CYP2C9 variants require different dosing in African vs. European patients. Codeine: CYP2D6 ultra-rapid metabolizers (higher frequency in East Africa) convert codeine to morphine too quickly, causing toxicity. These examples underscore why drug development must include diverse populations.",
        keyPoints: [
          "Efavirenz dosing should consider CYP2B6 genotype",
          "Warfarin dosing algorithms need African-specific data",
          "Codeine can be dangerous in CYP2D6 ultra-rapid metabolizers",
          "Drug trials must include African genetic diversity",
        ],
      },
      {
        title: "Implications for Drug Design",
        content: "Designing drugs for African populations requires attention to metabolic pathway diversity. Strategies include: avoiding exclusive dependence on polymorphic CYP enzymes, designing prodrugs that use multiple activation pathways, considering G6PD deficiency (prevalent in malaria-endemic regions) when designing oxidative drugs, and testing compounds against African-prevalent HLA alleles for hypersensitivity risk.",
        keyPoints: [
          "Avoid single CYP-dependent metabolism for drugs used in Africa",
          "G6PD deficiency screening needed for oxidative drugs (primaquine, dapsone)",
          "HLA-B*57:01 testing prevents abacavir hypersensitivity",
          "Multi-pathway metabolism reduces pharmacogenomic risk",
        ],
      },
    ],
  },
];

// ─── Expanded Glossary ──────────────────────────────────────────
export const EXPANDED_GLOSSARY: GlossaryEntry[] = [
  {
    term: "Binding Affinity (Ki/Kd)",
    definition: "The strength of interaction between a drug and its target. Measured as Ki (inhibition constant) or Kd (dissociation constant). Lower values = stronger binding. Nanomolar (nM) range is typical for drug candidates.",
    category: "Pharmacology",
    clinicalRelevance: "Determines the dose needed for therapeutic effect. Drugs with very high affinity (low Ki) can be dosed less frequently.",
    relatedTerms: ["IC50", "EC50", "Dose-Response"],
  },
  {
    term: "ADMET",
    definition: "Absorption, Distribution, Metabolism, Excretion, and Toxicity — the five key pharmacokinetic and safety parameters that determine whether a compound can become a drug.",
    category: "Pharmacokinetics",
    clinicalRelevance: "Poor ADMET properties are the #1 reason drug candidates fail. Early ADMET prediction saves years of development time.",
    relatedTerms: ["Bioavailability", "Half-life", "Clearance", "Volume of Distribution"],
  },
  {
    term: "Blood-Brain Barrier (BBB)",
    definition: "A selective barrier formed by endothelial cells in brain capillaries that restricts passage of most molecules from blood to brain. Drugs targeting the CNS must be designed to cross the BBB.",
    category: "Drug Design",
    clinicalRelevance: "For CNS drugs (antidepressants, anticonvulsants), BBB penetration is essential. For non-CNS drugs, BBB penetration may cause unwanted neurological side effects.",
    relatedTerms: ["TPSA", "LogP", "P-glycoprotein", "Efflux Transporters"],
  },
  {
    term: "Lipinski's Rule of Five",
    definition: "Guidelines for predicting oral bioavailability: MW ≤500, LogP ≤5, H-bond donors ≤5, H-bond acceptors ≤10. Compounds violating ≥2 rules are unlikely to be orally bioavailable.",
    category: "Drug Design",
    clinicalRelevance: "Oral drugs are preferred because patients can take them at home. Lipinski's rules help filter out compounds that won't work as oral medications.",
    relatedTerms: ["Veber's Rules", "Beyond Rule of Five", "Oral Bioavailability"],
  },
  {
    term: "hERG Channel",
    definition: "The human Ether-à-go-go Related Gene encodes a potassium channel critical for cardiac repolarization. Drugs that block hERG can cause QT prolongation and fatal arrhythmias.",
    category: "Safety",
    clinicalRelevance: "hERG screening is mandatory before clinical trials. Multiple marketed drugs have been withdrawn due to hERG blockade (terfenadine, cisapride, grepafloxacin).",
    relatedTerms: ["QT Prolongation", "Torsades de Pointes", "Cardiac Safety", "ICH S7B"],
  },
  {
    term: "IC50",
    definition: "The concentration of compound needed to inhibit 50% of target activity. Unlike Ki, IC50 depends on assay conditions (substrate concentration, incubation time). Used to compare compound potency within the same assay.",
    category: "Pharmacology",
    clinicalRelevance: "IC50 values guide dose selection. A 10-fold improvement in IC50 during optimization can translate to a 10-fold lower clinical dose.",
    relatedTerms: ["Ki", "EC50", "Selectivity Index"],
  },
  {
    term: "Prodrug",
    definition: "An inactive compound that is metabolically converted to the active drug inside the body. Designed to improve absorption, reduce toxicity, or target specific tissues.",
    category: "Drug Design",
    clinicalRelevance: "Tenofovir alafenamide (TAF) is a prodrug that delivers tenofovir more efficiently to target cells, allowing lower doses and less kidney toxicity than the older formulation (TDF).",
    relatedTerms: ["Metabolism", "Bioactivation", "First-Pass Effect"],
  },
  {
    term: "Selectivity Index",
    definition: "The ratio between a drug's activity against its intended target vs. off-targets. Higher selectivity = fewer side effects. Calculated as IC50(off-target) / IC50(target).",
    category: "Safety",
    clinicalRelevance: "A selectivity index >100-fold is generally desired. COX-2 selective inhibitors (celecoxib) were designed for >300-fold selectivity over COX-1 to reduce GI bleeding.",
    relatedTerms: ["Off-Target Effects", "Therapeutic Index", "Side Effects"],
  },
  {
    term: "Therapeutic Index",
    definition: "The ratio between the toxic dose and the therapeutic dose (TD50/ED50). A wide therapeutic index means a drug is safe over a broad dose range. A narrow index requires careful dose monitoring.",
    category: "Safety",
    clinicalRelevance: "Warfarin has a very narrow therapeutic index — small dose changes cause either bleeding or clotting. Digoxin, lithium, and aminoglycosides also require therapeutic drug monitoring.",
    relatedTerms: ["Dose-Response", "ED50", "TD50", "Therapeutic Drug Monitoring"],
  },
  {
    term: "G6PD Deficiency",
    definition: "An X-linked genetic enzyme deficiency affecting ~400 million people worldwide, with highest prevalence in malaria-endemic regions of Africa. Oxidative drugs (primaquine, dapsone, rasburicase) can trigger hemolytic anemia in G6PD-deficient patients.",
    category: "Pharmacogenomics",
    clinicalRelevance: "Before prescribing primaquine for malaria or dapsone for leprosy/PCP prophylaxis in African patients, G6PD testing is required. Tafenoquine's label mandates G6PD testing.",
    relatedTerms: ["Pharmacogenomics", "Hemolytic Anemia", "Oxidative Stress"],
  },
];

// ─── Quick Facts for sidebar cards ──────────────────────────────
export const QUICK_FACTS: string[] = [
  "It takes an average of 10–15 years and $2.6 billion to bring a drug from discovery to market.",
  "Only 1 in 10,000 compounds discovered in the lab will eventually become an approved drug.",
  "Africa carries 25% of the global disease burden but accounts for less than 2% of global drug production.",
  "The first antimalarial, quinine, was extracted from the bark of the cinchona tree in South America.",
  "Aspirin (acetylsalicylic acid) was derived from willow bark and has been used for pain relief for over 3,500 years.",
  "Penicillin was discovered by accident when Alexander Fleming noticed mold killing bacteria in a petri dish.",
  "CRISPR gene editing technology was adapted from a bacterial immune defense system.",
  "The human body has approximately 20,000 protein-coding genes, but only ~3,000 are considered 'druggable'.",
  "Artemisinin, the most important antimalarial drug, was discovered from traditional Chinese medicine (sweet wormwood).",
  "HIV/AIDS treatment has transformed from a death sentence to a manageable chronic condition through antiretroviral therapy.",
  "The COVID-19 mRNA vaccines were developed in under a year — the fastest vaccine development in history.",
  "Sickle cell disease is the most common genetic disorder in Africa, with ~300,000 affected births annually.",
];
