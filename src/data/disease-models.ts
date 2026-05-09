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
  {
    id: "leishmaniasis",
    name: "Leishmaniasis",
    icon: "🪰",
    category: "Parasitic Infection (NTD)",
    region: "East Africa, North Africa",
    description: "Protozoan infection caused by Leishmania species transmitted by sandflies. Visceral leishmaniasis (kala-azar) is fatal if untreated. Cutaneous forms cause disfiguring skin lesions.",
    epidemiology: "~1 million new cases annually; 20,000–30,000 deaths. Visceral form concentrated in East Africa and South Asia.",
    prevalence: "Highest burden: Sudan, South Sudan, Ethiopia, Somalia, Kenya",
    targets: [
      {
        name: "Leishmania Trypanothione Reductase",
        gene: "TR",
        uniprotId: "Q27686",
        mechanism: "Maintains trypanothione in reduced form, essential for parasite redox defense. Absent in humans, making it an ideal selective target.",
        druggability: "high",
      },
      {
        name: "Leishmania CRK12 (Cdc2-related kinase 12)",
        gene: "CRK12",
        uniprotId: "E9AHP0",
        mechanism: "Essential cell-cycle kinase in Leishmania. DDD853651/GSK3186899 targets CRK12 and is in clinical development.",
        druggability: "high",
      },
      {
        name: "Leishmania Topoisomerase II",
        gene: "TOP2",
        uniprotId: "Q25325",
        mechanism: "DNA topoisomerase essential for replication. Miltefosine and amphotericin B have indirect effects on DNA metabolism.",
        druggability: "moderate",
      },
    ],
    referenceDrugs: ["Miltefosine", "Amphotericin B", "Paromomycin", "Sodium Stibogluconate", "Pentamidine"],
    scoringProfile: {
      efficacyWeight: 0.55,
      safetyWeight: 0.45,
      bindingAffinityImportance: 0.30,
      metabolicStabilityImportance: 0.25,
      mwRange: [150, 600],
      logpRange: [-1, 5],
      tpsaMax: 150,
      requiresBBBPenetration: false,
      oralBioavailabilityPriority: "critical",
    },
    riskChecks: [
      { condition: "mw > 600", flag: "MW >600 Da limits oral bioavailability — oral drugs essential for rural endemic areas", severity: "critical" },
      { condition: "logp > 5", flag: "High lipophilicity — hepatotoxicity risk compounds antimonial-induced liver damage", severity: "warning" },
      { condition: "renal", flag: "Nephrotoxicity concern — amphotericin B already causes significant renal toxicity", severity: "critical" },
      { condition: "tpsa > 150", flag: "Poor oral absorption — injectable-only drugs require clinic visits in remote areas", severity: "warning" },
    ],
    datasets: [
      { name: "ChEMBL Leishmania", source: "ChEMBL", url: "https://www.ebi.ac.uk/chembl/", description: "Bioactivity data against Leishmania species", compounds: 12453 },
      { name: "DNDi Compound Library", source: "DNDi", url: "https://www.dndi.org/", description: "Drugs for Neglected Diseases initiative screening data", compounds: 1800 },
      { name: "PubChem Leishmania Assays", source: "PubChem", url: "https://pubchem.ncbi.nlm.nih.gov/", description: "Leishmania growth inhibition HTS", compounds: 89421 },
    ],
    contextualGuidance: [
      "Oral formulation strongly preferred — most patients are in remote rural areas without IV access",
      "Short treatment course needed — current regimens (28 days miltefosine) have poor adherence",
      "Must be effective against multiple Leishmania species (L. donovani, L. major, L. tropica)",
      "Teratogenicity must be avoided — miltefosine is contraindicated in pregnancy",
      "Thermostability critical — cold chain for amphotericin B liposomal is a major barrier",
    ],
  },
  {
    id: "schistosomiasis",
    name: "Schistosomiasis",
    icon: "🐌",
    category: "Helminth Infection (NTD)",
    region: "Sub-Saharan Africa",
    description: "Parasitic worm infection caused by Schistosoma species (S. mansoni, S. haematobium). Chronic infection causes liver fibrosis, portal hypertension, bladder cancer, and growth retardation in children.",
    epidemiology: "~240 million people infected, >200,000 deaths annually. 90% of cases in sub-Saharan Africa.",
    prevalence: "Highest burden: Nigeria, Tanzania, DRC, Mozambique, Ghana, Kenya",
    targets: [
      {
        name: "Schistosoma Thioredoxin Glutathione Reductase",
        gene: "TGR",
        uniprotId: "Q86LC0",
        mechanism: "Sole redox enzyme maintaining thiol balance in the parasite. Essential and absent in humans. Validated drug target for oxadiazoles.",
        druggability: "high",
      },
      {
        name: "Schistosoma SmSERCA (Ca²⁺ ATPase)",
        gene: "SmSERCA",
        uniprotId: "G4LZI3",
        mechanism: "Sarco/endoplasmic reticulum calcium pump essential for worm muscle contraction. Praziquantel's proposed primary target.",
        druggability: "high",
      },
      {
        name: "Schistosoma Histone Deacetylase 8",
        gene: "SmHDAC8",
        uniprotId: "G4LZH9",
        mechanism: "Epigenetic regulator of parasite gene expression. Selective inhibitors kill schistosomula and adult worms.",
        druggability: "moderate",
      },
    ],
    referenceDrugs: ["Praziquantel", "Oxamniquine", "Artemether"],
    scoringProfile: {
      efficacyWeight: 0.55,
      safetyWeight: 0.45,
      bindingAffinityImportance: 0.25,
      metabolicStabilityImportance: 0.20,
      mwRange: [150, 500],
      logpRange: [0, 5],
      tpsaMax: 140,
      requiresBBBPenetration: false,
      oralBioavailabilityPriority: "critical",
    },
    riskChecks: [
      { condition: "mw > 500", flag: "MW >500 Da — oral single-dose treatment preferred for mass drug administration", severity: "warning" },
      { condition: "hepatotoxicity", flag: "Hepatotoxicity concern — chronic schistosomiasis already causes hepatic fibrosis", severity: "critical" },
      { condition: "logp > 5", flag: "High lipophilicity may reduce aqueous solubility for pediatric formulations", severity: "warning" },
      { condition: "cyp3a4", flag: "CYP interaction concern — many patients co-treated with antimalarials and antiretrovirals", severity: "warning" },
    ],
    datasets: [
      { name: "ChEMBL Schistosoma", source: "ChEMBL", url: "https://www.ebi.ac.uk/chembl/", description: "Bioactivity data against Schistosoma species", compounds: 4892 },
      { name: "PubChem Schistosoma Assays", source: "PubChem", url: "https://pubchem.ncbi.nlm.nih.gov/", description: "Schistosomula and adult worm screening assays", compounds: 25634 },
      { name: "WHO NTD Data Portal", source: "WHO", url: "https://www.who.int/data/gho/data/themes/neglected-tropical-diseases", description: "Epidemiological and treatment coverage data", compounds: 0 },
    ],
    contextualGuidance: [
      "Single oral dose preferred — praziquantel MDA programs treat millions of school-age children",
      "Must be active against juvenile worms — praziquantel has poor efficacy against schistosomula",
      "Pediatric taste-masked formulation needed — bitter taste of praziquantel reduces adherence",
      "Activity against both S. mansoni and S. haematobium required for African context",
      "Cost must be extremely low — current praziquantel costs ~$0.08/treatment for MDA",
    ],
  },
  {
    id: "trypanosomiasis",
    name: "Trypanosomiasis",
    icon: "🪲",
    category: "Parasitic Infection (NTD)",
    region: "Sub-Saharan Africa",
    description: "Human African Trypanosomiasis (sleeping sickness) caused by Trypanosoma brucei gambiense (97%) and T. b. rhodesiense. Fatal if untreated due to CNS invasion causing sleep cycle disruption and encephalitis.",
    epidemiology: "~1,000 new cases/year (down from 37,000 in 1998). Goal: elimination by 2030. Tsetse fly vector.",
    prevalence: "DRC (>70% of cases), Central African Republic, Chad, Angola, South Sudan",
    targets: [
      {
        name: "Trypanosome N-myristoyltransferase",
        gene: "NMT",
        uniprotId: "Q38BW3",
        mechanism: "Essential enzyme catalyzing N-terminal myristoylation of parasite proteins. Validated by DDD85646 series with nanomolar potency.",
        druggability: "high",
      },
      {
        name: "Trypanosome Trypanothione Synthetase",
        gene: "TryS",
        uniprotId: "Q389U2",
        mechanism: "Synthesizes trypanothione from glutathione and spermidine. Unique to trypanosomatids, essential for oxidative stress defense.",
        druggability: "high",
      },
      {
        name: "Trypanosome Cathepsin L (TbCatL)",
        gene: "TbCatL",
        uniprotId: "Q388R5",
        mechanism: "Cysteine protease involved in immune evasion via VSG recycling and host protein degradation.",
        druggability: "moderate",
      },
    ],
    referenceDrugs: ["Fexinidazole", "Nifurtimox", "Eflornithine", "Suramin", "Pentamidine", "Melarsoprol"],
    scoringProfile: {
      efficacyWeight: 0.55,
      safetyWeight: 0.45,
      bindingAffinityImportance: 0.30,
      metabolicStabilityImportance: 0.30,
      mwRange: [100, 550],
      logpRange: [-1, 4],
      tpsaMax: 120,
      requiresBBBPenetration: true,
      oralBioavailabilityPriority: "critical",
    },
    riskChecks: [
      { condition: "tpsa > 90", flag: "TPSA >90 Å² may limit BBB penetration — CNS-stage disease requires brain-penetrant drugs", severity: "critical" },
      { condition: "mw > 450", flag: "MW >450 Da — BBB crossing favors smaller molecules for stage 2 disease", severity: "warning" },
      { condition: "logp < -1", flag: "Very hydrophilic — poor CNS penetration for late-stage treatment", severity: "warning" },
      { condition: "logp > 4", flag: "High lipophilicity — encephalopathic toxicity risk (cf. melarsoprol)", severity: "critical" },
    ],
    datasets: [
      { name: "ChEMBL T. brucei", source: "ChEMBL", url: "https://www.ebi.ac.uk/chembl/", description: "Bioactivity data against T. brucei species", compounds: 9847 },
      { name: "DNDi HAT Library", source: "DNDi", url: "https://www.dndi.org/diseases/sleeping-sickness/", description: "Screening hits from DNDi HAT drug discovery programs", compounds: 3200 },
      { name: "PubChem T. brucei Assays", source: "PubChem", url: "https://pubchem.ncbi.nlm.nih.gov/", description: "T. brucei growth inhibition and viability assays", compounds: 42156 },
    ],
    contextualGuidance: [
      "BBB penetration is ESSENTIAL — stage 2 disease requires CNS-active compounds (TPSA <90, MW <450)",
      "Oral formulation critical — fexinidazole (first all-oral treatment) set the new standard of care",
      "Must distinguish stage 1 vs stage 2 activity — different target product profiles",
      "Avoid reactive arsenical-type toxicity — melarsoprol causes 5% treatment-related mortality",
      "10-day oral course maximum — treatment in remote areas with limited follow-up capacity",
    ],
  },
  {
    id: "rift-valley-fever",
    name: "Rift Valley Fever",
    icon: "🐄",
    category: "Viral Zoonosis (NTD)",
    region: "East Africa",
    description: "Mosquito-borne phlebovirus (RVFV) causing severe febrile illness, hemorrhagic fever, retinitis, and encephalitis. No licensed antiviral; vaccine development is ongoing for both humans and livestock.",
    epidemiology: "Recurrent outbreaks; >100,000 estimated infections during major epidemics. Case fatality 1–3% overall, up to 50% in hemorrhagic cases.",
    prevalence: "Endemic in Kenya, Tanzania, Uganda, Somalia, Sudan, Madagascar; outbreaks tied to heavy rainfall.",
    targets: [
      {
        name: "RVFV RNA-dependent RNA Polymerase (L segment)",
        gene: "RVFV-L",
        uniprotId: "P27316",
        mechanism: "Viral polymerase essential for genome replication. Nucleoside analogs (favipiravir, ribavirin) show partial activity.",
        druggability: "high",
      },
      {
        name: "RVFV Glycoprotein Gn/Gc",
        gene: "GnGc",
        uniprotId: "P21401",
        mechanism: "Surface glycoproteins mediating viral entry; primary vaccine antigen and neutralizing antibody target.",
        druggability: "high",
      },
      {
        name: "RVFV NSs (Non-structural protein)",
        gene: "NSs",
        uniprotId: "P21698",
        mechanism: "Major virulence factor that suppresses host interferon response. Druggable for host-defense restoration.",
        druggability: "moderate",
      },
    ],
    referenceDrugs: ["Ribavirin", "Favipiravir"],
    scoringProfile: {
      efficacyWeight: 0.60, safetyWeight: 0.40,
      bindingAffinityImportance: 0.35, metabolicStabilityImportance: 0.25,
      mwRange: [150, 600], logpRange: [-1, 5], tpsaMax: 160,
      requiresBBBPenetration: false, oralBioavailabilityPriority: "critical",
    },
    riskChecks: [
      { condition: "mw > 600", flag: "MW >600 Da limits oral dosing during outbreaks in remote areas", severity: "warning" },
      { condition: "logp > 5", flag: "Hepatotoxicity risk — RVFV already causes liver necrosis", severity: "critical" },
      { condition: "tpsa > 140", flag: "Poor oral absorption — field deployment requires oral formulations", severity: "warning" },
    ],
    datasets: [
      { name: "ChEMBL Phlebovirus", source: "ChEMBL", url: "https://www.ebi.ac.uk/chembl/", description: "Bioactivity against bunyavirus / phlebovirus targets", compounds: 1240 },
      { name: "PubChem RVFV Assays", source: "PubChem", url: "https://pubchem.ncbi.nlm.nih.gov/", description: "Antiviral screens against RVFV polymerase and entry", compounds: 6400 },
      { name: "WHO R&D Blueprint — RVF", source: "WHO", url: "https://www.who.int/teams/blueprint", description: "Priority pathogen target product profile", compounds: 0 },
    ],
    contextualGuidance: [
      "Prioritize broad-spectrum antivirals targeting bunyavirus polymerase",
      "Vaccine antigen design should focus on Gn/Gc glycoproteins",
      "Thermostable formulations needed — outbreak zones lack cold chain",
      "Consider One Health: livestock vaccines reduce human spillover",
    ],
  },
  {
    id: "visceral-leishmaniasis",
    name: "Visceral Leishmaniasis (Kala-azar)",
    icon: "🩺",
    category: "Parasitic Infection (NTD)",
    region: "East Africa",
    description: "Systemic Leishmania donovani infection that is fatal if untreated. Existing therapies (antimonials, amphotericin B, miltefosine) face toxicity, cost, and emerging resistance challenges.",
    epidemiology: "50,000–90,000 new cases/year globally; East Africa now accounts for >70% of reported VL cases.",
    prevalence: "Sudan, South Sudan, Ethiopia, Kenya, Uganda, Somalia.",
    targets: [
      {
        name: "L. donovani Trypanothione Reductase",
        gene: "TR",
        uniprotId: "Q27686",
        mechanism: "Sole redox enzyme maintaining trypanothione reduction. Absent in humans → high selectivity window.",
        druggability: "high",
      },
      {
        name: "L. donovani Proteasome β5 subunit",
        gene: "PSMB5",
        uniprotId: "E9BNJ7",
        mechanism: "Selective inhibitors (GNF6702, LXE408) clear visceral parasites in animal models and entered clinical trials.",
        druggability: "high",
      },
      {
        name: "L. donovani CRK12 kinase",
        gene: "CRK12",
        uniprotId: "E9AHP0",
        mechanism: "Essential cell-cycle kinase validated by DNDi clinical candidates (DNDI-6148).",
        druggability: "high",
      },
    ],
    referenceDrugs: ["Amphotericin B (liposomal)", "Miltefosine", "Paromomycin", "Sodium Stibogluconate"],
    scoringProfile: {
      efficacyWeight: 0.55, safetyWeight: 0.45,
      bindingAffinityImportance: 0.30, metabolicStabilityImportance: 0.30,
      mwRange: [150, 600], logpRange: [-1, 5], tpsaMax: 150,
      requiresBBBPenetration: false, oralBioavailabilityPriority: "critical",
    },
    riskChecks: [
      { condition: "mw > 600", flag: "Oral short-course preferred — current 17–28 day regimens have poor adherence", severity: "critical" },
      { condition: "renal", flag: "Renal toxicity stacks with amphotericin B in combination therapy", severity: "critical" },
      { condition: "hepatotoxicity", flag: "VL patients commonly have hepatosplenomegaly and altered liver function", severity: "warning" },
    ],
    datasets: [
      { name: "DNDi VL Compound Library", source: "DNDi", url: "https://www.dndi.org/diseases/visceral-leishmaniasis/", description: "Open hits and leads from DNDi screening cascades", compounds: 2200 },
      { name: "ChEMBL L. donovani", source: "ChEMBL", url: "https://www.ebi.ac.uk/chembl/", description: "L. donovani amastigote and promastigote bioactivity", compounds: 8400 },
      { name: "TriTrypDB Genomics", source: "VEuPathDB", url: "https://tritrypdb.org/", description: "Genomes, transcriptomes and resistance markers", compounds: 0 },
    ],
    contextualGuidance: [
      "Repurposing screens encouraged — proteasome and kinase scaffolds are promising",
      "Resistance markers (LdMT, miltefosine sensitivity locus) should be tracked",
      "Combination therapy preferred to delay resistance",
      "Pediatric and HIV-coinfected dosing must be evaluated",
    ],
  },
  {
    id: "mycetoma",
    name: "Mycetoma",
    icon: "🦠",
    category: "Fungal/Bacterial Infection (NTD)",
    region: "Sudan, Horn of Africa",
    description: "Chronic granulomatous infection (eumycetoma — fungal; actinomycetoma — bacterial) causing disabling subcutaneous lesions. Treatment is prolonged, costly, often unsuccessful, and amputation is common in advanced disease.",
    epidemiology: "Endemic in the 'mycetoma belt'; true prevalence under-reported. Most common pathogen: Madurella mycetomatis.",
    prevalence: "Sudan (highest burden), Chad, Ethiopia, Somalia, Mauritania, Senegal.",
    targets: [
      {
        name: "M. mycetomatis CYP51 (Lanosterol 14α-demethylase)",
        gene: "CYP51",
        uniprotId: "A0A2P7YBL4",
        mechanism: "Essential ergosterol biosynthesis enzyme. Azole antifungals (itraconazole, fosravuconazole) bind the heme iron.",
        druggability: "high",
      },
      {
        name: "Fungal β-1,3-glucan synthase",
        gene: "FKS1",
        uniprotId: "P38631",
        mechanism: "Cell wall biosynthesis target of echinocandins; selective fungal target with low human toxicity.",
        druggability: "moderate",
      },
    ],
    referenceDrugs: ["Itraconazole", "Fosravuconazole", "Ketoconazole", "Amoxicillin-Clavulanate"],
    scoringProfile: {
      efficacyWeight: 0.50, safetyWeight: 0.50,
      bindingAffinityImportance: 0.30, metabolicStabilityImportance: 0.30,
      mwRange: [200, 700], logpRange: [1, 6], tpsaMax: 140,
      requiresBBBPenetration: false, oralBioavailabilityPriority: "critical",
    },
    riskChecks: [
      { condition: "logp > 5", flag: "High lipophilicity — long-term azole therapy already risks hepatotoxicity", severity: "critical" },
      { condition: "cyp3a4", flag: "CYP3A4 inhibition concern — common DDIs in chronic mycetoma regimens", severity: "warning" },
      { condition: "mw > 700", flag: "Large MW limits oral bioavailability for 6–12 month therapy", severity: "warning" },
    ],
    datasets: [
      { name: "MycetOS Open Source Project", source: "Open Source Mycetoma", url: "https://www.mycetos.org/", description: "Open-source antifungal compound progression data", compounds: 350 },
      { name: "ChEMBL M. mycetomatis", source: "ChEMBL", url: "https://www.ebi.ac.uk/chembl/", description: "Antifungal bioactivity for Madurella spp.", compounds: 480 },
      { name: "PubChem Antifungal Assays", source: "PubChem", url: "https://pubchem.ncbi.nlm.nih.gov/", description: "Broad antifungal screens including Madurella", compounds: 14200 },
    ],
    contextualGuidance: [
      "Long oral therapy required — minimize hepatotoxicity and DDIs",
      "Penetration into avascular grain tissue is critical for cure",
      "Affordable cost essential — patients are typically rural and uninsured",
      "Distinguish eumycetoma vs actinomycetoma (different treatment classes)",
    ],
  },
  {
    id: "mdr-tb",
    name: "Drug-Resistant Tuberculosis",
    icon: "💊",
    category: "Bacterial Infection (Resistant)",
    region: "Sub-Saharan Africa, Eastern Europe",
    description: "Multidrug-resistant (MDR) and extensively drug-resistant (XDR) M. tuberculosis strains resist first-line agents (INH, RIF) and increasingly later-line drugs. New scaffolds (BPaL/BPaLM regimen) reshaped the standard of care.",
    epidemiology: "~410,000 MDR/RR-TB cases per year, treatment success only ~63%. Bedaquiline resistance now emerging.",
    prevalence: "South Africa, Nigeria, Mozambique, DRC, Eswatini.",
    targets: [
      {
        name: "ATP synthase c-subunit (AtpE)",
        gene: "atpE",
        uniprotId: "P9WPS3",
        mechanism: "Bedaquiline target. Mutations in atpE and Rv0678 (efflux regulator) confer resistance.",
        druggability: "high",
      },
      {
        name: "DprE1 (Decaprenyl-phosphoryl-β-D-ribose oxidase)",
        gene: "dprE1",
        uniprotId: "P9WJA7",
        mechanism: "Cell wall arabinogalactan biosynthesis. Active site cysteine is targeted by BTZ043, macozinone.",
        druggability: "high",
      },
      {
        name: "Cytochrome bc1 (QcrB)",
        gene: "qcrB",
        uniprotId: "P9WP25",
        mechanism: "Energy metabolism target of telacebec (Q203). Active against MDR/XDR strains.",
        druggability: "high",
      },
    ],
    referenceDrugs: ["Bedaquiline", "Pretomanid", "Linezolid", "Delamanid", "Clofazimine"],
    scoringProfile: {
      efficacyWeight: 0.60, safetyWeight: 0.40,
      bindingAffinityImportance: 0.35, metabolicStabilityImportance: 0.30,
      mwRange: [150, 700], logpRange: [-1, 6], tpsaMax: 160,
      requiresBBBPenetration: false, oralBioavailabilityPriority: "critical",
    },
    riskChecks: [
      { condition: "hepatotoxicity", flag: "Adds to baseline hepatotoxicity of TB regimens", severity: "critical" },
      { condition: "logp > 5", flag: "High lipophilicity — QT prolongation risk (cf. bedaquiline + delamanid)", severity: "critical" },
      { condition: "cyp3a4", flag: "Rifamycin-class inducers complicate combination dosing", severity: "warning" },
    ],
    datasets: [
      { name: "ReSeqTB Mutation Catalog", source: "WHO/CRyPTIC", url: "https://platform.reseqtb.org/", description: "Catalogued resistance mutations for major TB drugs", compounds: 0 },
      { name: "TB Alliance MDR Library", source: "TB Alliance", url: "https://www.tballiance.org/", description: "Active candidates against resistant strains", compounds: 1800 },
      { name: "ChEMBL M. tuberculosis (resistant)", source: "ChEMBL", url: "https://www.ebi.ac.uk/chembl/", description: "Annotated activity vs MDR/XDR isolates", compounds: 6200 },
    ],
    contextualGuidance: [
      "Score against MDR/XDR isolates explicitly — pan-susceptible activity is insufficient",
      "Resistance mutation analysis (rpoB, katG, atpE, Rv0678) must accompany prediction",
      "Combine with PK/PD modelling for shortened oral regimens (BPaL-style)",
      "Avoid additive QT prolongation with bedaquiline/delamanid backbone",
    ],
  },
  {
    id: "nodding-syndrome",
    name: "Nodding Syndrome",
    icon: "🧠",
    category: "Neurological Disorder (Unknown Etiology)",
    region: "Uganda, South Sudan, Tanzania",
    description: "Progressive pediatric epileptic encephalopathy with characteristic head-nodding seizures and cognitive decline. Etiology debated — strong epidemiologic link to Onchocerca volvulus and possible autoimmune mechanisms (leiomodin-1).",
    epidemiology: "Several thousand cases concentrated in onchocerciasis-endemic foci; mortality and disability are high without supportive care.",
    prevalence: "Northern Uganda, South Sudan, Mahenge district (Tanzania).",
    targets: [
      {
        name: "Leiomodin-1 (autoantigen hypothesis)",
        gene: "LMOD1",
        uniprotId: "P29536",
        mechanism: "Cross-reactive antibodies against O. volvulus tropomyosin and human leiomodin-1 may drive neuronal damage.",
        druggability: "low",
      },
      {
        name: "Onchocerca volvulus (causative cofactor)",
        gene: "OvTubulin",
        uniprotId: "Q25623",
        mechanism: "Macrofilaricides (moxidectin, emodepside) targeting adult worms may reduce incidence in endemic areas.",
        druggability: "moderate",
      },
      {
        name: "GABA-A receptor (symptomatic)",
        gene: "GABRA1",
        uniprotId: "P14867",
        mechanism: "Symptomatic seizure control via standard antiepileptics (sodium valproate first-line).",
        druggability: "high",
      },
    ],
    referenceDrugs: ["Sodium Valproate", "Ivermectin", "Moxidectin", "Doxycycline"],
    scoringProfile: {
      efficacyWeight: 0.50, safetyWeight: 0.50,
      bindingAffinityImportance: 0.25, metabolicStabilityImportance: 0.30,
      mwRange: [100, 500], logpRange: [-1, 4], tpsaMax: 90,
      requiresBBBPenetration: true, oralBioavailabilityPriority: "critical",
    },
    riskChecks: [
      { condition: "tpsa > 90", flag: "TPSA >90 Å² limits BBB penetration — central activity required", severity: "critical" },
      { condition: "mw > 450", flag: "MW >450 Da reduces CNS exposure in pediatric patients", severity: "warning" },
      { condition: "hepatotoxicity", flag: "Hepatotoxicity unacceptable — pediatric, malnourished cohort", severity: "critical" },
    ],
    datasets: [
      { name: "CDC Nodding Syndrome Registry", source: "CDC/Uganda MoH", url: "https://www.cdc.gov/global-health/countries/uganda.html", description: "Clinical and epidemiological case data", compounds: 0 },
      { name: "Onchocerciasis Genome (WormBase)", source: "WormBase ParaSite", url: "https://parasite.wormbase.org/", description: "O. volvulus genome and drug-target candidates", compounds: 0 },
      { name: "ChEMBL Antiepileptics", source: "ChEMBL", url: "https://www.ebi.ac.uk/chembl/", description: "Antiepileptic and neuroprotective bioactivity data", compounds: 22400 },
    ],
    contextualGuidance: [
      "Prioritize biomarker discovery (anti-leiomodin-1 antibodies, neurofilament light chain)",
      "Genomic association studies needed to clarify etiology",
      "Pair AI prediction with onchocerciasis elimination programs (mass ivermectin)",
      "Symptomatic CNS-active antiepileptics must be safe in malnourished children",
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
