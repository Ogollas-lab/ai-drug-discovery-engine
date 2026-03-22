const mongoose = require('mongoose');

const moleculeSchema = new mongoose.Schema({
  // Unique identifiers
  smiles: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  inchi: String,
  iupacName: String,
  commonName: String,

  // Molecular properties from PubChem
  molecularWeight: Number,
  molecularFormula: String,
  logP: Number, // Octanol-water partition coefficient
  hBondDonors: Number,
  hBondAcceptors: Number,
  rotatableBonds: Number,
  aromaticRings: Number,
  topologicalPolarSurfaceArea: Number,
  
  // Bioactivity and structure
  pubchemCid: String,
  chemblId: String,
  source: {
    type: String,
    enum: ['pubchem', 'chembl', 'user-upload'],
    default: 'user-upload'
  },

  // AI Predictions (from Gemini)
  predictions: {
    bindingAffinity: {
      predicted: Boolean,
      score: Number, // -log(Kd) or similar
      confidence: Number,
      targetProtein: String,
      unit: String,
      timestamp: Date
    },
    toxicity: {
      predicted: Boolean,
      score: Number, // 0-1 scale
      confidence: Number,
      categories: [String],
      timestamp: Date
    },
    adme: {
      predicted: Boolean,
      absorption: Number,
      distribution: Number,
      metabolism: Number,
      excretion: Number,
      confidence: Number,
      timestamp: Date
    },
    synthesizability: {
      predicted: Boolean,
      score: Number,
      estimatedSteps: Number,
      complexity: String, // 'low', 'medium', 'high'
      timestamp: Date
    }
  },

  // Researcher metadata
  createdBy: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  
  // Version control
  versions: [{
    versionNumber: Number,
    smiles: String,
    modifications: String,
    timestamp: Date,
    predictionsSnapshot: mongoose.Schema.Types.Mixed
  }],

  // Simulation history
  simulationCount: {
    type: Number,
    default: 0
  },

  // Tags and categories
  tags: [String],
  disease: String,
  mechanism: String,

  // Real-world validation
  pubchemValidation: mongoose.Schema.Types.Mixed,
  chemblValidation: mongoose.Schema.Types.Mixed,
  
  isArchived: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
moleculeSchema.index({ pubchemCid: 1 });
moleculeSchema.index({ chemblId: 1 });
moleculeSchema.index({ createdBy: 1 });
moleculeSchema.index({ 'predictions.bindingAffinity.score': 1 });
moleculeSchema.index({ 'predictions.toxicity.score': 1 });
moleculeSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Molecule', moleculeSchema);
