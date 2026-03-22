const express = require('express');
const router = express.Router();
const Molecule = require('../models/Molecule');
const Simulation = require('../models/Simulation');
const AIPredictionService = require('../services/AIPredictionService');

/**
 * POST /api/simulations/what-if
 * Run what-if analysis on molecule modifications
 */
router.post('/what-if', async (req, res) => {
  try {
    const { moleculeId, smiles, modifications, targetProperty = 'binding-affinity', educationalMode = false } = req.body;

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

    // Run what-if analysis
    const whatIfResult = await AIPredictionService.whatIfAnalysis(
      molecule,
      modifications,
      targetProperty
    );

    // Create simulation record
    const simulation = new Simulation({
      moleculeId: molecule._id,
      name: `What-if: ${modifications.join(', ')}`,
      simulationType: 'what-if',
      parameters: {
        modifications,
        targetProtein: req.body.targetProtein,
        disease: molecule.disease,
        constraints: req.body.constraints
      },
      results: {
        baselineResults: molecule.predictions,
        modifiedResults: whatIfResult.predictions,
        improvements: {
          overallScore: whatIfResult.predictions.improvement || 0
        }
      },
      educationalMetadata: educationalMode ? {
        learningObjectives: [
          'Understand structure-activity relationships',
          'Explore effects of molecular modifications',
          'Predict clinical outcomes of chemical changes'
        ],
        complexity: 'intermediate',
        explanations: {
          molecularBasis: whatIfResult.predictions.summary || 'Analysis pending',
          chemistryInsight: 'Modifications affect binding affinity and ADME properties',
          pharmacologicalSignificance: `Proposed changes may improve ${targetProperty}`
        }
      } : undefined,
      createdBy: req.body.createdBy || 'system',
      isPublic: educationalMode
    });

    await simulation.save();

    // Update molecule simulation count
    molecule.simulationCount = (molecule.simulationCount || 0) + 1;
    await molecule.save();

    res.json({
      success: true,
      message: 'What-if analysis completed',
      data: {
        simulation: simulation._id,
        moleculeId: molecule._id,
        modifications,
        targetProperty,
        results: whatIfResult.predictions,
        executionTimeMs: whatIfResult.executionTimeMs,
        educationalMetadata: simulation.educationalMetadata
      }
    });
  } catch (error) {
    console.error('Error running what-if analysis:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * POST /api/simulations/binding-affinity
 * Run binding affinity simulation for multiple targets
 */
router.post('/binding-affinity', async (req, res) => {
  try {
    const { moleculeId, smiles, targetProteins } = req.body;

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

    // Run predictions for multiple targets
    const targetResults = [];
    for (const target of targetProteins) {
      const prediction = await AIPredictionService.predictBindingAffinity(
        molecule,
        target.name
      );
      targetResults.push({
        target: target.name,
        uniprotId: target.uniprotId,
        ...prediction
      });
    }

    const simulation = new Simulation({
      moleculeId: molecule._id,
      name: `Binding Affinity: ${targetProteins.map(t => t.name).join(', ')}`,
      simulationType: 'binding-affinity',
      parameters: {
        targetProteins: targetProteins.map(t => t.name)
      },
      results: {
        baselineResults: { targetCount: targetProteins.length },
        modifiedResults: targetResults
      },
      createdBy: req.body.createdBy || 'system'
    });

    await simulation.save();
    molecule.simulationCount = (molecule.simulationCount || 0) + 1;
    await molecule.save();

    res.json({
      success: true,
      message: 'Binding affinity simulation completed',
      data: {
        simulation: simulation._id,
        targetResults,
        executionTimeMs: targetResults.reduce((sum, r) => sum + (r.executionTimeMs || 0), 0)
      }
    });
  } catch (error) {
    console.error('Error running binding affinity simulation:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * POST /api/simulations/adme
 * Run ADME simulation
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

    const admeResult = await AIPredictionService.predictADME(molecule);

    const simulation = new Simulation({
      moleculeId: molecule._id,
      name: `ADME Simulation: ${molecule.commonName || molecule.smiles}`,
      simulationType: 'adme',
      parameters: {},
      results: {
        baselineResults: admeResult
      },
      educationalMetadata: {
        learningObjectives: [
          'Understand drug absorption in GI tract',
          'Learn how drugs distribute to organs',
          'Explore metabolic pathways',
          'Predict elimination routes'
        ],
        complexity: 'intermediate',
        explanations: {
          molecularBasis: 'ADME properties depend on molecular weight, LogP, and functional groups',
          chemistryInsight: 'Hydrophilic molecules are poorly absorbed; lipophilic molecules penetrate BBB',
          pharmacologicalSignificance: 'ADME properties determine drug efficacy, safety, and dosing'
        }
      },
      createdBy: req.body.createdBy || 'system',
      isPublic: true
    });

    await simulation.save();
    molecule.simulationCount = (molecule.simulationCount || 0) + 1;
    await molecule.save();

    res.json({
      success: true,
      message: 'ADME simulation completed',
      data: {
        simulation: simulation._id,
        results: admeResult,
        executionTimeMs: admeResult.executionTimeMs
      }
    });
  } catch (error) {
    console.error('Error running ADME simulation:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/simulations/:moleculeId
 * Get all simulations for a molecule
 */
router.get('/:moleculeId', async (req, res) => {
  try {
    const simulations = await Simulation.find({
      moleculeId: req.params.moleculeId
    }).sort('-createdAt');

    res.json({
      success: true,
      data: simulations,
      count: simulations.length
    });
  } catch (error) {
    console.error('Error fetching simulations:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/simulations/details/:simulationId
 * Get specific simulation details
 */
router.get('/details/:simulationId', async (req, res) => {
  try {
    const simulation = await Simulation.findById(req.params.simulationId).populate('moleculeId');

    if (!simulation) {
      return res.status(404).json({
        success: false,
        message: 'Simulation not found'
      });
    }

    res.json({
      success: true,
      data: simulation
    });
  } catch (error) {
    console.error('Error fetching simulation:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/simulations/public/educational
 * Get educational simulations for learning
 */
router.get('/public/educational', async (req, res) => {
  try {
    const simulations = await Simulation.find({
      isPublic: true,
      educationalMetadata: { $exists: true }
    }).sort('-viewCount').limit(20);

    res.json({
      success: true,
      data: simulations,
      count: simulations.length
    });
  } catch (error) {
    console.error('Error fetching educational simulations:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * PUT /api/simulations/:id/view
 * Increment view count
 */
router.put('/:id/view', async (req, res) => {
  try {
    const simulation = await Simulation.findByIdAndUpdate(
      req.params.id,
      { $inc: { viewCount: 1 } },
      { new: true }
    );

    res.json({
      success: true,
      data: { viewCount: simulation.viewCount }
    });
  } catch (error) {
    console.error('Error updating view count:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
