const { GoogleGenerativeAI } = require('@google/generative-ai');
const ExternalDataService = require('./ExternalDataService');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

class AIPredictionService {
  static model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-2.5-flash' });

  /**
   * Predict comprehensive molecular properties using Gemini
   */
  static async predictMolecularProperties(molecule, externalData = null) {
    const startTime = Date.now();

    try {
      const prompt = this._buildPropertyPredictionPrompt(molecule, externalData);
      const response = await this.model.generateContent(prompt);
      const text = response.response.text();
      const executionTime = Date.now() - startTime;

      return {
        success: true,
        predictions: this._parsePropertyPredictions(text),
        rawResponse: text,
        executionTimeMs: executionTime,
        model: 'gemini-2.5-flash'
      };
    } catch (error) {
      console.error('Property prediction failed:', error);
      return {
        success: false,
        error: error.message,
        executionTimeMs: Date.now() - startTime
      };
    }
  }

  /**
   * Predict binding affinity to target proteins
   */
  static async predictBindingAffinity(molecule, targetProtein, externalData = null) {
    const startTime = Date.now();

    try {
      const prompt = this._buildBindingAffinityPrompt(molecule, targetProtein, externalData);
      const response = await this.model.generateContent(prompt);
      const text = response.response.text();
      const executionTime = Date.now() - startTime;

      const predictions = this._parseBindingAffinity(text);

      return {
        success: true,
        targetProtein,
        score: predictions.score,
        confidence: predictions.confidence,
        unit: 'nM', // nanomolar
        prediction: predictions,
        executionTimeMs: executionTime,
        model: 'gemini-2.5-flash'
      };
    } catch (error) {
      console.error('Binding affinity prediction failed:', error);
      return {
        success: false,
        error: error.message,
        executionTimeMs: Date.now() - startTime
      };
    }
  }

  /**
   * Predict toxicity and safety profile
   */
  static async predictToxicity(molecule, externalData = null) {
    const startTime = Date.now();

    try {
      const prompt = this._buildToxicityPrompt(molecule, externalData);
      const response = await this.model.generateContent(prompt);
      const text = response.response.text();
      const executionTime = Date.now() - startTime;

      const predictions = this._parseToxicity(text);

      return {
        success: true,
        overallScore: predictions.overallScore,
        confidence: predictions.confidence,
        categories: predictions.categories,
        redFlags: predictions.redFlags,
        executionTimeMs: executionTime,
        model: 'gemini-2.5-flash'
      };
    } catch (error) {
      console.error('Toxicity prediction failed:', error);
      return {
        success: false,
        error: error.message,
        executionTimeMs: Date.now() - startTime
      };
    }
  }

  /**
   * Predict ADME (Absorption, Distribution, Metabolism, Excretion) properties
   */
  static async predictADME(molecule, externalData = null) {
    const startTime = Date.now();

    try {
      const prompt = this._buildADMEPrompt(molecule, externalData);
      const response = await this.model.generateContent(prompt);
      const text = response.response.text();
      const executionTime = Date.now() - startTime;

      const predictions = this._parseADME(text);

      return {
        success: true,
        absorption: predictions.absorption,
        distribution: predictions.distribution,
        metabolism: predictions.metabolism,
        excretion: predictions.excretion,
        bloodBrainBarrier: predictions.bbb,
        executionTimeMs: executionTime,
        model: 'gemini-2.5-flash'
      };
    } catch (error) {
      console.error('ADME prediction failed:', error);
      return {
        success: false,
        error: error.message,
        executionTimeMs: Date.now() - startTime
      };
    }
  }

  /**
   * What-if analysis: predict effects of molecular modifications
   */
  static async whatIfAnalysis(baseMolecule, modifications, targetProperty = 'binding-affinity') {
    const startTime = Date.now();

    try {
      const prompt = this._buildWhatIfPrompt(baseMolecule, modifications, targetProperty);
      const response = await this.model.generateContent(prompt);
      const text = response.response.text();
      const executionTime = Date.now() - startTime;

      const predictions = this._parseWhatIfAnalysis(text);

      return {
        success: true,
        baseMolecule: baseMolecule.smiles,
        modifications,
        targetProperty,
        predictions,
        executionTimeMs: executionTime,
        model: 'gemini-2.5-flash'
      };
    } catch (error) {
      console.error('What-if analysis failed:', error);
      return {
        success: false,
        error: error.message,
        executionTimeMs: Date.now() - startTime
      };
    }
  }

