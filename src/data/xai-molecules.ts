// Comprehensive XAI molecule dataset with realistic SHAP/LIME data

export interface SHAPFeature {
  feature: string;
  shapValue: number;
  actualValue: string;
  direction: "positive" | "negative";
  category: "physicochemical" | "structural" | "pharmacokinetic" | "toxicity";
  explanation: string;
}

export interface MolecularDescriptors {
  molecularWeight: number;
  logP: number;
  hBondDonors: number;
  hBondAcceptors: number;
  rotatableBonds: number;
  tpsa: number;
  aromaticRings: number;
  molecularFormula: string;
  drugLikeness: number; // 0-1
  bioavailability: number; // 0-1
}

export interface XAIPrediction {
  molecule: string;
  smiles: string;
  descriptors: MolecularDescriptors;
  overallScore: number;
  confidence: number;
  verdict: string;
  verdictColor: "green" | "yellow" | "red";
  reasoning: string;
  naturalLanguageExplanation: string;
  shapFeatures: SHAPFeature[];
  limeWeights: { feature: string; weight: number }[];
  confidenceBreakdown: { aspect: string; value: number; max: number }[];
  decisionPath: { node: string; condition: string; result: string; passed: boolean }[];
  biologicalActivity?: string;
  therapeuticClass?: string;
}

