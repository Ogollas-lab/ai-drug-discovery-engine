/**
 * Disease-Specific AI Models for African Health Challenges
 * Each disease has curated targets, reference compounds, scoring adjustments,
 * and dataset references from public biomedical databases.
 */

export interface DiseaseModel {
  id: string;
  name: string;
  icon: string;
  category: string;
  region: string;
  description: string;
  epidemiology: string;
  prevalence: string;
  /** Primary molecular targets for this disease */
  targets: DiseaseTarget[];
  /** Known reference drugs with PubChem-fetchable names */
  referenceDrugs: string[];
  /** Scoring weight adjustments for this disease context */
  scoringProfile: ScoringProfile;
  /** Disease-specific risk flags to check */
  riskChecks: RiskCheck[];
  /** Public dataset references */
  datasets: DatasetReference[];
  /** Disease-specific recommendations */
  contextualGuidance: string[];
}

export interface DiseaseTarget {
  name: string;
  gene: string;
  uniprotId: string;
  mechanism: string;
  druggability: "high" | "moderate" | "low";
}

export interface ScoringProfile {
  /** Weight multiplier for efficacy vs safety (default 0.55/0.45) */
  efficacyWeight: number;
  safetyWeight: number;
  /** Additional feature weights */
  bindingAffinityImportance: number;
  metabolicStabilityImportance: number;
  /** Acceptable MW range for this disease */
  mwRange: [number, number];
  /** Acceptable LogP range */
  logpRange: [number, number];
  /** TPSA threshold for permeability needs */
  tpsaMax: number;
  /** Whether BBB penetration matters */
  requiresBBBPenetration: boolean;
  /** Oral bioavailability importance (tropical diseases need oral drugs) */
  oralBioavailabilityPriority: "critical" | "high" | "moderate";
}

export interface RiskCheck {
  condition: string;
  flag: string;
  severity: "critical" | "warning" | "info";
}

export interface DatasetReference {
  name: string;
  source: string;
  url: string;
  description: string;
  compounds: number;
}

