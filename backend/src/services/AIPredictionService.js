/**
 * AIPredictionService — Vitalis AI Backend
 * ─────────────────────────────────────────
 * Architecture contract:
 *
 *   Gemini is a SCIENTIFIC REASONING LAYER only.
 *   It receives validated descriptors and returns natural-language interpretation.
 *   It NEVER calculates descriptors, generates SMILES, or invents pharmacology.
 *
 *   Pipeline:
 *     1. Validated descriptors (PubChem / rule-based) → injected into context
 *     2. System prompt enforces pharmaceutical-grade behavior
 *     3. Gemini generates reasoning text only
 *     4. Post-validation strips hallucinated claims before response is returned
 *     5. All outputs are labelled with provenance (experimental / predicted / inferred)
 *
 *   Model: gemini-2.5-flash-lite (free tier, sufficient for reasoning tasks)
 */

'use strict';

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const MODEL_ID = 'gemini-2.5-flash-lite';

// ─────────────────────────────────────────────────────────────────────────────
// SYSTEM PROMPT — injected into every request
// Enforces pharmaceutical-grade scientific behavior.
// ─────────────────────────────────────────────────────────────────────────────
const SCIENTIFIC_SYSTEM_PROMPT = `
You are a scientific reasoning assistant embedded in Vitalis AI, a pharmaceutical drug discovery platform.

Your role is STRICTLY limited to:
- Interpreting validated molecular descriptors provided to you
- Providing SAR (structure-activity relationship) commentary
- Explaining ADMET properties in scientific and educational language
- Contextualising GNN target engagement scores
- Generating medicinal chemistry rationale for scaffold modifications

ABSOLUTE PROHIBITIONS — you must NEVER:
1. Generate, invent, or modify SMILES strings
2. Calculate or fabricate molecular descriptors (MW, LogP, TPSA, etc.)
3. Invent binding affinities, Ki, IC50, Kd, or ΔG values
4. Fabricate ADMET properties not provided in the context
5. Claim a molecule is "safe" without experimental toxicology data
6. Use "binding affinity" to describe a GNN score — use "GNN Target Engagement Score"
7. Assert that a predicted score equals experimental evidence
8. Override or contradict validated cheminformatics data in the context

DATA PROVENANCE — label every claim:
[EXPERIMENTAL] — from PubChem, ChEMBL, FDA labels, or peer-reviewed literature
[PREDICTED]    — from a computational model
[INFERRED]     — your scientific reasoning from structural features
[UNKNOWN]      — data not available; do not estimate without flagging

CORRECT TERMINOLOGY:
✓ GNN Target Engagement Score (for 0–1 ML scores)
✓ Predicted interaction probability
✓ Physicochemical descriptors
✓ Lipinski Ro5 compliance
✓ hERG interaction probability
✓ CYP3A4 substrate probability
✗ Never: "binding affinity" for a GNN score
✗ Never: "safe compound" without experimental data
✗ Never: "will be absorbed" — use "predicted to have good oral absorption"

UNCERTAINTY — always communicate confidence level:
- Experimental data: state the source
- Predicted data: state the model and its limitations
- Inferred: state the structural basis
- Unknown: say so explicitly

If asked to generate SMILES or calculate descriptors, respond:
"Molecular structure generation and descriptor calculation are handled by the validated cheminformatics engine. I can only interpret provided data."
`;

