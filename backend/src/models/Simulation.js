const mongoose = require('mongoose');

const simulationSchema = new mongoose.Schema({
  // Simulation metadata
  moleculeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Molecule',
    required: true
  },

  name: String,
  description: String,

  // Type of simulation
  simulationType: {
    type: String,
    enum: ['what-if', 'binding-affinity', 'adme', 'toxicity', 'multi-parameter'],
    required: true
  },

  // Parameters varied in simulation
  parameters: {
    modifications: [
      {
        type: String,
        description: String,
        // e.g., "add_methyl_group", "remove_benzene_ring"
      }
    ],
    targetProtein: String,
    disease: String,
    constraints: mongoose.Schema.Types.Mixed
  },

  // Simulation results
  results: {
    baselineResults: mongoose.Schema.Types.Mixed,
    modifiedResults: mongoose.Schema.Types.Mixed,
    improvements: {
      bindingAffinity: Number,
      toxicity: Number,
      adme: Number,
      overallScore: Number
    },
    suggestedModifications: [
      {
        description: String,
        predictedImpact: Number,
        feasibility: String // 'easy', 'moderate', 'difficult'
      }
    ]
  },

  // Educational value
  educationalMetadata: {
    learningObjectives: [String],
    complexity: String, // 'beginner', 'intermediate', 'advanced'
    explanations: {
      molecularBasis: String,
      chemistryInsight: String,
      pharmacologicalSignificance: String
    }
  },

  // Researcher data
  createdBy: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },

  // Tracking
  viewCount: {
    type: Number,
    default: 0
  },
  isPublic: {
    type: Boolean,
    default: false
  }

}, {
  timestamps: true
});

// Indexes
simulationSchema.index({ moleculeId: 1 });
simulationSchema.index({ createdBy: 1 });
simulationSchema.index({ simulationType: 1 });
simulationSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Simulation', simulationSchema);
