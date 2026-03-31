const mongoose = require('mongoose');

const predictionSchema = new mongoose.Schema({
  moleculeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Molecule',
    required: true
  },

  // Prediction metadata
  predictionType: {
    type: String,
    enum: ['binding-affinity', 'toxicity', 'adme', 'synthesizability', 'comprehensive'],
    required: true
  },

  // Detailed prediction results
  results: {
    // Binding Affinity
    bindingAffinity: {
      score: Number,
      confidence: Number,
      unit: String,
      targetProteins: [
        {
          name: String,
          uniprotId: String,
          predictedKd: Number,
          confidence: Number
        }
      ],
      xai: mongoose.Schema.Types.Mixed
    },

    // Toxicity Assessment
    toxicity: {
      overallScore: Number,
      confidence: Number,
      categories: [
        {
          name: String,
          score: Number,
          risk: String // 'low', 'medium', 'high'
        }
      ],
      flags: [String],
      xai: mongoose.Schema.Types.Mixed
    },

    // ADME Properties
    adme: {
      absorption: { value: Number, confidence: Number },
      distribution: { value: Number, confidence: Number },
      metabolism: { value: Number, confidence: Number },
      excretion: { value: Number, confidence: Number },
      bloodBrainBarrier: { value: Boolean, confidence: Number },
      halfLife: { value: Number, unit: String, confidence: Number },
      xai: mongoose.Schema.Types.Mixed
    },

    // Synthesizability
    synthesizability: {
      score: Number,
      confidence: Number,
      estimatedSteps: Number,
      estimatedCost: String, // 'low', 'medium', 'high'
      complexity: String,
      commonReagents: Boolean
    }
  },

  // AI Model Information
  aiModel: {
    name: String,
    version: String,
    type: String // 'gemini-2.5-flash', 'gnn', 'transformer'
  },

  // Validation data from external sources
  externalValidation: {
    pubchemMatch: {
      found: Boolean,
      similarity: Number,
      properties: mongoose.Schema.Types.Mixed
    },
    chemblMatch: {
      found: Boolean,
      compounds: [
        {
          name: String,
          similarity: Number,
          bioassayData: mongoose.Schema.Types.Mixed
        }
      ]
    }
  },

  // Confidence intervals and uncertainty
  uncertaintyEstimate: {
    confidenceLevel: String, // '95%', '90%', '85%'
    standardError: Number,
    credibleInterval: {
      lower: Number,
      upper: Number
    }
  },

  // Researcher-specific details
  detailedReport: {
    methodology: String,
    assumptions: [String],
    limitations: [String],
    references: [String],
    rawScores: mongoose.Schema.Types.Mixed
  },

  // Judge-friendly summary
  summary: {
    keyHighlights: [String],
    clinicalRelevance: String,
    speedMetrics: {
      analysisTimeMs: Number,
      dataSourcesUsed: [String]
    },
    africaCentricInsights: String
  },

  // Metadata
  createdAt: {
    type: Date,
    default: Date.now
  },
  executionTimeMs: Number,
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending'
  },
  errorMessage: String

}, {
  timestamps: true
});

// Indexes
predictionSchema.index({ moleculeId: 1 });
predictionSchema.index({ predictionType: 1 });
predictionSchema.index({ createdAt: -1 });
predictionSchema.index({ 'results.bindingAffinity.score': 1 });

module.exports = mongoose.model('Prediction', predictionSchema);