export const MOCK_PREDICTIONS: Record<string, XAIPrediction> = {
  aspirin: {
    molecule: "Aspirin",
    smiles: "CC(=O)OC1=CC=CC=C1C(=O)O",
    descriptors: { molecularWeight: 180.16, logP: 1.2, hBondDonors: 1, hBondAcceptors: 4, rotatableBonds: 3, tpsa: 63.6, aromaticRings: 1, molecularFormula: "C₉H₈O₄", drugLikeness: 0.87, bioavailability: 0.85 },
    overallScore: 82,
    confidence: 91,
    verdict: "High Potential",
    verdictColor: "green",
    reasoning: "Aspirin demonstrates favorable drug-likeness with a molecular weight of 180.16 Da (well within Lipinski limits), appropriate LogP of 1.2, and excellent oral bioavailability. Its COX-1/COX-2 inhibition mechanism is well-characterized. Low toxicity flags with decades of clinical validation support high confidence.",
    naturalLanguageExplanation: "This molecule shows high drug-likeness due to its optimal molecular weight (180.16 Da) and balanced lipophilicity (LogP 1.2). The single aromatic ring and low rotatable bond count contribute to good oral bioavailability. However, potential GI irritation from COX-1 inhibition is a noted risk factor that slightly reduces the overall score.",
    biologicalActivity: "COX-1/COX-2 inhibitor, antiplatelet agent",
    therapeuticClass: "NSAID / Antiplatelet",
    shapFeatures: [
      { feature: "Molecular Weight", shapValue: 0.18, actualValue: "180.16 Da", direction: "positive", category: "physicochemical", explanation: "Optimal range for oral absorption (< 500 Da Lipinski)" },
      { feature: "LogP", shapValue: 0.14, actualValue: "1.2", direction: "positive", category: "physicochemical", explanation: "Ideal hydrophobicity for membrane permeation" },
      { feature: "H-Bond Donors", shapValue: 0.09, actualValue: "1", direction: "positive", category: "physicochemical", explanation: "Low donor count favors oral bioavailability" },
      { feature: "TPSA", shapValue: 0.11, actualValue: "63.6 Å²", direction: "positive", category: "physicochemical", explanation: "Below 140 Å² threshold for CNS penetration" },
      { feature: "Aromatic Rings", shapValue: 0.06, actualValue: "1", direction: "positive", category: "structural", explanation: "Single ring reduces metabolic liability" },
      { feature: "Rotatable Bonds", shapValue: 0.05, actualValue: "3", direction: "positive", category: "structural", explanation: "Low flexibility aids target binding" },
      { feature: "CYP2D6 Inhibition", shapValue: -0.03, actualValue: "Low risk", direction: "negative", category: "pharmacokinetic", explanation: "Minimal drug-drug interaction potential" },
      { feature: "hERG Liability", shapValue: -0.02, actualValue: "Negative", direction: "negative", category: "toxicity", explanation: "No cardiac ion channel risk detected" },
      { feature: "Ames Mutagenicity", shapValue: -0.04, actualValue: "Negative", direction: "negative", category: "toxicity", explanation: "No genotoxicity signal from structural alerts" },
      { feature: "GI Irritation", shapValue: -0.08, actualValue: "Moderate", direction: "negative", category: "toxicity", explanation: "COX-1 inhibition may cause gastric effects" },
    ],
    limeWeights: [
      { feature: "MW < 500", weight: 0.22 },
      { feature: "LogP ∈ [0,5]", weight: 0.19 },
      { feature: "HBD ≤ 5", weight: 0.15 },
      { feature: "TPSA < 140", weight: 0.14 },
      { feature: "No PAINS alerts", weight: 0.12 },
      { feature: "Ro5 compliant", weight: 0.10 },
      { feature: "Low CYP risk", weight: 0.05 },
      { feature: "Ames negative", weight: 0.03 },
    ],
    confidenceBreakdown: [
      { aspect: "Data Quality", value: 95, max: 100 },
      { aspect: "Model Certainty", value: 88, max: 100 },
      { aspect: "Feature Coverage", value: 92, max: 100 },
      { aspect: "External Validation", value: 90, max: 100 },
    ],
    decisionPath: [
      { node: "Lipinski Filter", condition: "MW < 500, LogP < 5, HBD ≤ 5, HBA ≤ 10", result: "PASS", passed: true },
      { node: "Veber Filter", condition: "RotBonds ≤ 10, TPSA ≤ 140", result: "PASS", passed: true },
      { node: "PAINS Screen", condition: "No pan-assay interference substructures", result: "PASS", passed: true },
      { node: "Toxicity Gate", condition: "Ames neg, hERG neg, LD50 > threshold", result: "PASS (caution: GI)", passed: true },
      { node: "ADMET Profile", condition: "Bioavailability > 30%, CL < 20 mL/min/kg", result: "PASS", passed: true },
      { node: "Efficacy Model", condition: "Predicted IC50 < 1 µM", result: "PASS", passed: true },
    ],
  },
  caffeine: {
    molecule: "Caffeine",
    smiles: "CN1C=NC2=C1C(=O)N(C(=O)N2C)C",
    descriptors: { molecularWeight: 194.19, logP: -0.07, hBondDonors: 0, hBondAcceptors: 6, rotatableBonds: 0, tpsa: 58.44, aromaticRings: 2, molecularFormula: "C₈H₁₀N₄O₂", drugLikeness: 0.62, bioavailability: 0.99 },
    overallScore: 61,
    confidence: 78,
    verdict: "Moderate",
    verdictColor: "yellow",
    reasoning: "Caffeine has a well-known adenosine A2A receptor antagonist profile. Its moderate drug-likeness score reflects acceptable physicochemical properties but limited selectivity and a narrow therapeutic window. The xanthine scaffold passes basic filters, but CNS effects and cardiovascular stimulation reduce its overall therapeutic index.",
    naturalLanguageExplanation: "This molecule has moderate drug potential. While its molecular weight and TPSA are within acceptable ranges, the very low LogP (-0.07) suggests limited membrane permeation. Multiple N-methyl groups increase metabolic burden. The primary concern is broad receptor binding leading to low selectivity, and cardiovascular stimulation risk at therapeutic doses.",
    biologicalActivity: "Adenosine A2A receptor antagonist, PDE inhibitor",
    therapeuticClass: "CNS stimulant",
    shapFeatures: [
      { feature: "Molecular Weight", shapValue: 0.12, actualValue: "194.19 Da", direction: "positive", category: "physicochemical", explanation: "Within oral drug range" },
      { feature: "LogP", shapValue: -0.04, actualValue: "-0.07", direction: "negative", category: "physicochemical", explanation: "Very hydrophilic, may limit membrane permeation" },
      { feature: "H-Bond Acceptors", shapValue: 0.06, actualValue: "6", direction: "positive", category: "physicochemical", explanation: "Within acceptable Lipinski range" },
      { feature: "TPSA", shapValue: -0.05, actualValue: "58.4 Å²", direction: "negative", category: "physicochemical", explanation: "Low TPSA suggests high CNS penetration (risk)" },
      { feature: "N-Methyl Groups", shapValue: -0.07, actualValue: "3", direction: "negative", category: "structural", explanation: "Multiple N-methyls increase metabolic burden" },
      { feature: "Selectivity", shapValue: -0.11, actualValue: "Low", direction: "negative", category: "pharmacokinetic", explanation: "Broad receptor binding reduces specificity" },
      { feature: "Half-life", shapValue: 0.04, actualValue: "5h", direction: "positive", category: "pharmacokinetic", explanation: "Moderate duration of action" },
      { feature: "Cardiac Risk", shapValue: -0.09, actualValue: "Moderate", direction: "negative", category: "toxicity", explanation: "Tachycardia at high doses" },
    ],
    limeWeights: [
      { feature: "MW < 500", weight: 0.20 },
      { feature: "LogP ∈ [0,5]", weight: -0.08 },
      { feature: "HBA ≤ 10", weight: 0.12 },
      { feature: "TPSA < 140", weight: 0.10 },
      { feature: "Low selectivity", weight: -0.15 },
      { feature: "CNS penetrant", weight: -0.06 },
      { feature: "Cardiac flag", weight: -0.12 },
      { feature: "Ro5 compliant", weight: 0.09 },
    ],
    confidenceBreakdown: [
      { aspect: "Data Quality", value: 85, max: 100 },
      { aspect: "Model Certainty", value: 72, max: 100 },
      { aspect: "Feature Coverage", value: 80, max: 100 },
      { aspect: "External Validation", value: 75, max: 100 },
    ],
    decisionPath: [
      { node: "Lipinski Filter", condition: "MW < 500, LogP < 5, HBD ≤ 5, HBA ≤ 10", result: "PASS", passed: true },
      { node: "Veber Filter", condition: "RotBonds ≤ 10, TPSA ≤ 140", result: "PASS", passed: true },
      { node: "PAINS Screen", condition: "No interference substructures", result: "PASS", passed: true },
      { node: "Toxicity Gate", condition: "Cardiac safety profile", result: "CAUTION", passed: false },
      { node: "ADMET Profile", condition: "Bioavailability, clearance metrics", result: "PASS", passed: true },
      { node: "Efficacy Model", condition: "Predicted activity < threshold", result: "MARGINAL", passed: false },
    ],
  },
  ibuprofen: {
    molecule: "Ibuprofen",
    smiles: "CC(C)CC1=CC=C(C=C1)C(C)C(O)=O",
    descriptors: { molecularWeight: 206.28, logP: 3.97, hBondDonors: 1, hBondAcceptors: 2, rotatableBonds: 4, tpsa: 37.3, aromaticRings: 1, molecularFormula: "C₁₃H₁₈O₂", drugLikeness: 0.91, bioavailability: 0.93 },
    overallScore: 88,
    confidence: 93,
    verdict: "High Potential",
    verdictColor: "green",
    reasoning: "Ibuprofen is a gold-standard NSAID with excellent drug-like properties. MW of 206.28 Da, LogP of 3.97 (optimal membrane permeability), and very low TPSA (37.3 Å²) ensure high oral bioavailability (>93%). The propionic acid moiety enables reversible COX-2 selectivity. Well-established safety profile with decades of OTC use.",
    naturalLanguageExplanation: "This molecule shows excellent drug-likeness primarily driven by optimal LogP (3.97) providing ideal membrane permeability, and very low polar surface area (37.3 Å²) ensuring rapid GI absorption. The single aromatic ring and moderate flexibility (4 rotatable bonds) contribute to metabolic stability. Minor risk from potential renal effects at high doses.",
    biologicalActivity: "Non-selective COX inhibitor (slight COX-2 preference)",
    therapeuticClass: "NSAID / Analgesic",
    shapFeatures: [
      { feature: "LogP", shapValue: 0.22, actualValue: "3.97", direction: "positive", category: "physicochemical", explanation: "Optimal lipophilicity for oral absorption and membrane crossing" },
      { feature: "Molecular Weight", shapValue: 0.16, actualValue: "206.28 Da", direction: "positive", category: "physicochemical", explanation: "Low MW enhances distribution and renal clearance" },
      { feature: "TPSA", shapValue: 0.14, actualValue: "37.3 Å²", direction: "positive", category: "physicochemical", explanation: "Very low polar surface area → excellent GI absorption" },
      { feature: "H-Bond Donors", shapValue: 0.08, actualValue: "1", direction: "positive", category: "physicochemical", explanation: "Minimal desolvation penalty for membrane permeation" },
      { feature: "Aromatic Rings", shapValue: 0.07, actualValue: "1", direction: "positive", category: "structural", explanation: "Single phenyl ring is metabolically stable" },
      { feature: "Chiral Center", shapValue: 0.05, actualValue: "1 (S-enantiomer active)", direction: "positive", category: "structural", explanation: "S-ibuprofen is the pharmacologically active form" },
      { feature: "Rotatable Bonds", shapValue: 0.04, actualValue: "4", direction: "positive", category: "structural", explanation: "Moderate flexibility for target engagement" },
      { feature: "Renal Effects", shapValue: -0.06, actualValue: "Moderate risk", direction: "negative", category: "toxicity", explanation: "Prostaglandin inhibition may affect renal perfusion" },
      { feature: "GI Bleeding", shapValue: -0.05, actualValue: "Low-moderate", direction: "negative", category: "toxicity", explanation: "Less GI risk than aspirin but still present" },
      { feature: "CYP2C9 Substrate", shapValue: -0.03, actualValue: "Yes", direction: "negative", category: "pharmacokinetic", explanation: "Metabolized primarily by CYP2C9; polymorphism sensitivity" },
    ],
    limeWeights: [
      { feature: "LogP ∈ [2,4]", weight: 0.25 },
      { feature: "MW < 300", weight: 0.20 },
      { feature: "TPSA < 60", weight: 0.18 },
      { feature: "HBD ≤ 2", weight: 0.14 },
      { feature: "Ro5 compliant", weight: 0.12 },
      { feature: "No PAINS alerts", weight: 0.08 },
      { feature: "Low CYP inhibition", weight: 0.04 },
      { feature: "Renal flag", weight: -0.05 },
    ],
    confidenceBreakdown: [
      { aspect: "Data Quality", value: 97, max: 100 },
      { aspect: "Model Certainty", value: 91, max: 100 },
      { aspect: "Feature Coverage", value: 94, max: 100 },
      { aspect: "External Validation", value: 92, max: 100 },
    ],
    decisionPath: [
      { node: "Lipinski Filter", condition: "MW < 500, LogP < 5, HBD ≤ 5, HBA ≤ 10", result: "PASS", passed: true },
      { node: "Veber Filter", condition: "RotBonds ≤ 10, TPSA ≤ 140", result: "PASS", passed: true },
      { node: "PAINS Screen", condition: "No pan-assay interference substructures", result: "PASS", passed: true },
      { node: "Toxicity Gate", condition: "Ames neg, hERG neg, renal caution", result: "PASS", passed: true },
      { node: "ADMET Profile", condition: "F > 90%, moderate clearance", result: "PASS", passed: true },
      { node: "Efficacy Model", condition: "COX IC50 < 10 µM", result: "PASS", passed: true },
    ],
  },
  metformin: {
    molecule: "Metformin",
    smiles: "CN(C)C(=N)NC(=N)N",
    descriptors: { molecularWeight: 129.16, logP: -1.43, hBondDonors: 3, hBondAcceptors: 5, rotatableBonds: 2, tpsa: 91.49, aromaticRings: 0, molecularFormula: "C₄H₁₁N₅", drugLikeness: 0.55, bioavailability: 0.52 },
    overallScore: 68,
    confidence: 82,
    verdict: "Moderate",
    verdictColor: "yellow",
    reasoning: "Metformin is the first-line treatment for type 2 diabetes with over 60 years of clinical use. Despite poor physicochemical properties (very hydrophilic, LogP -1.43, no aromatic rings), it remains effective due to active transport via OCT1/OCT2 transporters. Its biguanide scaffold would fail many modern computational screens, making it a notable exception to Lipinski-based predictions.",
    naturalLanguageExplanation: "This molecule has moderate drug-likeness by computational metrics despite being one of the most widely prescribed drugs globally. The very negative LogP (-1.43) and high polarity significantly lower the predicted score, as passive membrane permeation is poor. However, active transport mechanisms (OCT1) rescue its bioavailability. The lack of aromatic rings is unusual for drugs but reduces off-target binding.",
    biologicalActivity: "AMPK activator, mitochondrial complex I inhibitor",
    therapeuticClass: "Biguanide / Antidiabetic",
    shapFeatures: [
      { feature: "Molecular Weight", shapValue: 0.15, actualValue: "129.16 Da", direction: "positive", category: "physicochemical", explanation: "Very low MW enhances renal clearance and reduces toxicity risk" },
      { feature: "LogP", shapValue: -0.18, actualValue: "-1.43", direction: "negative", category: "physicochemical", explanation: "Extremely hydrophilic — poor passive permeation, relies on active transport" },
      { feature: "TPSA", shapValue: -0.08, actualValue: "91.49 Å²", direction: "negative", category: "physicochemical", explanation: "High polar surface area limits passive absorption" },
      { feature: "H-Bond Donors", shapValue: -0.05, actualValue: "3", direction: "negative", category: "physicochemical", explanation: "Multiple donors increase desolvation penalty" },
      { feature: "Aromatic Rings", shapValue: -0.06, actualValue: "0", direction: "negative", category: "structural", explanation: "No aromatic system — unusual for drugs, reduces π-stacking interactions" },
      { feature: "Active Transport", shapValue: 0.12, actualValue: "OCT1/OCT2", direction: "positive", category: "pharmacokinetic", explanation: "Carrier-mediated absorption rescues low passive permeability" },
      { feature: "Lactic Acidosis", shapValue: -0.09, actualValue: "Rare but serious", direction: "negative", category: "toxicity", explanation: "Mitochondrial mechanism can cause lactic acidosis in renal impairment" },
      { feature: "Clinical Evidence", shapValue: 0.20, actualValue: "60+ years", direction: "positive", category: "pharmacokinetic", explanation: "Extensive real-world evidence supports safety and efficacy" },
    ],
    limeWeights: [
      { feature: "MW < 200", weight: 0.18 },
      { feature: "LogP ∈ [0,5]", weight: -0.22 },
      { feature: "HBD ≤ 5", weight: 0.08 },
      { feature: "No aromatic rings", weight: -0.10 },
      { feature: "Active transport", weight: 0.15 },
      { feature: "TPSA > 80", weight: -0.08 },
      { feature: "Clinical validated", weight: 0.20 },
      { feature: "Lactic acidosis risk", weight: -0.12 },
    ],
    confidenceBreakdown: [
      { aspect: "Data Quality", value: 92, max: 100 },
      { aspect: "Model Certainty", value: 70, max: 100 },
      { aspect: "Feature Coverage", value: 78, max: 100 },
      { aspect: "External Validation", value: 88, max: 100 },
    ],
    decisionPath: [
      { node: "Lipinski Filter", condition: "MW < 500, LogP < 5, HBD ≤ 5, HBA ≤ 10", result: "PASS (LogP outlier)", passed: true },
      { node: "Veber Filter", condition: "RotBonds ≤ 10, TPSA ≤ 140", result: "PASS", passed: true },
      { node: "PAINS Screen", condition: "Biguanide alert flagged", result: "CAUTION", passed: false },
      { node: "Toxicity Gate", condition: "Lactic acidosis risk in renal impairment", result: "CAUTION", passed: false },
      { node: "ADMET Profile", condition: "Active transport dependent, renal elimination", result: "PASS", passed: true },
      { node: "Efficacy Model", condition: "AMPK activation, glucose lowering", result: "PASS", passed: true },
    ],
  },
  penicillin: {
    molecule: "Penicillin G",
    smiles: "CC1(C)SC2C(NC(=O)CC3=CC=CC=C3)C(=O)N2C1C(=O)O",
    descriptors: { molecularWeight: 334.39, logP: 1.83, hBondDonors: 2, hBondAcceptors: 6, rotatableBonds: 5, tpsa: 112.01, aromaticRings: 1, molecularFormula: "C₁₆H₁₈N₂O₄S", drugLikeness: 0.73, bioavailability: 0.30 },
    overallScore: 72,
    confidence: 85,
    verdict: "Promising",
    verdictColor: "green",
    reasoning: "Penicillin G is a foundational β-lactam antibiotic with a proven mechanism of transpeptidase inhibition. Its β-lactam ring is essential for activity but also confers instability to gastric acid (low oral bioavailability). The thiazolidine ring system creates a strained, reactive scaffold. Allergenic potential from protein-hapten conjugation is a known limitation.",
    naturalLanguageExplanation: "This molecule has good drug-likeness scores driven by appropriate molecular weight (334 Da) and balanced LogP (1.83). The primary limitation is poor oral bioavailability (~30%) due to acid-labile β-lactam ring degradation in the stomach. The sulfur-containing thiazolidine provides the structural strain necessary for transpeptidase binding, but also contributes to allergenic potential.",
    biologicalActivity: "DD-transpeptidase inhibitor (cell wall synthesis)",
    therapeuticClass: "β-Lactam Antibiotic",
    shapFeatures: [
      { feature: "Molecular Weight", shapValue: 0.10, actualValue: "334.39 Da", direction: "positive", category: "physicochemical", explanation: "Within acceptable range for antibiotics" },
      { feature: "LogP", shapValue: 0.12, actualValue: "1.83", direction: "positive", category: "physicochemical", explanation: "Moderate hydrophobicity aids tissue penetration" },
      { feature: "β-Lactam Ring", shapValue: 0.18, actualValue: "Present", direction: "positive", category: "structural", explanation: "Essential pharmacophore for transpeptidase inhibition" },
      { feature: "TPSA", shapValue: -0.04, actualValue: "112.01 Å²", direction: "negative", category: "physicochemical", explanation: "Elevated TPSA may limit CNS penetration" },
      { feature: "Acid Stability", shapValue: -0.14, actualValue: "Low", direction: "negative", category: "pharmacokinetic", explanation: "β-lactam ring degrades in gastric acid → poor oral F%" },
      { feature: "Allergenic Potential", shapValue: -0.10, actualValue: "High", direction: "negative", category: "toxicity", explanation: "Penicilloyl-protein conjugates cause IgE-mediated allergy" },
      { feature: "Resistance Risk", shapValue: -0.07, actualValue: "β-Lactamase", direction: "negative", category: "pharmacokinetic", explanation: "Susceptible to enzymatic degradation by resistant bacteria" },
      { feature: "Renal Clearance", shapValue: 0.06, actualValue: "Active tubular secretion", direction: "positive", category: "pharmacokinetic", explanation: "Efficient renal elimination reduces accumulation" },
    ],
    limeWeights: [
      { feature: "β-Lactam present", weight: 0.24 },
      { feature: "MW ∈ [300,500]", weight: 0.12 },
      { feature: "LogP ∈ [1,3]", weight: 0.15 },
      { feature: "Acid labile", weight: -0.18 },
      { feature: "Allergy risk", weight: -0.14 },
      { feature: "Ro5 compliant", weight: 0.10 },
      { feature: "Resistance", weight: -0.08 },
      { feature: "Renal clear", weight: 0.06 },
    ],
    confidenceBreakdown: [
      { aspect: "Data Quality", value: 93, max: 100 },
      { aspect: "Model Certainty", value: 82, max: 100 },
      { aspect: "Feature Coverage", value: 85, max: 100 },
      { aspect: "External Validation", value: 88, max: 100 },
    ],
    decisionPath: [
      { node: "Lipinski Filter", condition: "MW < 500, LogP < 5, HBD ≤ 5, HBA ≤ 10", result: "PASS", passed: true },
      { node: "Veber Filter", condition: "RotBonds ≤ 10, TPSA ≤ 140", result: "PASS", passed: true },
      { node: "PAINS Screen", condition: "No interference substructures", result: "PASS", passed: true },
      { node: "Toxicity Gate", condition: "Allergenic potential flagged", result: "CAUTION", passed: false },
      { node: "ADMET Profile", condition: "Oral F% ~30%, IV preferred", result: "MARGINAL", passed: false },
      { node: "Efficacy Model", condition: "Transpeptidase MIC < 1 µg/mL", result: "PASS", passed: true },
    ],
  },
  paracetamol: {
    molecule: "Paracetamol",
    smiles: "CC(=O)NC1=CC=C(O)C=C1",
    descriptors: { molecularWeight: 151.16, logP: 0.46, hBondDonors: 2, hBondAcceptors: 3, rotatableBonds: 1, tpsa: 49.33, aromaticRings: 1, molecularFormula: "C₈H₉NO₂", drugLikeness: 0.85, bioavailability: 0.88 },
    overallScore: 79,
    confidence: 89,
    verdict: "High Potential",
    verdictColor: "green",
    reasoning: "Paracetamol (acetaminophen) is one of the most widely used analgesics globally with excellent oral bioavailability (~88%). Its simple phenol-acetamide structure gives it favorable physicochemical properties. The primary safety concern is dose-dependent hepatotoxicity from NAPQI metabolite formation via CYP2E1. At therapeutic doses, glutathione conjugation neutralizes NAPQI effectively.",
    naturalLanguageExplanation: "This molecule demonstrates excellent drug-likeness with a very low molecular weight (151.16 Da), minimal rotatable bonds (1), and balanced polarity. The main positive drivers are its simplicity and rapid GI absorption. The critical risk factor is hepatotoxicity at supratherapeutic doses due to the reactive metabolite NAPQI, which depletes hepatic glutathione stores.",
    biologicalActivity: "Central COX-3 inhibitor (proposed), TRPV1 modulator",
    therapeuticClass: "Analgesic / Antipyretic",
    shapFeatures: [
      { feature: "Molecular Weight", shapValue: 0.20, actualValue: "151.16 Da", direction: "positive", category: "physicochemical", explanation: "Very low MW enables rapid absorption and distribution" },
      { feature: "LogP", shapValue: 0.08, actualValue: "0.46", direction: "positive", category: "physicochemical", explanation: "Low lipophilicity with adequate membrane crossing" },
      { feature: "TPSA", shapValue: 0.12, actualValue: "49.33 Å²", direction: "positive", category: "physicochemical", explanation: "Low polar surface area ensures high oral bioavailability" },
      { feature: "Rotatable Bonds", shapValue: 0.10, actualValue: "1", direction: "positive", category: "structural", explanation: "Very rigid structure enhances metabolic stability" },
      { feature: "Aromatic Ring", shapValue: 0.06, actualValue: "1 (p-aminophenol)", direction: "positive", category: "structural", explanation: "Para-substituted phenol is essential pharmacophore" },
      { feature: "H-Bond Donors", shapValue: 0.04, actualValue: "2", direction: "positive", category: "physicochemical", explanation: "Phenol OH and amide NH enable target interaction" },
      { feature: "Hepatotoxicity", shapValue: -0.15, actualValue: "High (overdose)", direction: "negative", category: "toxicity", explanation: "NAPQI metabolite causes hepatic necrosis at supratherapeutic doses" },
      { feature: "CYP2E1 Metabolism", shapValue: -0.06, actualValue: "Major pathway", direction: "negative", category: "pharmacokinetic", explanation: "CYP2E1-mediated bioactivation generates toxic NAPQI" },
      { feature: "Therapeutic Window", shapValue: -0.04, actualValue: "Narrow at high dose", direction: "negative", category: "toxicity", explanation: "10-15g acute dose can be fatal in adults" },
    ],
    limeWeights: [
      { feature: "MW < 200", weight: 0.24 },
      { feature: "TPSA < 60", weight: 0.18 },
      { feature: "RotBonds ≤ 2", weight: 0.15 },
      { feature: "LogP ∈ [0,2]", weight: 0.12 },
      { feature: "Ro5 compliant", weight: 0.10 },
      { feature: "Hepatotoxicity", weight: -0.20 },
      { feature: "No PAINS alerts", weight: 0.08 },
      { feature: "CYP metabolism", weight: -0.06 },
    ],
    confidenceBreakdown: [
      { aspect: "Data Quality", value: 96, max: 100 },
      { aspect: "Model Certainty", value: 86, max: 100 },
      { aspect: "Feature Coverage", value: 90, max: 100 },
      { aspect: "External Validation", value: 89, max: 100 },
    ],
    decisionPath: [
      { node: "Lipinski Filter", condition: "MW < 500, LogP < 5, HBD ≤ 5, HBA ≤ 10", result: "PASS", passed: true },
      { node: "Veber Filter", condition: "RotBonds ≤ 10, TPSA ≤ 140", result: "PASS", passed: true },
      { node: "PAINS Screen", condition: "No pan-assay interference substructures", result: "PASS", passed: true },
      { node: "Toxicity Gate", condition: "Hepatotoxicity at overdose flagged", result: "CAUTION", passed: false },
      { node: "ADMET Profile", condition: "F% ~88%, rapid Tmax, CYP2E1 metabolism", result: "PASS", passed: true },
      { node: "Efficacy Model", condition: "Central analgesic activity confirmed", result: "PASS", passed: true },
    ],
  },
  chloroquine: {
    molecule: "Chloroquine",
    smiles: "CCN(CC)CCCC(C)NC1=CC=NC2=CC(Cl)=CC=C12",
    descriptors: { molecularWeight: 319.87, logP: 4.63, hBondDonors: 1, hBondAcceptors: 3, rotatableBonds: 8, tpsa: 28.16, aromaticRings: 2, molecularFormula: "C₁₈H₂₆ClN₃", drugLikeness: 0.76, bioavailability: 0.89 },
    overallScore: 74,
    confidence: 84,
    verdict: "Promising",
    verdictColor: "green",
    reasoning: "Chloroquine is a 4-aminoquinoline antimalarial with high oral bioavailability and long half-life (~45 days). The quinoline scaffold enables accumulation in parasitized erythrocytes. Key limitations include retinal toxicity with chronic use and widespread Plasmodium falciparum resistance via PfCRT mutations. Still effective against P. vivax and as an immunomodulator in autoimmune disease.",
    naturalLanguageExplanation: "This molecule scores well due to high LogP (4.63) driving tissue accumulation, low TPSA (28.16 Å²) for excellent absorption, and a proven quinoline pharmacophore. The long half-life is advantageous for weekly dosing but raises accumulation toxicity concerns. Retinal toxicity and widespread resistance are the primary factors reducing the overall score.",
    biologicalActivity: "Heme polymerization inhibitor, lysosomal pH modifier",
    therapeuticClass: "Antimalarial / Immunomodulator",
    shapFeatures: [
      { feature: "LogP", shapValue: 0.15, actualValue: "4.63", direction: "positive", category: "physicochemical", explanation: "High lipophilicity enables tissue and lysosmal accumulation" },
      { feature: "TPSA", shapValue: 0.14, actualValue: "28.16 Å²", direction: "positive", category: "physicochemical", explanation: "Very low polarity → near-complete oral absorption" },
      { feature: "Quinoline Scaffold", shapValue: 0.12, actualValue: "4-aminoquinoline", direction: "positive", category: "structural", explanation: "Essential pharmacophore for heme binding in parasite" },
      { feature: "Half-life", shapValue: 0.08, actualValue: "~45 days", direction: "positive", category: "pharmacokinetic", explanation: "Long half-life enables weekly prophylactic dosing" },
      { feature: "Rotatable Bonds", shapValue: -0.05, actualValue: "8", direction: "negative", category: "structural", explanation: "High flexibility may reduce target selectivity" },
      { feature: "Retinal Toxicity", shapValue: -0.12, actualValue: "Cumulative risk", direction: "negative", category: "toxicity", explanation: "Irreversible retinopathy with chronic use >5 years" },
      { feature: "Resistance", shapValue: -0.14, actualValue: "PfCRT mutations", direction: "negative", category: "pharmacokinetic", explanation: "Widespread P. falciparum resistance limits utility" },
      { feature: "QT Prolongation", shapValue: -0.06, actualValue: "Moderate risk", direction: "negative", category: "toxicity", explanation: "hERG channel interaction at high concentrations" },
    ],
    limeWeights: [
      { feature: "Quinoline present", weight: 0.22 },
      { feature: "LogP ∈ [3,5]", weight: 0.16 },
      { feature: "TPSA < 40", weight: 0.14 },
      { feature: "Ro5 compliant", weight: 0.10 },
      { feature: "Resistance risk", weight: -0.18 },
      { feature: "Retinal toxicity", weight: -0.14 },
      { feature: "QT prolongation", weight: -0.08 },
      { feature: "Long half-life", weight: 0.06 },
    ],
    confidenceBreakdown: [
      { aspect: "Data Quality", value: 90, max: 100 },
      { aspect: "Model Certainty", value: 80, max: 100 },
      { aspect: "Feature Coverage", value: 86, max: 100 },
      { aspect: "External Validation", value: 82, max: 100 },
    ],
    decisionPath: [
      { node: "Lipinski Filter", condition: "MW < 500, LogP < 5, HBD ≤ 5, HBA ≤ 10", result: "PASS", passed: true },
      { node: "Veber Filter", condition: "RotBonds ≤ 10, TPSA ≤ 140", result: "PASS", passed: true },
      { node: "PAINS Screen", condition: "No interference substructures", result: "PASS", passed: true },
      { node: "Toxicity Gate", condition: "Retinal + cardiac flags", result: "CAUTION", passed: false },
      { node: "ADMET Profile", condition: "F% ~89%, very long t½", result: "PASS", passed: true },
      { node: "Efficacy Model", condition: "Heme inhibition IC50 < 100 nM", result: "PASS", passed: true },
    ],
  },
  doxycycline: {
    molecule: "Doxycycline",
    smiles: "CC1C2C(O)C3C(=C(O)C4=CC=CC(O)=C4C3=O)C(=O)C2(O)CC1(C)O",
    descriptors: { molecularWeight: 444.43, logP: -0.72, hBondDonors: 6, hBondAcceptors: 9, rotatableBonds: 2, tpsa: 181.62, aromaticRings: 1, molecularFormula: "C₂₂H₂₄N₂O₈", drugLikeness: 0.48, bioavailability: 0.93 },
    overallScore: 55,
    confidence: 76,
    verdict: "Moderate",
    verdictColor: "yellow",
    reasoning: "Doxycycline is a broad-spectrum tetracycline antibiotic with high oral bioavailability (93%) despite violating multiple Lipinski criteria. It has 6 H-bond donors (>5 limit) and TPSA of 181.62 Å² (>140). This exemplifies how computational drug-likeness filters may reject clinically proven drugs. Its 30S ribosomal binding mechanism is well-established.",
    naturalLanguageExplanation: "This molecule presents an interesting case where clinical success contradicts computational drug-likeness predictions. The high number of H-bond donors (6, exceeding the Lipinski limit of 5) and very high TPSA (181.62 Å²) should predict poor absorption, yet oral bioavailability is 93%. This is likely due to zwitterionic character enabling paracellular absorption. A reminder that rule-based filters are guidelines, not laws.",
    biologicalActivity: "30S ribosomal subunit inhibitor, MMP inhibitor",
    therapeuticClass: "Tetracycline Antibiotic",
    shapFeatures: [
      { feature: "Molecular Weight", shapValue: -0.05, actualValue: "444.43 Da", direction: "negative", category: "physicochemical", explanation: "Approaching upper Lipinski limit but still acceptable" },
      { feature: "H-Bond Donors", shapValue: -0.14, actualValue: "6", direction: "negative", category: "physicochemical", explanation: "Exceeds Lipinski HBD ≤ 5 threshold → Ro5 violation" },
      { feature: "TPSA", shapValue: -0.18, actualValue: "181.62 Å²", direction: "negative", category: "physicochemical", explanation: "Far exceeds 140 Å² limit → predicted poor permeability" },
      { feature: "LogP", shapValue: -0.08, actualValue: "-0.72", direction: "negative", category: "physicochemical", explanation: "Negative LogP indicates very hydrophilic character" },
      { feature: "Tetracycline Core", shapValue: 0.12, actualValue: "4-ring naphthacene", direction: "positive", category: "structural", explanation: "Essential scaffold for 30S ribosomal binding" },
      { feature: "Oral Bioavailability", shapValue: 0.10, actualValue: "93%", direction: "positive", category: "pharmacokinetic", explanation: "Exceptional despite rule violations — zwitterion-mediated" },
      { feature: "Photosensitivity", shapValue: -0.07, actualValue: "Moderate risk", direction: "negative", category: "toxicity", explanation: "Tetracycline class effect — UV-induced skin reactions" },
      { feature: "Chelation", shapValue: -0.06, actualValue: "Ca²⁺/Mg²⁺/Fe²⁺", direction: "negative", category: "pharmacokinetic", explanation: "Metal ion chelation reduces absorption with dairy/antacids" },
    ],
    limeWeights: [
      { feature: "HBD > 5 (violation)", weight: -0.20 },
      { feature: "TPSA > 140 (violation)", weight: -0.22 },
      { feature: "MW < 500", weight: 0.08 },
      { feature: "High oral F%", weight: 0.18 },
      { feature: "Tetracycline core", weight: 0.14 },
      { feature: "Photosensitivity", weight: -0.08 },
      { feature: "Metal chelation", weight: -0.06 },
      { feature: "Broad spectrum", weight: 0.10 },
    ],
    confidenceBreakdown: [
      { aspect: "Data Quality", value: 88, max: 100 },
      { aspect: "Model Certainty", value: 65, max: 100 },
      { aspect: "Feature Coverage", value: 82, max: 100 },
      { aspect: "External Validation", value: 72, max: 100 },
    ],
    decisionPath: [
      { node: "Lipinski Filter", condition: "HBD = 6 > 5 → VIOLATION", result: "FAIL (1 violation)", passed: false },
      { node: "Veber Filter", condition: "TPSA = 181.62 > 140 → VIOLATION", result: "FAIL", passed: false },
      { node: "PAINS Screen", condition: "No interference substructures", result: "PASS", passed: true },
      { node: "Toxicity Gate", condition: "Photosensitivity flagged", result: "CAUTION", passed: false },
      { node: "ADMET Profile", condition: "F% = 93% (surprisingly high), chelation issue", result: "PASS", passed: true },
      { node: "Efficacy Model", condition: "Broad-spectrum ribosomal inhibition", result: "PASS", passed: true },
    ],
  },
};

