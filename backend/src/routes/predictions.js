const express = require('express');
const router = express.Router();
const Molecule = require('../models/Molecule');
const Prediction = require('../models/Prediction');
const ExternalDataService = require('../services/ExternalDataService');
const AIPredictionService = require('../services/AIPredictionService');
const rateLimitQueue = require('../services/RateLimitQueue');
const {
  applyDrugRules,
  generateRecommendations,
  generateChemistryContext,
  validateAnalysisOutput
} = require('../utils/drugRules');

/**
 * POST /api/predictions/binding-affinity
 * Predict binding affinity to target protein
 */
router.post('/binding-affinity', async (req, res) => {
  try {
    const { moleculeId, smiles, targetProtein, targetUniprotId } = req.body;

    // Get molecule
    let molecule;
    if (moleculeId) {
      molecule = await Molecule.findById(moleculeId);
    } else if (smiles) {
      molecule = await Molecule.findOne({ smiles });
      if (!molecule) {
        return res.status(404).json({
          success: false,
          message: 'Molecule not found. Create molecule first.'
        });
      }
    }

    // Fetch external data
    const externalData = await ExternalDataService.comprehensiveMoleculeLookup(molecule.smiles);

    // Run AI prediction
    const prediction = await AIPredictionService.predictBindingAffinity(
      molecule,
      targetProtein,
      externalData
    );

    // Save prediction to database
    const predictionDoc = new Prediction({
      moleculeId: molecule._id,
      predictionType: 'binding-affinity',
      results: {
        bindingAffinity: {
          score: prediction.score,
          confidence: prediction.confidence,
          unit: prediction.unit,
          targetProteins: [{
            name: targetProtein,
            uniprotId: targetUniprotId,
            predictedKd: prediction.score,
            confidence: prediction.confidence
          }]
        }
      },
      aiModel: {
        name: 'Gemini 2.5 Flash',
        type: 'gemini-2.5-flash'
      },
      externalValidation: {
        pubchemMatch: externalData.pubchem,
        chemblMatch: externalData.chembl
      },
      summary: {
        keyHighlights: [
          `Predicted Kd: ${prediction.score} nM`,
          `Confidence: ${(prediction.confidence * 100).toFixed(1)}%`,
          `Target: ${targetProtein}`
        ]
      },
      executionTimeMs: prediction.executionTimeMs,
      status: 'completed'
    });

    await predictionDoc.save();

    // Update molecule
    molecule.predictions.bindingAffinity = {
      predicted: true,
      score: prediction.score,
      confidence: prediction.confidence,
      targetProtein,
      unit: prediction.unit,
      timestamp: new Date()
    };
    await molecule.save();

    res.json({
      success: true,
      message: 'Binding affinity prediction completed',
      data: {
        prediction: predictionDoc,
        summary: predictionDoc.summary
      },
      stats: {
        executionTimeMs: prediction.executionTimeMs,
        dataSources: ['PubChem', 'ChEMBL']
      }
    });
  } catch (error) {
    console.error('Error predicting binding affinity:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * POST /api/predictions/toxicity
 * Predict toxicity profile
 */
router.post('/toxicity', async (req, res) => {
  try {
    const { moleculeId, smiles } = req.body;

    let molecule;
    if (moleculeId) {
      molecule = await Molecule.findById(moleculeId);
    } else if (smiles) {
      molecule = await Molecule.findOne({ smiles });
    }

    if (!molecule) {
      return res.status(404).json({
        success: false,
        message: 'Molecule not found'
      });
    }

    const externalData = await ExternalDataService.comprehensiveMoleculeLookup(molecule.smiles);
    const prediction = await AIPredictionService.predictToxicity(molecule, externalData);

    const predictionDoc = new Prediction({
      moleculeId: molecule._id,
      predictionType: 'toxicity',
      results: {
        toxicity: {
          overallScore: prediction.overallScore,
          confidence: prediction.confidence,
          categories: prediction.categories
        }
      },
      aiModel: {
        name: 'Gemini 2.5 Flash',
        type: 'gemini-2.5-flash'
      },
      externalValidation: {
        pubchemMatch: externalData.pubchem,
        chemblMatch: externalData.chembl
      },
      summary: {
        keyHighlights: [
          `Toxicity Risk: ${(prediction.overallScore * 100).toFixed(1)}%`,
          `Confidence: ${(prediction.confidence * 100).toFixed(1)}%`,
          `Categories Assessed: ${prediction.categories.length}`
        ]
      },
      executionTimeMs: prediction.executionTimeMs,
      status: 'completed'
    });

    await predictionDoc.save();

    molecule.predictions.toxicity = {
      predicted: true,
      score: prediction.overallScore,
      confidence: prediction.confidence,
      categories: prediction.categories.map(c => c.name),
      timestamp: new Date()
    };
    await molecule.save();

    res.json({
      success: true,
      message: 'Toxicity prediction completed',
      data: {
        prediction: predictionDoc,
        summary: predictionDoc.summary
      }
    });
  } catch (error) {
    console.error('Error predicting toxicity:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * POST /api/predictions/adme
 * Predict ADME properties
 */
router.post('/adme', async (req, res) => {
  try {
    const { moleculeId, smiles } = req.body;

    let molecule;
    if (moleculeId) {
      molecule = await Molecule.findById(moleculeId);
    } else if (smiles) {
      molecule = await Molecule.findOne({ smiles });
    }

    if (!molecule) {
      return res.status(404).json({
        success: false,
        message: 'Molecule not found'
      });
    }

    const externalData = await ExternalDataService.comprehensiveMoleculeLookup(molecule.smiles);
    const prediction = await AIPredictionService.predictADME(molecule, externalData);

    const predictionDoc = new Prediction({
      moleculeId: molecule._id,
      predictionType: 'adme',
      results: {
        adme: {
          absorption: { value: prediction.absorption, confidence: 0.8 },
          distribution: { value: prediction.distribution, confidence: 0.8 },
          metabolism: { value: prediction.metabolism, confidence: 0.75 },
          excretion: { value: prediction.excretion, confidence: 0.8 },
          bloodBrainBarrier: { value: prediction.bloodBrainBarrier, confidence: 0.85 }
        }
      },
      aiModel: {
        name: 'Gemini 2.5 Flash',
        type: 'gemini-2.5-flash'
      },
      externalValidation: {
        pubchemMatch: externalData.pubchem
      },
      summary: {
        keyHighlights: [
          `BBB Penetration: ${prediction.bloodBrainBarrier ? 'Yes' : 'No'}`,
          `Absorption: ${(prediction.absorption * 100).toFixed(1)}%`,
          `Overall PK Profile: ${prediction.absorption > 0.7 ? 'Favorable' : 'Moderate'}`
        ]
      },
      executionTimeMs: prediction.executionTimeMs,
      status: 'completed'
    });

    await predictionDoc.save();

    molecule.predictions.adme = {
      predicted: true,
      absorption: prediction.absorption,
      distribution: prediction.distribution,
      metabolism: prediction.metabolism,
      excretion: prediction.excretion,
      confidence: 0.8,
      timestamp: new Date()
    };
    await molecule.save();

    res.json({
      success: true,
      message: 'ADME prediction completed',
      data: {
        prediction: predictionDoc,
        summary: predictionDoc.summary
      }
    });
  } catch (error) {
    console.error('Error predicting ADME:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/predictions/:moleculeId
 * Get all predictions for a molecule
 */
router.get('/:moleculeId', async (req, res) => {
  try {
    const predictions = await Prediction.find({
      moleculeId: req.params.moleculeId
    }).sort('-createdAt');

    res.json({
      success: true,
      data: predictions,
      count: predictions.length
    });
  } catch (error) {
    console.error('Error fetching predictions:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/predictions/comprehensive/:moleculeId
 * Get comprehensive prediction report for molecule
 */
router.get('/comprehensive/:moleculeId', async (req, res) => {
  try {
    const molecule = await Molecule.findById(req.params.moleculeId);

    if (!molecule) {
      return res.status(404).json({
        success: false,
        message: 'Molecule not found'
      });
    }

    // Get all prediction types
    const predictions = await Prediction.find({
      moleculeId: req.params.moleculeId
    });

    // Generate detailed report
    const report = await AIPredictionService.generateDetailedReport(
      molecule,
      predictions
    );

    // Generate executive summary
    const summary = await AIPredictionService.generateExecutiveSummary(
      molecule,
      predictions
    );

    res.json({
      success: true,
      data: {
        molecule: {
          id: molecule._id,
          smiles: molecule.smiles,
          commonName: molecule.commonName,
          properties: {
            mw: molecule.molecularWeight,
            logp: molecule.logP,
            tpsa: molecule.topologicalPolarSurfaceArea
          }
        },
        predictions: predictions.map(p => ({
          type: p.predictionType,
          results: p.results,
          confidence: p.results[p.predictionType]?.confidence || 0.7,
          timestamp: p.createdAt
        })),
        researcherReport: report.success ? report.report : null,
        executiveSummary: summary.success ? summary.summary : null,
        keyMetrics: summary.keyMetrics || []
      }
    });
  } catch (error) {
    console.error('Error fetching comprehensive predictions:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * POST /api/predictions/analyze
 * Analyze molecule data with Gemini AI (with rate limit handling)
 */
router.post('/analyze', async (req, res) => {
  try {
    const { prompt, type, moleculeData } = req.body;

    if (!prompt) {
      return res.status(400).json({
        success: false,
        message: 'Prompt is required'
      });
    }

    // Initialize Gemini if available
    const API_KEY = process.env.GEMINI_API_KEY;
    const MODEL_ID = 'gemini-2.5-flash-lite';

    if (!API_KEY) {
      console.error('❌ Gemini API key not configured');
      return res.status(500).json({
        success: false,
        message: 'Gemini API key not configured'
      });
    }

    try {
      console.log('📤 Preparing analysis request...');
      console.log('🎯 Using model:', MODEL_ID);

      // Apply drug discovery rules if molecule data provided
      let enrichedPrompt = prompt;
      let drugRules = null;
      let recommendations = null;
      let chemistryContext = null;

      if (moleculeData) {
        console.log('🧪 Applying drug discovery rules...');
        
        // Apply hard scientific constraints
        drugRules = applyDrugRules(moleculeData);
        recommendations = generateRecommendations(moleculeData, drugRules);
        chemistryContext = generateChemistryContext(moleculeData, drugRules);

        // Inject verified chemistry context into prompt
        enrichedPrompt = `${prompt}

VERIFIED CHEMISTRY CONTEXT:
${JSON.stringify(chemistryContext, null, 2)}

DERIVED RECOMMENDATIONS:
${JSON.stringify(recommendations, null, 2)}

Use this verified context to ensure scientifically accurate analysis.`;

        console.log('✓ Drug rules applied');
        console.log('✓ Chemistry context injected');
      }

      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_ID}:generateContent?key=${API_KEY}`;

      // Get queue stats before queuing
      const queueStats = rateLimitQueue.getStats();
      console.log(`📊 Queue stats:`, queueStats);

      // Enqueue the request with rate limit handling
      const result = await rateLimitQueue.enqueue(async () => {
        console.log('📤 Sending prompt to Gemini...');
        console.log(`🔗 API URL: ${apiUrl.substring(0, 80)}...`);

        try {
          const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contents: [{
                parts: [{ text: enrichedPrompt }]
              }],
              generationConfig: {
                temperature: 0.7,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 2000,
              }
            }),
            timeout: 30000,
          });

          console.log('📥 Response status:', response.status);

        // Handle rate limit errors explicitly
        if (response.status === 429) {
          const errorData = await response.json().catch(() => ({}));
          const retryAfter = errorData?.error?.details?.[0]?.retryDelay || 'unknown';
          
          const error = new Error(`API rate limited. Retry after: ${retryAfter}`);
          error.status = 429;
          error.retryAfter = retryAfter;
          throw error;
        }

        if (!response.ok) {
          const errorData = await response.text();
          console.error('❌ Gemini API error response:', errorData);
          throw new Error(`API returned ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('✅ Gemini response received');

        // Extract text from response
        let analysis = 'No analysis available';
        if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0]) {
          analysis = data.candidates[0].content.parts[0].text;
        }

        console.log('✅ Analysis extracted successfully');

        return {
          analysis,
          drugRules,
          recommendations,
          chemistryContext
        };
        } catch (fetchError) {
          console.error('❌ Network error calling Gemini API:', {
            message: fetchError.message,
            type: fetchError.constructor.name,
            code: fetchError.code,
          });
          // Check if it's a network error or timeout
          if (fetchError.message.includes('fetch failed') || fetchError.message.includes('ECONNREFUSED')) {
            throw new Error('Network error: Unable to reach Gemini API. Please check your internet connection.');
          }
          throw fetchError;
        }
      }, { maxRetries: 3, timeout: 35000 });

      // Post-process to correct hallucinations
      if (moleculeData && result.analysis) {
        result.analysis = validateAnalysisOutput(result.analysis, moleculeData, drugRules);
      }

      // Return structured response with data classification
      res.json({
        success: true,
        analysis: result.analysis,
        type: type || 'analysis',
        dataClassification: moleculeData ? {
          physicochemical: 'PubChem (experimentally verified)',
          derived_rules: 'Rule-based chemistry assessment',
          recommendations: 'AI-generated recommendations',
          ai_insights: 'Gemini model output'
        } : null,
        drugRules: result.drugRules || null,
        recommendations: result.recommendations || null,
        queueInfo: {
          processed: true,
          timestamp: new Date().toISOString()
        }
      });
    } catch (geminiError) {
      // Special handling for rate limit errors
      if (geminiError.status === 429) {
        console.warn('⚠️ Gemini API rate limit hit');
        return res.status(429).json({
          success: false,
          message: 'API rate limit reached. Please try again in a moment.',
          retryAfter: geminiError.retryAfter,
          error: 'RATE_LIMIT_EXCEEDED',
          queueStats: rateLimitQueue.getStats()
        });
      }

      // Timeout errors
      if (geminiError.message.includes('timeout')) {
        console.error('❌ Gemini API timeout:', geminiError.message);
        return res.status(504).json({
          success: false,
          message: 'API request timeout. The service is taking too long to respond.',
          error: 'REQUEST_TIMEOUT'
        });
      }

      console.error('❌ Gemini API call failed:', {
        message: geminiError.message,
        stack: geminiError.stack
      });

      res.status(500).json({
        success: false,
        message: 'Failed to call Gemini API',
        error: geminiError.message
      });
    }
  } catch (error) {
    console.error('Error in analyze endpoint:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

module.exports = router;