export const DISEASE_MODELS: DiseaseModel[] = [
  {
    id: "malaria",
    name: "Malaria",
    icon: "🦟",
    category: "Parasitic Infection",
    region: "Sub-Saharan Africa",
    description: "Plasmodium falciparum malaria remains the leading cause of infectious disease mortality in Africa. Drug resistance to chloroquine and sulfadoxine-pyrimethamine drives urgent need for new antimalarials.",
    epidemiology: "~247 million cases annually, >600,000 deaths, 95% in Africa (WHO 2022)",
    prevalence: "Endemic in 87 countries, highest burden in Nigeria, DRC, Uganda, Mozambique",
    targets: [
      {
        name: "Plasmodium falciparum Dihydrofolate Reductase",
        gene: "PfDHFR",
        uniprotId: "P13922",
        mechanism: "Catalyzes folate metabolism essential for parasite DNA synthesis. Mutations (S108N, N51I, C59R) confer pyrimethamine resistance.",
        druggability: "high",
      },
      {
        name: "PfATP4 (P-type ATPase)",
        gene: "PfATP4",
        uniprotId: "Q8IFM6",
        mechanism: "Sodium pump maintaining parasite ion homeostasis. Spiroindolones (cipargamin) disrupt Na+ balance, killing the parasite.",
        druggability: "high",
      },
      {
        name: "Plasmepsin V",
        gene: "PMV",
        uniprotId: "Q8I6S5",
        mechanism: "Aspartic protease that processes proteins exported to the host red blood cell. Essential for parasite virulence.",
        druggability: "moderate",
      },
    ],
    referenceDrugs: ["Artemisinin", "Chloroquine", "Mefloquine", "Lumefantrine", "Atovaquone", "Pyrimethamine"],
    scoringProfile: {
      efficacyWeight: 0.60,
      safetyWeight: 0.40,
      bindingAffinityImportance: 0.35,
      metabolicStabilityImportance: 0.25,
      mwRange: [150, 500],
      logpRange: [0, 5],
      tpsaMax: 140,
      requiresBBBPenetration: false,
      oralBioavailabilityPriority: "critical",
    },
    riskChecks: [
      { condition: "mw > 500", flag: "MW >500 Da limits oral bioavailability — critical for resource-limited settings", severity: "critical" },
      { condition: "logp > 5", flag: "High lipophilicity reduces aqueous solubility needed for tropical formulations", severity: "warning" },
      { condition: "tpsa > 140", flag: "Poor oral absorption — injectable-only drugs are impractical in endemic regions", severity: "critical" },
      { condition: "rotBonds > 10", flag: "High flexibility reduces metabolic stability in pediatric populations", severity: "warning" },
    ],
    datasets: [
      { name: "ChEMBL Malaria", source: "ChEMBL", url: "https://www.ebi.ac.uk/chembl/", description: "Curated bioactivity data for P. falciparum assays", compounds: 32847 },
      { name: "MMV Malaria Box", source: "Medicines for Malaria Venture", url: "https://www.mmv.org/mmv-open/malaria-box", description: "400 diverse compounds with confirmed antimalarial activity", compounds: 400 },
      { name: "PubChem BioAssay AID 2302", source: "PubChem", url: "https://pubchem.ncbi.nlm.nih.gov/bioassay/2302", description: "P. falciparum growth inhibition screening", compounds: 305538 },
    ],
    contextualGuidance: [
      "Prioritize oral formulations — most malaria treatment occurs in community health settings without IV access",
      "Consider pediatric dosing — children under 5 account for 80% of malaria deaths",
      "Check for resistance mutations in PfDHFR (S108N, N51I, C59R) and PfKelch13 (C580Y)",
      "Combination therapy required (ACT standard) — evaluate partner drug compatibility",
      "Thermal stability important — cold chain unavailable in most endemic areas",
    ],
  },
  {
    id: "tuberculosis",
    name: "Tuberculosis",
    icon: "🫁",
    category: "Bacterial Infection",
    region: "Sub-Saharan Africa, South Asia",
    description: "Mycobacterium tuberculosis infection with growing multidrug-resistant (MDR-TB) and extensively drug-resistant (XDR-TB) strains. Africa bears 25% of the global TB burden despite having 17% of the world population.",
    epidemiology: "~10.6 million new cases, 1.3 million deaths annually. HIV-TB coinfection is a major driver in Africa.",
    prevalence: "Highest rates in South Africa, Mozambique, Nigeria, DRC, Ethiopia",
    targets: [
      {
        name: "InhA (Enoyl-ACP Reductase)",
        gene: "inhA",
        uniprotId: "P9WGR1",
        mechanism: "Essential enzyme in mycolic acid synthesis (cell wall). Isoniazid's primary target. S94A mutation confers resistance.",
        druggability: "high",
      },
      {
        name: "DprE1 (Decaprenylphosphoryl-β-D-ribose oxidase)",
        gene: "dprE1",
        uniprotId: "P9WJA7",
        mechanism: "Catalyzes cell wall arabinogalactan biosynthesis. Validated target for BTZ043 and macozinone.",
        druggability: "high",
      },
      {
        name: "MmpL3 (Mycobacterial membrane protein Large 3)",
        gene: "mmpL3",
        uniprotId: "I6Y4G5",
        mechanism: "Transporter for trehalose monomycolate across the inner membrane. Essential for cell wall integrity.",
        druggability: "moderate",
      },
    ],
    referenceDrugs: ["Isoniazid", "Rifampicin", "Pyrazinamide", "Ethambutol", "Bedaquiline", "Pretomanid"],
    scoringProfile: {
      efficacyWeight: 0.55,
      safetyWeight: 0.45,
      bindingAffinityImportance: 0.30,
      metabolicStabilityImportance: 0.30,
      mwRange: [100, 600],
      logpRange: [-1, 5],
      tpsaMax: 160,
      requiresBBBPenetration: false,
      oralBioavailabilityPriority: "critical",
    },
    riskChecks: [
      { condition: "mw > 600", flag: "MW >600 Da reduces penetration into TB granulomas", severity: "critical" },
      { condition: "logp < -1", flag: "Very hydrophilic — poor penetration into lipid-rich mycobacterial cell wall", severity: "warning" },
      { condition: "logp > 5", flag: "Excessive lipophilicity — hepatotoxicity risk compounds existing TB drug hepatotoxicity", severity: "critical" },
      { condition: "hepatotoxicity", flag: "Hepatotoxicity concern — TB regimens already include hepatotoxic drugs (INH, RIF, PZA)", severity: "critical" },
    ],
    datasets: [
      { name: "ChEMBL M. tuberculosis", source: "ChEMBL", url: "https://www.ebi.ac.uk/chembl/", description: "Bioactivity data against M. tuberculosis H37Rv", compounds: 18924 },
      { name: "TB Alliance Compound Library", source: "TB Alliance", url: "https://www.tballiance.org/", description: "Pipeline compounds in various stages of TB drug development", compounds: 2100 },
      { name: "PubChem BioAssay AID 1949", source: "PubChem", url: "https://pubchem.ncbi.nlm.nih.gov/bioassay/1949", description: "M. tuberculosis growth inhibition HTS", compounds: 219753 },
    ],
    contextualGuidance: [
      "TB treatment requires 6+ months — metabolic stability and low toxicity are paramount",
      "Must be compatible with rifampicin (strong CYP3A4 inducer) — check DDI profile",
      "HIV-TB coinfection common — evaluate interactions with antiretrovirals (efavirenz, dolutegravir)",
      "Prioritize compounds active against MDR-TB (resistant to INH + RIF)",
      "Intracellular activity required — M. tuberculosis resides within macrophages",
    ],
  },
  {
    id: "hiv",
    name: "HIV/AIDS",
    icon: "🔴",
    category: "Viral Infection",
    region: "Sub-Saharan Africa",
    description: "Human Immunodeficiency Virus infection affecting 25.6 million people in sub-Saharan Africa. Despite ART scale-up, drug resistance and need for long-acting formulations drive continued research.",
    epidemiology: "~39 million people living with HIV globally, 67% in sub-Saharan Africa. 630,000 AIDS-related deaths (2022).",
    prevalence: "Highest prevalence: Eswatini (26%), Lesotho (21%), Botswana (20%), South Africa (18%)",
    targets: [
      {
        name: "HIV-1 Reverse Transcriptase",
        gene: "RT",
        uniprotId: "P03366",
        mechanism: "RNA-dependent DNA polymerase converting viral RNA to DNA. NRTIs compete with natural nucleotides; NNRTIs bind an allosteric pocket.",
        druggability: "high",
      },
      {
        name: "HIV-1 Integrase",
        gene: "IN",
        uniprotId: "Q76353",
        mechanism: "Catalyzes viral DNA integration into host genome. INSTIs (dolutegravir, bictegravir) are now first-line in most African ART programs.",
        druggability: "high",
      },
      {
        name: "HIV-1 Protease",
        gene: "PR",
        uniprotId: "P03367",
        mechanism: "Cleaves Gag-Pol polyprotein into functional viral proteins. Protease inhibitors block viral maturation.",
        druggability: "high",
      },
    ],
    referenceDrugs: ["Dolutegravir", "Tenofovir", "Emtricitabine", "Efavirenz", "Lopinavir", "Darunavir"],
    scoringProfile: {
      efficacyWeight: 0.50,
      safetyWeight: 0.50,
      bindingAffinityImportance: 0.35,
      metabolicStabilityImportance: 0.30,
      mwRange: [200, 700],
      logpRange: [0, 5],
      tpsaMax: 180,
      requiresBBBPenetration: true,
      oralBioavailabilityPriority: "critical",
    },
    riskChecks: [
      { condition: "mw > 700", flag: "MW >700 Da — consider long-acting injectable formulation instead of oral", severity: "warning" },
      { condition: "logp > 5", flag: "High lipophilicity may cause lipodystrophy — already a concern with existing ART", severity: "warning" },
      { condition: "cyp3a4", flag: "CYP3A4 interaction — critical concern with boosted PI regimens (ritonavir/cobicistat)", severity: "critical" },
      { condition: "renal", flag: "Nephrotoxicity risk — tenofovir disoproxil fumarate already causes renal tubular dysfunction", severity: "critical" },
    ],
    datasets: [
      { name: "ChEMBL HIV", source: "ChEMBL", url: "https://www.ebi.ac.uk/chembl/", description: "Bioactivity data against HIV-1 targets", compounds: 45892 },
      { name: "NIAID HIV/OI/TB Therapeutics DB", source: "NIAID", url: "https://chemdb.niaid.nih.gov/", description: "Comprehensive HIV compound database with clinical data", compounds: 3200 },
      { name: "PubChem BioAssay AID 1053197", source: "PubChem", url: "https://pubchem.ncbi.nlm.nih.gov/bioassay/1053197", description: "HIV-1 RT inhibitor screening", compounds: 412851 },
    ],
    contextualGuidance: [
      "Lifelong daily dosing — safety and tolerability are equally important as efficacy",
      "Resistance barrier is critical — high genetic barrier to resistance preferred (like dolutegravir)",
      "Must be compatible with TB co-treatment (rifampicin interaction is a major challenge)",
      "Consider long-acting formulations (monthly injectables like cabotegravir) for adherence",
      "Pediatric formulations needed — dispersible tablets, taste-masking for children",
    ],
  },
  {
    id: "sickle-cell",
    name: "Sickle Cell Disease",
    icon: "🩸",
    category: "Genetic Disorder",
    region: "West & Central Africa",
    description: "Inherited hemoglobinopathy caused by HBB E6V mutation, endemic in malaria-belt regions. ~300,000 affected births annually in Africa, with up to 70% childhood mortality without intervention.",
    epidemiology: "~5 million people living with SCD in Africa. Carrier frequency 10–40% in West Africa.",
    prevalence: "Nigeria (150,000 births/year), DRC, Tanzania, Ghana, Cameroon",
    targets: [
      {
        name: "Hemoglobin S Polymerization",
        gene: "HBB",
        uniprotId: "P68871",
        mechanism: "E6V mutation causes deoxyHbS polymerization into fibers that deform red blood cells. Anti-sickling agents disrupt polymer contacts.",
        druggability: "moderate",
      },
      {
        name: "Fetal Hemoglobin Induction (BCL11A)",
        gene: "BCL11A",
        uniprotId: "Q9H165",
        mechanism: "Transcriptional repressor of γ-globin. Inhibiting BCL11A reactivates fetal hemoglobin (HbF), which inhibits HbS polymerization.",
        druggability: "moderate",
      },
      {
        name: "P-Selectin",
        gene: "SELP",
        uniprotId: "P16109",
        mechanism: "Adhesion molecule promoting vaso-occlusion by mediating sickle cell adhesion to endothelium. Crizanlizumab targets P-selectin.",
        druggability: "high",
      },
    ],
    referenceDrugs: ["Hydroxyurea", "Voxelotor", "Crizanlizumab", "L-Glutamine"],
    scoringProfile: {
      efficacyWeight: 0.50,
      safetyWeight: 0.50,
      bindingAffinityImportance: 0.25,
      metabolicStabilityImportance: 0.30,
      mwRange: [50, 500],
      logpRange: [-2, 4],
      tpsaMax: 140,
      requiresBBBPenetration: false,
      oralBioavailabilityPriority: "critical",
    },
    riskChecks: [
      { condition: "mw > 500", flag: "Oral formulation preferred — most SCD patients are managed outpatient", severity: "warning" },
      { condition: "hepatotoxicity", flag: "Hepatotoxicity concern — SCD patients already have chronic liver iron overload", severity: "critical" },
      { condition: "renal", flag: "Nephrotoxicity risk — sickle nephropathy is common in adult SCD patients", severity: "critical" },
      { condition: "myelosuppression", flag: "Myelosuppression risk — hydroxyurea already causes dose-limiting cytopenias", severity: "warning" },
    ],
    datasets: [
      { name: "ChEMBL Hemoglobin", source: "ChEMBL", url: "https://www.ebi.ac.uk/chembl/", description: "Compounds tested against hemoglobin targets", compounds: 1847 },
      { name: "ClinicalTrials.gov SCD", source: "ClinicalTrials.gov", url: "https://clinicaltrials.gov/ct2/results?cond=Sickle+Cell", description: "Active clinical trials for sickle cell disease therapeutics", compounds: 320 },
      { name: "PubChem HbF Inducers", source: "PubChem", url: "https://pubchem.ncbi.nlm.nih.gov/", description: "Fetal hemoglobin induction screening data", compounds: 8421 },
    ],
    contextualGuidance: [
      "Chronic daily oral therapy needed — minimize pill burden and side effects",
      "Pediatric formulation essential — SCD presents in early childhood",
      "HbF induction >20% is clinically meaningful for reducing crises",
      "Avoid compounds that worsen anemia or cause myelosuppression",
      "Cost-effectiveness critical — most African SCD patients lack health insurance",
    ],
  },
  {
    id: "ebola",
    name: "Ebola Virus Disease",
    icon: "⚠️",
    category: "Viral Hemorrhagic Fever",
    region: "West & Central Africa",
    description: "Filovirus infection with case fatality rates of 25–90%. Recurrent outbreaks in DRC, Guinea, Sierra Leone, and Liberia demand both therapeutic and prophylactic solutions.",
    epidemiology: "Sporadic outbreaks; 2014–2016 West Africa epidemic: 28,616 cases, 11,310 deaths.",
    prevalence: "Outbreak-driven in DRC, Guinea, Sierra Leone, Liberia, Uganda",
    targets: [
      {
        name: "Ebola RNA-dependent RNA Polymerase (L protein)",
        gene: "EBOV-L",
        uniprotId: "Q05320",
        mechanism: "Viral polymerase essential for genome replication. Remdesivir (nucleotide analog) inhibits this target.",
        druggability: "high",
      },
      {
        name: "Ebola VP35 (Interferon Inhibitory Domain)",
        gene: "VP35",
        uniprotId: "Q05127",
        mechanism: "Suppresses host innate immune response by antagonizing RIG-I signaling. Blocking VP35 restores interferon production.",
        druggability: "moderate",
      },
      {
        name: "Ebola Glycoprotein (GP)",
        gene: "GP",
        uniprotId: "Q05320",
        mechanism: "Surface glycoprotein mediating viral entry via NPC1. Monoclonal antibodies (mAb114, REGN-EB3) target GP.",
        druggability: "high",
      },
    ],
    referenceDrugs: ["Remdesivir", "Favipiravir", "Brincidofovir"],
    scoringProfile: {
      efficacyWeight: 0.65,
      safetyWeight: 0.35,
      bindingAffinityImportance: 0.40,
      metabolicStabilityImportance: 0.20,
      mwRange: [200, 800],
      logpRange: [-2, 5],
      tpsaMax: 200,
      requiresBBBPenetration: false,
      oralBioavailabilityPriority: "high",
    },
    riskChecks: [
      { condition: "mw > 800", flag: "Large molecules may require IV — challenging during outbreaks", severity: "warning" },
      { condition: "logp > 5", flag: "Hepatotoxicity risk — Ebola already causes severe liver damage", severity: "critical" },
      { condition: "tpsa > 200", flag: "Very poor oral absorption — IV-only may limit field deployment", severity: "warning" },
    ],
    datasets: [
      { name: "ChEMBL Ebola", source: "ChEMBL", url: "https://www.ebi.ac.uk/chembl/", description: "Compounds tested against Ebola virus", compounds: 4521 },
      { name: "NCATS Ebola Screening", source: "NCATS/NIH", url: "https://ncats.nih.gov/", description: "High-throughput Ebola antiviral screening", compounds: 2816 },
      { name: "PubChem Ebola Assays", source: "PubChem", url: "https://pubchem.ncbi.nlm.nih.gov/", description: "Ebola virus replication inhibition assays", compounds: 15423 },
    ],
    contextualGuidance: [
      "Speed of action critical — Ebola progresses rapidly (death within 6–16 days)",
      "Efficacy prioritized over long-term safety in acute outbreak settings",
      "IV formulation acceptable given hospital-based treatment during outbreaks",
      "Thermal stability important — cold chain often disrupted in outbreak zones",
      "Broad-spectrum antiviral activity preferred (covers multiple filovirus species)",
    ],
  },
];

/** Get a disease model by ID */
export function getDiseaseModel(id: string): DiseaseModel | undefined {
  return DISEASE_MODELS.find((d) => d.id === id);
}

/** Get all disease IDs */
export function getDiseaseIds(): string[] {
  return DISEASE_MODELS.map((d) => d.id);
}