// ─────────────────────────────────────────────────────────────────────────────
// Pharmacology priors — prevent biologically implausible outputs for known drugs
// Source: FDA labels, ChEMBL, DrugBank, published literature
// ─────────────────────────────────────────────────────────────────────────────
const PHARMACOLOGY_PRIORS = {
  // Aspirin — no hERG liability, not a CYP3A4 substrate
  'CC(=O)OC1=CC=CC=C1C(=O)O': {
    hergRisk: 'low', cyp3a4Substrate: false, hepatotoxicity: 'low',
    confidence: 'experimental',
    note: 'FDA-approved NSAID. No clinically relevant hERG blockade. Hydrolysed to salicylate. CYP2C9 minor involvement.'
  },
  // Acetaminophen — hepatotoxicity is its defining safety concern
  'CC(=O)Nc1ccc(O)cc1': {
    hergRisk: 'low', cyp3a4Substrate: true, hepatotoxicity: 'high',
    confidence: 'experimental',
    note: 'CYP2E1/CYP3A4 → NAPQI → glutathione depletion → hepatocellular necrosis. Hepatotoxicity is the primary safety concern at supratherapeutic doses.'
  },
  // Ibuprofen — CYP2C9 substrate, not CYP3A4
  'CC(C)CC1=CC=C(C=C1)C(C)C(O)=O': {
    hergRisk: 'low', cyp3a4Substrate: false, hepatotoxicity: 'low',
    confidence: 'experimental',
    note: 'CYP2C9 substrate (not CYP3A4). Low hERG liability. Low aqueous solubility.'
  },
  // Caffeine — CYP1A2 substrate
  'CN1C=NC2=C1C(=O)N(C(=O)N2C)C': {
    hergRisk: 'low', cyp3a4Substrate: false, hepatotoxicity: 'low',
    confidence: 'experimental',
    note: 'CYP1A2 substrate (not CYP3A4). No hERG liability. Good CNS penetration.'
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Core Gemini call — low-level, used by all public methods
// ─────────────────────────────────────────────────────────────────────────────
async function callGemini(userContent, apiKey) {
  const url = `${GEMINI_API_BASE}/${MODEL_ID}:generateContent?key=${apiKey}`;

  const payload = {
    system_instruction: { parts: [{ text: SCIENTIFIC_SYSTEM_PROMPT }] },
    contents: [{ parts: [{ text: userContent }] }],
    generationConfig: {
      temperature: 0.2,   // Low: scientific accuracy over creativity
      topK: 20,
      topP: 0.85,
      maxOutputTokens: 2048,
    },
    safetySettings: [
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
    ],
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (response.status === 429) {
    const err = new Error('Gemini rate limit exceeded');
    err.status = 429;
    throw err;
  }
  if (!response.ok) {
    throw new Error(`Gemini API error ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Post-validation — strip hallucinated claims before returning to client
// ─────────────────────────────────────────────────────────────────────────────
function validateAndSanitiseResponse(text, moleculeData) {
  if (!text) return { text: '', corrections: ['Empty response from Gemini'], safe: false };

  let corrected = text;
  const corrections = [];

  // 1. Gemini must not claim to have calculated descriptors
  if (/I (calculated|computed|determined|found) the (MW|LogP|TPSA|molecular weight)/i.test(corrected)) {
    corrected = corrected.replace(
      /I (calculated|computed|determined|found) the (MW|LogP|TPSA|molecular weight)/gi,
      'The provided $2'
    );
    corrections.push('Corrected: Gemini claimed to calculate descriptors.');
  }

  // 2. "binding affinity" → "GNN target engagement score"
  if (/binding affinity/i.test(corrected)) {
    corrected = corrected.replace(/binding affinity/gi, 'GNN target engagement score');
    corrections.push("Corrected: 'binding affinity' → 'GNN target engagement score'.");
  }

  // 3. Unqualified safety claims
  if (/\b(this compound is safe|safe compound|no safety concerns|non-toxic)\b/i.test(corrected)) {
    corrected = corrected.replace(
      /\b(this compound is safe|safe compound|no safety concerns|non-toxic)\b/gi,
      'no significant safety signals identified in the predicted profile (experimental validation required)'
    );
    corrections.push('Corrected: Unqualified safety claim hedged appropriately.');
  }

  // 4. BBB correction: if TPSA > 90, Gemini must not claim good BBB penetration
  if (moleculeData?.tpsa > 90) {
    const bbbOverclaims = [
      'good blood-brain barrier penetration',
      'strong BBB penetration',
      'likely crosses the blood-brain barrier',
      'excellent CNS penetration',
    ];
    for (const phrase of bbbOverclaims) {
      if (new RegExp(phrase, 'i').test(corrected)) {
        corrected = corrected.replace(new RegExp(phrase, 'gi'), 'limited predicted BBB penetration (TPSA > 90 Å²)');
        corrections.push(`Corrected: BBB overclaim for TPSA=${moleculeData.tpsa} Å².`);
      }
    }
  }

  // 5. Acetaminophen hepatotoxicity must not be downplayed
  if (moleculeData?.smiles === 'CC(=O)Nc1ccc(O)cc1') {
    if (/low hepatotoxicity|no liver|liver safe/i.test(corrected)) {
      corrected = corrected.replace(
        /low hepatotoxicity|no liver risk|liver safe/gi,
        'dose-dependent hepatotoxicity (NAPQI mechanism — experimental fact)'
      );
      corrections.push('Corrected: Acetaminophen hepatotoxicity must not be downplayed.');
    }
  }

  return { text: corrected, corrections, safe: corrections.length === 0 };
}

// ─────────────────────────────────────────────────────────────────────────────
// Build validated context block — injected before every user prompt
// Gemini receives ONLY validated data, never raw user input as chemistry
// ─────────────────────────────────────────────────────────────────────────────
function buildValidatedContext(molecule, admet, gnnScore) {
  const prior = PHARMACOLOGY_PRIORS[molecule.smiles] ?? null;

  return `
VALIDATED MOLECULAR CONTEXT — do not modify or contradict these values:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Molecule:           ${molecule.commonName || 'Unknown'} [${molecule.smiles ? 'SMILES provided' : 'no SMILES'}]
MW:                 ${molecule.molecularWeight != null ? molecule.molecularWeight.toFixed(1) + ' Da' : 'N/A'} [EXPERIMENTAL · PubChem]
LogP:               ${molecule.logP != null ? molecule.logP.toFixed(2) : 'N/A'} [EXPERIMENTAL · PubChem XLogP]
TPSA:               ${molecule.topologicalPolarSurfaceArea != null ? molecule.topologicalPolarSurfaceArea.toFixed(1) + ' Å²' : 'N/A'} [EXPERIMENTAL · PubChem]
H-bond donors:      ${molecule.hBondDonors ?? 'N/A'} [EXPERIMENTAL · PubChem]
H-bond acceptors:   ${molecule.hBondAcceptors ?? 'N/A'} [EXPERIMENTAL · PubChem]
Rotatable bonds:    ${molecule.rotatableBonds ?? 'N/A'} [EXPERIMENTAL · PubChem]
GNN Engagement:     ${gnnScore != null ? gnnScore.toFixed(3) : 'N/A'} [PREDICTED · heuristic GNN · NOT a Ki/IC50/Kd/ΔG]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ADMET PROFILE [${prior ? prior.confidence.toUpperCase() : 'PREDICTED'}]:
hERG risk:          ${admet?.hergRisk ?? 'unknown'}
CYP3A4 substrate:   ${admet?.cyp3a4Substrate != null ? admet.cyp3a4Substrate : 'unknown'}
Hepatotoxicity:     ${admet?.hepatotoxicity ?? 'unknown'}
Solubility:         ${admet?.solubility ?? 'unknown'}
Permeability:       ${admet?.permeability ?? 'unknown'}
${prior ? `ADMET note:         ${prior.note}` : 'ADMET note:         Estimated from physicochemical descriptors. Not experimentally validated.'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

class AIPredictionService {

  /**
   * Generate scientific reasoning for a molecule.
   * Gemini interprets validated descriptors — it does not calculate them.
   */
  static async generateScientificReasoning(molecule, admet, gnnScore, userQuestion) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY not configured');

    const context = buildValidatedContext(molecule, admet, gnnScore);
    const prompt = `${context}\nUSER QUESTION:\n${userQuestion}`;

    const startTime = Date.now();
    const rawText = await callGemini(prompt, apiKey);
    const { text, corrections, safe } = validateAndSanitiseResponse(rawText, molecule);

    return {
      success: true,
      reasoning: text,
      corrections,
      safe,
      provenance: {
        descriptors: 'PubChem (experimental)',
        admet: PHARMACOLOGY_PRIORS[molecule.smiles] ? 'curated pharmacology prior' : 'heuristic prediction',
        gnnScore: 'heuristic GNN — not experimental',
        geminiRole: 'scientific reasoning only — no chemistry generation',
      },
      model: MODEL_ID,
      executionTimeMs: Date.now() - startTime,
    };
  }

  /**
   * Generate SAR commentary for a scaffold modification.
   * Receives pre-validated original and modified descriptors.
   * Gemini explains the change — it does not generate the modification.
   */
  static async generateSARCommentary(originalMolecule, modifiedMolecule, modificationLabel, modificationNote) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY not configured');

    const prompt = `
SCAFFOLD MODIFICATION ANALYSIS — interpret the following validated property changes:

Original molecule: ${originalMolecule.commonName || 'Unknown'}
Modification applied: ${modificationLabel}
Medicinal chemistry rationale: ${modificationNote}

ORIGINAL DESCRIPTORS [EXPERIMENTAL · PubChem]:
- MW: ${originalMolecule.molecularWeight?.toFixed(1)} Da
- LogP: ${originalMolecule.logP?.toFixed(2) ?? 'N/A'}
- TPSA: ${originalMolecule.topologicalPolarSurfaceArea?.toFixed(1)} Å²
- H-donors: ${originalMolecule.hBondDonors}, H-acceptors: ${originalMolecule.hBondAcceptors}
- Rotatable bonds: ${originalMolecule.rotatableBonds}

MODIFIED DESCRIPTORS [EXPERIMENTAL · PubChem]:
- MW: ${modifiedMolecule.molecularWeight?.toFixed(1)} Da (Δ ${((modifiedMolecule.molecularWeight || 0) - (originalMolecule.molecularWeight || 0)).toFixed(1)} Da)
- LogP: ${modifiedMolecule.logP?.toFixed(2) ?? 'N/A'} (ΔLogP ${modifiedMolecule.logP != null && originalMolecule.logP != null ? (modifiedMolecule.logP - originalMolecule.logP).toFixed(2) : 'N/A'})
- TPSA: ${modifiedMolecule.topologicalPolarSurfaceArea?.toFixed(1)} Å² (Δ ${((modifiedMolecule.topologicalPolarSurfaceArea || 0) - (originalMolecule.topologicalPolarSurfaceArea || 0)).toFixed(1)} Å²)
- H-donors: ${modifiedMolecule.hBondDonors} (Δ ${(modifiedMolecule.hBondDonors || 0) - (originalMolecule.hBondDonors || 0)})
- H-acceptors: ${modifiedMolecule.hBondAcceptors} (Δ ${(modifiedMolecule.hBondAcceptors || 0) - (originalMolecule.hBondAcceptors || 0)})
- Rotatable bonds: ${modifiedMolecule.rotatableBonds} (Δ ${(modifiedMolecule.rotatableBonds || 0) - (originalMolecule.rotatableBonds || 0)})

Provide:
1. SAR interpretation of the property changes [INFERRED]
2. Expected impact on ADMET profile [INFERRED]
3. Medicinal chemistry precedent for this transformation [INFERRED · cite drug class if known]
4. Any toxicophore concerns introduced [INFERRED]
5. Recommended next experimental steps

Label all claims with [EXPERIMENTAL], [PREDICTED], or [INFERRED].
Do not generate SMILES. Do not invent binding data.
`;

    const startTime = Date.now();
    const rawText = await callGemini(prompt, apiKey);
    const { text, corrections, safe } = validateAndSanitiseResponse(rawText, originalMolecule);

    return {
      success: true,
      sarCommentary: text,
      corrections,
      safe,
      model: MODEL_ID,
      executionTimeMs: Date.now() - startTime,
    };
  }

  /**
   * Generate educational narrative for student mode.
   * Plain-language interpretation of validated data.
   */
  static async generateEducationalNarrative(molecule, admet, gnnScore, targetName) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY not configured');

    const context = buildValidatedContext(molecule, admet, gnnScore);
    const prompt = `${context}
TARGET: ${targetName || 'Unknown'}

Generate a plain-language educational explanation of this molecule for pharmacy or biochemistry students.
Include:
1. What the molecule looks like chemically (based on provided descriptors only)
2. Why it might or might not be a good drug candidate (Lipinski analysis)
3. What the ADMET profile means in clinical terms
4. What the GNN target engagement score means (and what it does NOT mean)
5. What experiments would be needed to validate these predictions

Use simple language. Retain all [EXPERIMENTAL]/[PREDICTED]/[INFERRED] labels.
Do not invent data. Do not generate SMILES.
`;

    const startTime = Date.now();
    const rawText = await callGemini(prompt, apiKey);
    const { text, corrections, safe } = validateAndSanitiseResponse(rawText, molecule);

    return {
      success: true,
      narrative: text,
      corrections,
      safe,
      model: MODEL_ID,
      executionTimeMs: Date.now() - startTime,
    };
  }

  /** PubChem + rule-based engagement proxy — NOT a trained GNN. */
  static async predictBindingAffinity(molecule, targetProtein, externalData) {
    const analyzer = require('../engine/analysis/molecule-analyzer');
    return analyzer.predictBindingAffinity(molecule, targetProtein, externalData);
  }

  static async predictToxicity(molecule, externalData) {
    const analyzer = require('../engine/analysis/molecule-analyzer');
    return analyzer.predictToxicity(molecule, externalData);
  }

  static async predictADME(molecule, externalData) {
    const analyzer = require('../engine/analysis/molecule-analyzer');
    return analyzer.predictADME(molecule, externalData);
  }

  /**
   * Generate executive summary for non-technical stakeholders.
   * Africa-context aware.
   */
  static async generateExecutiveSummary(molecule, admet, gnnScore, diseaseContext) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY not configured');

    const context = buildValidatedContext(molecule, admet, gnnScore);
    const prompt = `${context}
DISEASE CONTEXT: ${diseaseContext || 'Not specified'}

Generate a 2–3 paragraph executive summary for non-technical stakeholders and funders.
Include:
- What this molecule could potentially treat (based on target and disease context)
- Key drug-likeness findings (plain language)
- What the AI predictions mean and their limitations
- Why this matters for African health challenges
- What the next steps in drug development would be

Do not claim efficacy. Do not claim safety. Label all predictions clearly.
Do not generate SMILES or invent data.
`;

    const startTime = Date.now();
    const rawText = await callGemini(prompt, apiKey);
    const { text, corrections, safe } = validateAndSanitiseResponse(rawText, molecule);

    return {
      success: true,
      summary: text,
      corrections,
      safe,
      model: MODEL_ID,
      executionTimeMs: Date.now() - startTime,
    };
  }
}

module.exports = AIPredictionService;
module.exports.PHARMACOLOGY_PRIORS = PHARMACOLOGY_PRIORS;
module.exports.validateAndSanitiseResponse = validateAndSanitiseResponse;
module.exports.buildValidatedContext = buildValidatedContext;