  /**
   * Generate researcher-friendly detailed report
   */
  static async generateDetailedReport(molecule, predictions, externalData = null) {
    try {
      const prompt = this._buildDetailedReportPrompt(molecule, predictions, externalData);
      const response = await this.model.generateContent(prompt);
      const text = response.response.text();

      return {
        success: true,
        report: text,
        format: 'markdown'
      };
    } catch (error) {
      console.error('Report generation failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Generate judge/non-technical summary
   */
  static async generateExecutiveSummary(molecule, predictions, externalData = null) {
    try {
      const prompt = this._buildExecutiveSummaryPrompt(molecule, predictions, externalData);
      const response = await this.model.generateContent(prompt);
      const text = response.response.text();

      return {
        success: true,
        summary: text,
        format: 'markdown',
        keyMetrics: this._extractKeyMetrics(text)
      };
    } catch (error) {
      console.error('Summary generation failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // ============== Prompt Builders ==============

  static _buildPropertyPredictionPrompt(molecule, externalData) {
    return `You are an expert computational chemist and AI drug discovery system.

Analyze the following molecule and predict its key properties:

**Molecule Information:**
- SMILES: ${molecule.smiles}
- Name: ${molecule.commonName || 'Unknown'}
${molecule.molecularWeight ? `- Molecular Weight: ${molecule.molecularWeight} Da` : ''}
${molecule.logP ? `- LogP: ${molecule.logP}` : ''}
${molecule.hBondDonors ? `- H-Bond Donors: ${molecule.hBondDonors}` : ''}
${molecule.hBondAcceptors ? `- H-Bond Acceptors: ${molecule.hBondAcceptors}` : ''}
${molecule.topologicalPolarSurfaceArea ? `- TPSA: ${molecule.topologicalPolarSurfaceArea} Ų` : ''}

${externalData ? `**External Validation Data:**\n${JSON.stringify(externalData, null, 2)}` : ''}

Please provide:
1. Drug-likeness assessment (Lipinski's Rule of Five compliance)
2. Synthetic accessibility (1-10 scale)
3. Estimated BBB penetration (%)
4. Primary metabolism pathway
5. Confidence scores for each prediction
6. Any flags or concerns

Format as JSON with clear property names and numeric values where applicable.`;
  }

  static _buildBindingAffinityPrompt(molecule, targetProtein, externalData) {
    return `You are an expert in molecular docking and binding prediction.

Predict binding affinity for this molecule to ${targetProtein}:

**Molecule:**
- SMILES: ${molecule.smiles}
- Name: ${molecule.commonName || 'Unknown'}
- MW: ${molecule.molecularWeight || 'Unknown'} Da
- LogP: ${molecule.logP || 'Unknown'}

**Target Protein:** ${targetProtein}

${externalData ? `**PubChem/ChEMBL Data:**\n${JSON.stringify(externalData, null, 2)}` : ''}

Provide:
1. Predicted Kd (nM) - lower is better, typical good binders are < 100 nM
2. Binding confidence (0-100%)
3. Key interactions expected (H-bonds, hydrophobic contacts, etc.)
4. RMSD estimate for predicted binding pose
5. Comparison to known binders for this target
6. Uncertainty range
7. **XAI Reasoning**: A 1-2 sentence explanation of the chemical basis for the score.
8. **Top Features**: List of structural features (e.g., "Aromatic ring", "Hydroxyl group") and their impact on the affinity (-0.5 to +0.5).

Return as JSON with numeric scores and structured 'xai' object containing 'reasoning' and 'topFeatures'.`;
  }

  static _buildToxicityPrompt(molecule, externalData) {
    return `You are a toxicology and drug safety expert.

Assess toxicity risk for this molecule:

**Molecule:**
- SMILES: ${molecule.smiles}
- Name: ${molecule.commonName || 'Unknown'}
- MW: ${molecule.molecularWeight || 'Unknown'} Da

${externalData?.bioassays?.length ? `**Known Bioassay Data:**\n${JSON.stringify(externalData.bioassays.slice(0, 5), null, 2)}` : ''}

Evaluate:
1. Overall toxicity risk (0-100, where 100 = most toxic)
2. Confidence in assessment (%)
3. Specific toxicity categories:
   - Hepatotoxicity risk
   - Cardiotoxicity risk
   - Neurotoxicity risk
   - Genotoxicity risk
   - Reproductive toxicity risk
4. Red flags present
5. Structural alerts triggered
6. Recommendations for modification if needed
7. **XAI Reasoning**: A 1-2 sentence explanation of why this molecule poses specific toxicity risks.
8. **Top Features**: List of toxicophores or problematic groups and their impact.

Return as JSON with category scores, risk levels (low/medium/high), and structured 'xai' object.`;
  }

  static _buildADMEPrompt(molecule, externalData) {
    return `You are an expert in ADME (pharmacokinetics) prediction.

Predict ADME properties for this molecule:

**Molecule:**
- SMILES: ${molecule.smiles}
- Name: ${molecule.commonName || 'Unknown'}
- MW: ${molecule.molecularWeight || 'Unknown'} Da
- LogP: ${molecule.logP || 'Unknown'}
- HBA: ${molecule.hBondAcceptors || 'Unknown'}
- HBD: ${molecule.hBondDonors || 'Unknown'}
- TPSA: ${molecule.topologicalPolarSurfaceArea || 'Unknown'} Ų

Predict:
1. Absorption (Caco-2 permeability, % oral bioavailability estimate)
2. Distribution (volume of distribution, protein binding %)
3. Metabolism (primary CYP isoforms, metabolic stability)
4. Excretion (renal clearance, fecal excretion %)
5. Blood-Brain Barrier penetration (yes/no + confidence)
6. Estimated half-life (hours)
7. Overall PK profile (favorable/moderate/poor)
8. **XAI Reasoning**: A 1-2 sentence summary of the overall pharmacokinetic personality of the molecule.
9. **Top Features**: Structural factors influencing ADME (e.g., "High Lipophilicity", "Low TPSA").

Return JSON with numeric estimates, confidence scores, and structured 'xai' object.`;
  }

  static _buildWhatIfPrompt(baseMolecule, modifications, targetProperty) {
    return `You are a medicinal chemist with expertise in structure-activity relationships.

Base molecule: ${baseMolecule.smiles}

Proposed modifications:
${modifications.map((m, i) => `${i + 1}. ${m}`).join('\n')}

Target property to improve: ${targetProperty}

For each modification:
1. Predict the new molecular structure (approximate SMILES)
2. Estimate impact on target property (-50% to +200% change)
3. Impact on other properties (toxicity, ADME, BBB penetration)
4. Feasibility of synthesis (1-10 scale)
5. Overall recommendation

Provide:
- Summary table of changes
- Best modification option
- Potential side effects of changes
- Confidence in predictions

Return as structured JSON.`;
  }

  static _buildDetailedReportPrompt(molecule, predictions, externalData) {
    return `Generate a detailed scientific report for researchers.

**Molecule:** ${molecule.commonName || molecule.smiles}

**Predictions Made:**
${JSON.stringify(predictions, null, 2)}

**External Validation:**
${externalData ? JSON.stringify(externalData, null, 2) : 'Not available'}

Create a comprehensive markdown report including:
1. Executive summary
2. Molecular structure analysis
3. Predicted properties with confidence intervals
4. Comparison to known drugs/compounds
5. Methodology and limitations
6. References to data sources (PubChem, ChEMBL)
7. Recommendations for further testing
8. Statistical confidence of predictions

Format with proper scientific sections and citations.`;
  }

  static _buildExecutiveSummaryPrompt(molecule, predictions, externalData) {
    return `Generate a clear, non-technical summary for judges and stakeholders.

**Molecule:** ${molecule.commonName || molecule.smiles}

**Key Results:**
${JSON.stringify(predictions, null, 2)}

Create a brief summary (2-3 paragraphs) that includes:
1. What this molecule could treat
2. Key advantages (speed, cost, novelty)
3. How it was predicted (AI-powered analysis)
4. Why it matters for Africa (disease relevance, accessibility)
5. Next steps for development
6. Comparison to manual drug discovery timeline

Use simple language, avoid jargon. Highlight:
- Analysis speed (seconds vs. months)
- Estimated cost savings
- Clinical relevance
- Africa-centric applications

Format as markdown suitable for presentation.`;
  }

  // ============== Response Parsers ==============

  static _parsePropertyPredictions(text) {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.warn('Failed to parse property predictions JSON');
    }

    return {
      rawText: text,
      parsed: false,
      extractedMetrics: this._extractMetricsFromText(text)
    };
  }

  static _parseBindingAffinity(text) {
    const scoreMatch = text.match(/Kd|affinity.*?(\d+\.?\d*)/i);
    const confidenceMatch = text.match(/confidence.*?(\d+)/i);

    return {
      score: scoreMatch ? parseFloat(scoreMatch[1]) : 50,
      confidence: confidenceMatch ? parseFloat(confidenceMatch[1]) / 100 : 0.7,
      xai: this._extractXAI(text),
      rawText: text,
      parsed: !!scoreMatch
    };
  }

  static _parseToxicity(text) {
    const scoreMatch = text.match(/overall.*?(\d+)/i);
    const confidenceMatch = text.match(/confidence.*?(\d+)/i);
    const categories = text.match(/\w+toxicity.*?(\d+)/gi) || [];

    return {
      overallScore: scoreMatch ? parseFloat(scoreMatch[1]) / 100 : 0.5,
      confidence: confidenceMatch ? parseFloat(confidenceMatch[1]) / 100 : 0.7,
      categories: categories.map(c => ({
        name: c.split(/\d/)[0],
        score: parseFloat(c.match(/\d+/)[0]) / 100
      })),
      redFlags: text.match(/red flag.*?\n/gi) || [],
      xai: this._extractXAI(text),
      rawText: text
    };
  }

  static _parseADME(text) {
    return {
      absorption: this._extractNumeric(text, 'absorption'),
      distribution: this._extractNumeric(text, 'distribution'),
      metabolism: this._extractNumeric(text, 'metabolism'),
      excretion: this._extractNumeric(text, 'excretion'),
      bbb: text.toLowerCase().includes('yes') || text.toLowerCase().includes('penetrate'),
      xai: this._extractXAI(text),
      rawText: text
    };
  }

  static _parseWhatIfAnalysis(text) {
    return {
      suggestions: text.split('\n').filter(l => l.trim()).slice(0, 5),
      rawText: text
    };
  }

  static _extractMetricsFromText(text) {
    const metrics = {};
    const lines = text.split('\n');
    lines.forEach(line => {
      const match = line.match(/(\w+):\s*(\d+\.?\d*)/);
      if (match) {
        metrics[match[1]] = parseFloat(match[2]);
      }
    });
    return metrics;
  }

  static _extractNumeric(text, property) {
    const regex = new RegExp(`${property}.*?(\\d+\\.?\\d*)`, 'i');
    const match = text.match(regex);
    return match ? parseFloat(match[1]) / 100 : 0.5;
  }

  static _extractKeyMetrics(text) {
    const metrics = [];
    const lines = text.split('\n');
    lines.slice(0, 10).forEach(line => {
      if (line.includes(':') && line.match(/\d/)) {
        metrics.push(line.trim());
      }
    });
    return metrics;
  }

  static _extractXAI(text) {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);
        if (data.xai) return data.xai;
        if (data.reasoning || data.topFeatures) {
          return {
            reasoning: data.reasoning,
            topFeatures: data.topFeatures
          };
        }
      }
    } catch (e) {
      // JSON parse failed, try regex
    }

    const reasoningMatch = text.match(/reasoning[:\s]+(.*?)(?=\n|$)/i);
    return {
      reasoning: reasoningMatch ? reasoningMatch[1] : 'The AI analyzed molecular descriptors and structure to generate this prediction.',
      topFeatures: []
    };
  }
}

module.exports = AIPredictionService;
