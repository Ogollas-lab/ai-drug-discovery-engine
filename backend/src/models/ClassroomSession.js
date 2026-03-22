const mongoose = require('mongoose');

const classroomSessionSchema = new mongoose.Schema({
  // Session Info
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  date: {
    type: String,
    required: true
  },
  scenario: {
    type: String,
    required: true,
    enum: ['Design a Safer NSAID', 'Avoid QT Prolongation', 'Brain-Penetrant Drug', 'Novel Antibiotic Scaffold']
  },
  scenarioId: {
    type: String,
    enum: ['nsaid', 'qt', 'cns', 'antibiotic']
  },
  status: {
    type: String,
    enum: ['draft', 'active', 'completed'],
    default: 'draft'
  },
  joinCode: {
    type: String,
    required: true,
    unique: true
  },

  // Student Submissions
  studentWork: [{
    id: String,
    name: String,
    molecule: String,
    smiles: String,
    mw: Number,
    logP: Number,
    hDonors: Number,
    hAcceptors: Number,
    tpsa: Number,
    lipinskiPass: Boolean,
    submittedAt: String,
    source: {
      type: String,
      default: 'pubchem'
    }
  }],

  // Chat/Discussion
  chat: [{
    id: String,
    author: String,
    text: String,
    time: String,
    isInstructor: Boolean
  }],

  // Stats
  students: {
    type: Number,
    default: 0
  },

  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update updatedAt before saving
classroomSessionSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('ClassroomSession', classroomSessionSchema);