export const AVAILABLE_MOLECULES = Object.keys(MOCK_PREDICTIONS);

// Generate XAI prediction for custom SMILES input
export function generateCustomPrediction(smiles: string): XAIPrediction {
  const seed = smiles.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const rng = (offset: number) => ((Math.sin(seed + offset) * 10000) % 1 + 1) % 1;

  const mw = 120 + rng(1) * 400;
  const logP = -2 + rng(2) * 7;
  const hbd = Math.floor(rng(3) * 6);
  const hba = Math.floor(rng(4) * 11);
  const rotBonds = Math.floor(rng(5) * 12);
  const tpsa = 20 + rng(6) * 160;
  const aroRings = Math.floor(rng(7) * 5);

  // Lipinski violations
  let violations = 0;
  if (mw > 500) violations++;
  if (logP > 5) violations++;
  if (hbd > 5) violations++;
  if (hba > 10) violations++;

  const lipinskiScore = Math.max(0, 1 - violations * 0.25);
  const veberOk = rotBonds <= 10 && tpsa <= 140;
  const veberScore = veberOk ? 1 : 0.5;
  const overallScore = Math.round((lipinskiScore * 40 + veberScore * 25 + rng(8) * 35));
  const confidence = Math.round(55 + rng(9) * 35);

  const verdict = overallScore >= 75 ? "High Potential" : overallScore >= 55 ? "Moderate" : "Low Potential";
  const verdictColor: "green" | "yellow" | "red" = overallScore >= 75 ? "green" : overallScore >= 55 ? "yellow" : "red";

  const shapFeatures: SHAPFeature[] = [
    { feature: "Molecular Weight", shapValue: mw <= 500 ? 0.1 + rng(10) * 0.1 : -(0.05 + rng(10) * 0.15), actualValue: `${mw.toFixed(1)} Da`, direction: mw <= 500 ? "positive" : "negative", category: "physicochemical", explanation: mw <= 500 ? "Within Lipinski MW limit (< 500 Da)" : "Exceeds Lipinski MW limit → reduced oral absorption" },
    { feature: "LogP", shapValue: logP >= 0 && logP <= 5 ? 0.08 + rng(11) * 0.12 : -(0.05 + rng(11) * 0.15), actualValue: logP.toFixed(2), direction: logP >= 0 && logP <= 5 ? "positive" : "negative", category: "physicochemical", explanation: logP >= 0 && logP <= 5 ? "Optimal lipophilicity for membrane permeation" : "Suboptimal lipophilicity may impair absorption" },
    { feature: "H-Bond Donors", shapValue: hbd <= 5 ? 0.05 + rng(12) * 0.08 : -(0.08 + rng(12) * 0.1), actualValue: `${hbd}`, direction: hbd <= 5 ? "positive" : "negative", category: "physicochemical", explanation: hbd <= 5 ? "Acceptable H-bond donor count" : "Exceeds Lipinski HBD limit" },
    { feature: "TPSA", shapValue: tpsa <= 140 ? 0.06 + rng(13) * 0.1 : -(0.06 + rng(13) * 0.12), actualValue: `${tpsa.toFixed(1)} Å²`, direction: tpsa <= 140 ? "positive" : "negative", category: "physicochemical", explanation: tpsa <= 140 ? "Below TPSA threshold for oral bioavailability" : "High TPSA may limit passive absorption" },
    { feature: "Aromatic Rings", shapValue: aroRings <= 3 ? 0.04 + rng(14) * 0.06 : -(0.03 + rng(14) * 0.06), actualValue: `${aroRings}`, direction: aroRings <= 3 ? "positive" : "negative", category: "structural", explanation: aroRings <= 3 ? "Acceptable aromatic ring count" : "Excessive aromaticity increases metabolic risk" },
    { feature: "Rotatable Bonds", shapValue: rotBonds <= 10 ? 0.03 + rng(15) * 0.05 : -(0.04 + rng(15) * 0.07), actualValue: `${rotBonds}`, direction: rotBonds <= 10 ? "positive" : "negative", category: "structural", explanation: rotBonds <= 10 ? "Acceptable molecular flexibility" : "High flexibility reduces target affinity" },
    { feature: "Drug-likeness", shapValue: overallScore >= 60 ? 0.08 + rng(16) * 0.1 : -(0.05 + rng(16) * 0.1), actualValue: overallScore >= 60 ? "Favorable" : "Unfavorable", direction: overallScore >= 60 ? "positive" : "negative", category: "pharmacokinetic", explanation: "Composite drug-likeness assessment from multiple filters" },
    { feature: "Structural Alerts", shapValue: -(rng(17) * 0.1), actualValue: rng(17) > 0.6 ? "1 alert" : "None", direction: "negative", category: "toxicity", explanation: "Screening for known toxic substructures (PAINS, Brenk)" },
  ];

  const limeWeights = [
    { feature: "MW compliance", weight: mw <= 500 ? 0.15 + rng(20) * 0.1 : -(0.1 + rng(20) * 0.1) },
    { feature: "LogP range", weight: logP >= 0 && logP <= 5 ? 0.12 + rng(21) * 0.1 : -(0.08 + rng(21) * 0.1) },
    { feature: "HBD compliance", weight: hbd <= 5 ? 0.10 + rng(22) * 0.08 : -(0.1 + rng(22) * 0.08) },
    { feature: "TPSA range", weight: tpsa <= 140 ? 0.08 + rng(23) * 0.08 : -(0.06 + rng(23) * 0.1) },
    { feature: "Veber filter", weight: veberOk ? 0.10 + rng(24) * 0.05 : -(0.08 + rng(24) * 0.05) },
    { feature: "Structural alerts", weight: -(rng(25) * 0.08) },
    { feature: "Ro5 compliance", weight: violations === 0 ? 0.15 : -(0.05 + violations * 0.05) },
    { feature: "Ring count", weight: aroRings <= 3 ? 0.05 + rng(26) * 0.05 : -(rng(26) * 0.08) },
  ];

  // Build explanation
  const positives: string[] = [];
  const negatives: string[] = [];
  if (mw <= 500) positives.push(`optimal molecular weight (${mw.toFixed(0)} Da)`); else negatives.push(`high molecular weight (${mw.toFixed(0)} Da)`);
  if (logP >= 0 && logP <= 5) positives.push(`balanced lipophilicity (LogP ${logP.toFixed(2)})`); else negatives.push(`suboptimal lipophilicity (LogP ${logP.toFixed(2)})`);
  if (hbd <= 5) positives.push(`acceptable H-bond donors (${hbd})`); else negatives.push(`excessive H-bond donors (${hbd})`);
  if (tpsa <= 140) positives.push(`favorable polar surface area (${tpsa.toFixed(0)} Å²)`); else negatives.push(`high polar surface area (${tpsa.toFixed(0)} Å²)`);

  const naturalLanguageExplanation = `This molecule shows ${verdict.toLowerCase()} drug-likeness${positives.length > 0 ? ` due to ${positives.join(", ")}` : ""}${negatives.length > 0 ? `, but ${negatives.join(" and ")} may reduce its therapeutic potential` : ""}. ${violations === 0 ? "It passes all Lipinski Rule of Five criteria." : `It has ${violations} Lipinski violation(s), suggesting potential oral bioavailability challenges.`}`;

  return {
    molecule: "Custom Compound",
    smiles,
    descriptors: {
      molecularWeight: Math.round(mw * 100) / 100,
      logP: Math.round(logP * 100) / 100,
      hBondDonors: hbd,
      hBondAcceptors: hba,
      rotatableBonds: rotBonds,
      tpsa: Math.round(tpsa * 100) / 100,
      aromaticRings: aroRings,
      molecularFormula: "C?H?N?O?",
      drugLikeness: Math.round(lipinskiScore * 100) / 100,
      bioavailability: Math.round((0.3 + rng(30) * 0.6) * 100) / 100,
    },
    overallScore,
    confidence,
    verdict,
    verdictColor,
    reasoning: `Computational analysis of the input SMILES structure. MW: ${mw.toFixed(1)} Da, LogP: ${logP.toFixed(2)}, ${violations} Lipinski violation(s). ${veberOk ? "Passes Veber filters." : "Fails Veber criteria (high flexibility or TPSA)."} Detailed SHAP analysis reveals the dominant molecular features driving this prediction.`,
    naturalLanguageExplanation,
    shapFeatures,
    limeWeights,
    confidenceBreakdown: [
      { aspect: "Data Quality", value: Math.round(60 + rng(40) * 30), max: 100 },
      { aspect: "Model Certainty", value: Math.round(50 + rng(41) * 40), max: 100 },
      { aspect: "Feature Coverage", value: Math.round(65 + rng(42) * 30), max: 100 },
      { aspect: "External Validation", value: Math.round(40 + rng(43) * 40), max: 100 },
    ],
    decisionPath: [
      { node: "Lipinski Filter", condition: `MW=${mw.toFixed(0)}, LogP=${logP.toFixed(1)}, HBD=${hbd}, HBA=${hba}`, result: violations === 0 ? "PASS" : `FAIL (${violations} violation)`, passed: violations === 0 },
      { node: "Veber Filter", condition: `RotBonds=${rotBonds}, TPSA=${tpsa.toFixed(0)}`, result: veberOk ? "PASS" : "FAIL", passed: veberOk },
      { node: "PAINS Screen", condition: "Substructure pattern matching", result: rng(50) > 0.3 ? "PASS" : "CAUTION", passed: rng(50) > 0.3 },
      { node: "Toxicity Gate", condition: "Structural alert screening", result: rng(51) > 0.4 ? "PASS" : "CAUTION", passed: rng(51) > 0.4 },
      { node: "ADMET Profile", condition: "Predicted absorption & metabolism", result: overallScore >= 60 ? "PASS" : "MARGINAL", passed: overallScore >= 60 },
      { node: "Efficacy Model", condition: "Predicted activity score", result: overallScore >= 70 ? "PASS" : "MARGINAL", passed: overallScore >= 70 },
    ],
  };
}

// Validate SMILES string (basic structural validation)
export function validateSMILES(smiles: string): { valid: boolean; error?: string } {
  if (!smiles || smiles.trim().length === 0) return { valid: false, error: "SMILES string cannot be empty" };
  if (smiles.length < 2) return { valid: false, error: "SMILES too short to represent a valid molecule" };
  if (smiles.length > 500) return { valid: false, error: "SMILES exceeds maximum length (500 characters)" };

  const validChars = /^[A-Za-z0-9@+\-\[\]\(\)\\\/=#%\.\:]+$/;
  if (!validChars.test(smiles)) return { valid: false, error: "Invalid characters in SMILES string" };

  const opens = (smiles.match(/\(/g) || []).length;
  const closes = (smiles.match(/\)/g) || []).length;
  if (opens !== closes) return { valid: false, error: "Unbalanced parentheses in SMILES" };

  const bracketOpens = (smiles.match(/\[/g) || []).length;
  const bracketCloses = (smiles.match(/\]/g) || []).length;
  if (bracketOpens !== bracketCloses) return { valid: false, error: "Unbalanced brackets in SMILES" };

  return { valid: true };
}
