const express = require('express');
const router = express.Router();
const ExternalDataService = require('../services/ExternalDataService');

/**
 * GET /api/pubchem/properties/:smiles
 * Fetch molecular properties from PubChem by SMILES
 */
router.get('/properties/:smiles', async (req, res) => {
  try {
    const properties = await ExternalDataService.fetchPubChemPropertiesBySMILES(
      req.params.smiles
    );

    if (!properties) {
      return res.status(404).json({
        success: false,
        message: 'Compound not found in PubChem',
        smiles: req.params.smiles
      });
    }

    // Check Lipinski compliance
    const lipinskiCheck = ExternalDataService.checkLipinskiCompliance(properties);

    res.json({
      success: true,
      data: properties,
      drugLikeness: lipinskiCheck
    });
  } catch (error) {
    console.error('Error fetching PubChem properties:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/pubchem/compound/:cid
 * Get detailed compound information from PubChem
 */
router.get('/compound/:cid', async (req, res) => {
  try {
    const details = await ExternalDataService.fetchPubChemCompoundDetails(req.params.cid);

    if (!details) {
      return res.status(404).json({
        success: false,
        message: 'Compound not found'
      });
    }

    res.json({
      success: true,
      data: details
    });
  } catch (error) {
    console.error('Error fetching PubChem details:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/pubchem/identifiers/:cid
 * Get InChI and canonical SMILES from PubChem
 */
router.get('/identifiers/:cid', async (req, res) => {
  try {
    const identifiers = await ExternalDataService.fetchPubChemIdentifiers(req.params.cid);

    if (!identifiers) {
      return res.status(404).json({
        success: false,
        message: 'Identifiers not found'
      });
    }

    res.json({
      success: true,
      data: identifiers
    });
  } catch (error) {
    console.error('Error fetching identifiers:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/pubchem/similar/:smiles
 * Find similar compounds in PubChem
 */
router.get('/similar/:smiles', async (req, res) => {
  try {
    const { threshold = 0.9 } = req.query;

    const similarCids = await ExternalDataService.searchSimilarCompounds(
      req.params.smiles,
      parseFloat(threshold)
    );

    res.json({
      success: true,
      data: {
        query: req.params.smiles,
        threshold: parseFloat(threshold),
        similarCompounds: similarCids.slice(0, 20),
        count: similarCids.length
      }
    });
  } catch (error) {
    console.error('Error searching similar compounds:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/pubchem/bioassays/:cid
 * Get bioassay data from PubChem
 */
router.get('/bioassays/:cid', async (req, res) => {
  try {
    const assays = await ExternalDataService.fetchBioassayData(req.params.cid);

    res.json({
      success: true,
      data: {
        cid: req.params.cid,
        assays,
        count: assays.length
      }
    });
  } catch (error) {
    console.error('Error fetching bioassays:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * POST /api/pubchem/validate
 * Validate SMILES format
 */
router.post('/validate', async (req, res) => {
  try {
    const { smiles } = req.body;

    if (!smiles) {
      return res.status(400).json({
        success: false,
        message: 'SMILES required'
      });
    }

    const isValid = ExternalDataService.validateSMILES(smiles);

    res.json({
      success: true,
      data: {
        smiles,
        valid: isValid
      }
    });
  } catch (error) {
    console.error('Error validating SMILES:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * POST /api/pubchem/comprehensive
 * Comprehensive molecule lookup combining multiple sources
 */
router.post('/comprehensive', async (req, res) => {
  try {
    const { smiles, requireValidation = true } = req.body;

    if (!smiles) {
      return res.status(400).json({
        success: false,
        message: 'SMILES required'
      });
    }

    if (requireValidation && !ExternalDataService.validateSMILES(smiles)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid SMILES format'
      });
    }

    const data = await ExternalDataService.comprehensiveMoleculeLookup(smiles);

    // Add Lipinski check
    const lipinskiCheck = ExternalDataService.checkLipinskiCompliance(data.pubchem || {});

    res.json({
      success: true,
      data: {
        smiles,
        pubchem: data.pubchem,
        chembl: {
          matches: data.chembl.length,
          compounds: data.chembl.slice(0, 5)
        },
        bioassays: {
          count: data.bioassays.length,
          examples: data.bioassays.slice(0, 3)
        },
        drugLikeness: lipinskiCheck,
        timestamp: data.timestamp,
        dataSources: ['PubChem', 'ChEMBL']
      }
    });
  } catch (error) {
    console.error('Error in comprehensive lookup:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
