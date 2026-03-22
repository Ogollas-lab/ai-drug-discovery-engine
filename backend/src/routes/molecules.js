const express = require('express');
const router = express.Router();
const Molecule = require('../models/Molecule');
const ExternalDataService = require('../services/ExternalDataService');
const AIPredictionService = require('../services/AIPredictionService');

/**
 * POST /api/molecules
 * Create a new molecule or register existing one
 */
router.post('/', async (req, res) => {
  try {
    const { smiles, commonName, disease, createdBy } = req.body;

    // Validate SMILES
    if (!ExternalDataService.validateSMILES(smiles)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid SMILES format'
      });
    }

    // Check if molecule already exists
    let molecule = await Molecule.findOne({ smiles });
    if (molecule) {
      return res.status(409).json({
        success: false,
        message: 'Molecule already exists',
        data: molecule
      });
    }

    // Fetch external data
    const externalData = await ExternalDataService.comprehensiveMoleculeLookup(smiles);

    // Create molecule document
    molecule = new Molecule({
      smiles,
      commonName,
      disease,
      createdBy: createdBy || 'system',
      inchi: externalData.pubchem?.inchi,
      iupacName: externalData.pubchem?.iupacName,
      molecularWeight: externalData.pubchem?.molecularWeight,
      molecularFormula: externalData.pubchem?.molecularFormula,
      logP: externalData.pubchem?.logP,
      hBondDonors: externalData.pubchem?.hBondDonors,
      hBondAcceptors: externalData.pubchem?.hBondAcceptors,
      rotatableBonds: externalData.pubchem?.rotatableBonds,
      topologicalPolarSurfaceArea: externalData.pubchem?.topologicalPolarSurfaceArea,
      pubchemCid: externalData.pubchem?.pubchemCid,
      pubchemValidation: externalData.pubchem,
      chemblValidation: externalData.chembl,
      versions: [{
        versionNumber: 1,
        smiles,
        modifications: 'Initial molecule',
        timestamp: new Date()
      }]
    });

    // Check Lipinski compliance
    const lipinskiCheck = ExternalDataService.checkLipinskiCompliance(molecule);
    molecule.tags = lipinskiCheck.compliant ? ['drug-like'] : ['non-compliant'];

    await molecule.save();

    res.status(201).json({
      success: true,
      message: 'Molecule created successfully',
      data: molecule,
      externalValidation: {
        pubchexmMatch: !!externalData.pubchem,
        chemblMatches: externalData.chembl.length,
        bioassays: externalData.bioassays.length
      }
    });
  } catch (error) {
    console.error('Error creating molecule:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/molecules
 * List all molecules with filtering and pagination
 */
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, disease, tags, sortBy = '-createdAt' } = req.query;
    const skip = (page - 1) * limit;

    let query = { isArchived: false };

    if (disease) {
      query.disease = disease;
    }

    if (tags) {
      query.tags = { $in: tags.split(',') };
    }

    const molecules = await Molecule.find(query)
      .sort(sortBy)
      .skip(skip)
      .limit(parseInt(limit))
      .select('-versions');

    const total = await Molecule.countDocuments(query);

    res.json({
      success: true,
      data: molecules,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching molecules:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/molecules/:id
 * Get specific molecule with full details
 */
router.get('/:id', async (req, res) => {
  try {
    const molecule = await Molecule.findById(req.params.id);

    if (!molecule) {
      return res.status(404).json({
        success: false,
        message: 'Molecule not found'
      });
    }

    res.json({
      success: true,
      data: molecule
    });
  } catch (error) {
    console.error('Error fetching molecule:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * PUT /api/molecules/:id
 * Update molecule metadata
 */
router.put('/:id', async (req, res) => {
  try {
    const { commonName, disease, tags, mechanism } = req.body;

    const molecule = await Molecule.findByIdAndUpdate(
      req.params.id,
      {
        commonName,
        disease,
        tags,
        mechanism,
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!molecule) {
      return res.status(404).json({
        success: false,
        message: 'Molecule not found'
      });
    }

    res.json({
      success: true,
      message: 'Molecule updated',
      data: molecule
    });
  } catch (error) {
    console.error('Error updating molecule:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * POST /api/molecules/:id/version
 * Create a new version with modifications
 */
router.post('/:id/version', async (req, res) => {
  try {
    const { newSmiles, modifications } = req.body;

    const molecule = await Molecule.findById(req.params.id);
    if (!molecule) {
      return res.status(404).json({
        success: false,
        message: 'Molecule not found'
      });
    }

    // Get current max version
    const maxVersion = molecule.versions.length || 0;

    // Add new version
    molecule.versions.push({
      versionNumber: maxVersion + 1,
      smiles: newSmiles,
      modifications,
      timestamp: new Date()
    });

    // If significant modification, update main SMILES
    if (req.body.updateMain) {
      molecule.smiles = newSmiles;
    }

    molecule.updatedAt = new Date();
    await molecule.save();

    res.json({
      success: true,
      message: 'Version created',
      data: {
        molecule,
        newVersion: maxVersion + 1
      }
    });
  } catch (error) {
    console.error('Error creating version:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/molecules/:id/history
 * Get simulation and prediction history
 */
router.get('/:id/history', async (req, res) => {
  try {
    const molecule = await Molecule.findById(req.params.id);

    if (!molecule) {
      return res.status(404).json({
        success: false,
        message: 'Molecule not found'
      });
    }

    res.json({
      success: true,
      data: {
        moleculeId: molecule._id,
        versions: molecule.versions,
        simulationCount: molecule.simulationCount,
        lastUpdated: molecule.updatedAt,
        predictionsSnapshot: molecule.predictions
      }
    });
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * DELETE /api/molecules/:id
 * Archive molecule (soft delete)
 */
router.delete('/:id', async (req, res) => {
  try {
    const molecule = await Molecule.findByIdAndUpdate(
      req.params.id,
      { isArchived: true, updatedAt: new Date() },
      { new: true }
    );

    if (!molecule) {
      return res.status(404).json({
        success: false,
        message: 'Molecule not found'
      });
    }

    res.json({
      success: true,
      message: 'Molecule archived',
      data: molecule
    });
  } catch (error) {
    console.error('Error deleting molecule:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/molecules/similar/:smiles
 * Find similar molecules
 */
router.get('/similar/:smiles', async (req, res) => {
  try {
    const { threshold = 0.9 } = req.query;

    // Search PubChem for similar structures
    const pubchemSimilar = await ExternalDataService.searchSimilarCompounds(
      req.params.smiles,
      threshold
    );

    // Search local database
    const localMolecules = await Molecule.find(
      { isArchived: false },
      'smiles commonName molecularWeight logP'
    ).limit(20);

    res.json({
      success: true,
      data: {
        pubchemMatches: pubchemSimilar.slice(0, 10),
        localMatches: localMolecules,
        searchSMILES: req.params.smiles,
        threshold
      }
    });
  } catch (error) {
    console.error('Error searching similar molecules:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
