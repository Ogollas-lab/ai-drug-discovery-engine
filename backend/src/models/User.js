const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema({
  // Basic Info
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    match: /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/
  },
  password: {
    type: String,
    required: true,
    minlength: 8,
    select: false
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },

  // Organization
  organizationType: {
    type: String,
    enum: ['individual', 'startup', 'university', 'enterprise'],
    default: 'individual'
  },
  organizationName: String,
  organizationEmail: String,

  // Subscription Details
  subscription: {
    tier: {
      type: String,
      enum: ['free', 'pro', 'university', 'enterprise'],
      default: 'free'
    },
    
    // Pricing tiers
    // Free: $0 - limited features
    // Pro: $5-$10/month - individual researchers
    // University: $100-$500/month - educational institutions
    // Enterprise: $200-$700/month - startups & companies
    
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended', 'cancelled'],
      default: 'active'
    },
    
    startDate: {
      type: Date,
      default: Date.now
    },
    
    renewalDate: Date,
    
    cancelledDate: Date,
    
    // Billing info
    stripeCustomerId: String,
    stripeSubscriptionId: String,
    
    // Auto-renewal
    autoRenew: {
      type: Boolean,
      default: true
    },
    
    // Payment method
    paymentMethod: {
      type: {
        type: String,
        enum: ['card', 'bank_transfer']
      },
      last4: String,
      expiryMonth: Number,
      expiryYear: Number
    }
  },

  // Usage Limits by Tier
  limits: {
    // Free tier
    dailySimulations: {
      type: Number,
      default: function() {
        return this.subscription.tier === 'free' ? 5 : 
               this.subscription.tier === 'pro' ? 100 :
               this.subscription.tier === 'university' ? 1000 :
               -1; // unlimited
      }
    },
    
    monthlySimulations: {
      type: Number,
      default: function() {
        return this.subscription.tier === 'free' ? 50 : 
               this.subscription.tier === 'pro' ? 1000 :
               this.subscription.tier === 'university' ? 10000 :
               -1; // unlimited
      }
    },
    
    moleculesPerMonth: {
      type: Number,
      default: function() {
        return this.subscription.tier === 'free' ? 20 : 
               this.subscription.tier === 'pro' ? 500 :
               this.subscription.tier === 'university' ? 5000 :
               -1; // unlimited
      }
    },
    
    advancedPredictions: {
      type: Boolean,
      default: function() {
        return this.subscription.tier !== 'free';
      }
    },
    
    realDatasets: {
      type: Boolean,
      default: function() {
        return this.subscription.tier !== 'free';
      }
    },
    
    whatIfChemist: {
      type: Boolean,
      default: function() {
        return this.subscription.tier === 'pro' || 
               this.subscription.tier === 'university' ||
               this.subscription.tier === 'enterprise';
      }
    },
    
    exportReports: {
      type: Boolean,
      default: function() {
        return this.subscription.tier !== 'free';
      }
    },
    
    apiAccess: {
      type: Boolean,
      default: function() {
        return this.subscription.tier === 'university' || 
               this.subscription.tier === 'enterprise';
      }
    },
    
    batchProcessing: {
      type: Boolean,
      default: function() {
        return this.subscription.tier === 'enterprise';
      }
    },
    
    dedicatedSupport: {
      type: Boolean,
      default: function() {
        return this.subscription.tier === 'enterprise';
      }
    }
  },

  // Usage Tracking
  usageMetrics: {
    simulationsUsedToday: {
      type: Number,
      default: 0
    },
    
    simulationsUsedThisMonth: {
      type: Number,
      default: 0
    },
    
    moleculesCreatedThisMonth: {
      type: Number,
      default: 0
    },
    
    lastResetDate: {
      type: Date,
      default: Date.now
    },
    
    totalSimulationsAllTime: {
      type: Number,
      default: 0
    },
    
    totalMoleculesCreated: {
      type: Number,
      default: 0
    },
    
    totalPredictionsRun: {
      type: Number,
      default: 0
    }
  },

  // Features Access
  features: {
    whatIfChemist: {
      type: Boolean,
      default: false
    },
    interactivePharmacologyLab: {
      type: Boolean,
      default: false
    },
    realTimeDataAnalysis: {
      type: Boolean,
      default: false
    },
    explainableAIPredictions: {
      type: Boolean,
      default: false
    },
    pubchemIntegration: {
      type: Boolean,
      default: false
    },
    advancedReporting: {
      type: Boolean,
      default: false
    }
  },

  // Team Management
  team: {
    maxMembers: {
      type: Number,
      default: function() {
        return this.subscription.tier === 'free' ? 1 : 
               this.subscription.tier === 'pro' ? 3 :
               this.subscription.tier === 'university' ? 50 :
               -1; // unlimited
      }
    },
    
    members: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      role: {
        type: String,
        enum: ['admin', 'researcher', 'viewer'],
        default: 'researcher'
      },
      joinedDate: {
        type: Date,
        default: Date.now
      }
    }],
    
    invitations: [{
      email: String,
      role: String,
      invitedAt: {
        type: Date,
        default: Date.now
      },
      expiresAt: Date,
      status: {
        type: String,
        enum: ['pending', 'accepted', 'expired'],
        default: 'pending'
      }
    }]
  },

  // Account Status
  isVerified: {
    type: Boolean,
    default: false
  },
  
  verificationToken: String,
  verificationTokenExpiry: Date,

  passwordResetToken: String,
  passwordResetExpiry: Date,

  // Preferences
  preferences: {
    emailNotifications: {
      type: Boolean,
      default: true
    },
    weeklyReports: {
      type: Boolean,
      default: true
    },
    researchUpdates: {
      type: Boolean,
      default: true
    },
    language: {
      type: String,
      default: 'en'
    }
  },

  // Activity Tracking
  lastLogin: Date,
  lastApiCall: Date,

  // Subscription Usage Tracking (new format for frontend)
  analysesUsedToday: {
    type: Number,
    default: 0
  },
  
  analysesUsedThisMonth: {
    type: Number,
    default: 0
  },
  
  lastDailyResetDate: {
    type: String, // YYYY-MM-DD format
    default: function() {
      return new Date().toISOString().split('T')[0];
    }
  },
  
  isTrialActive: {
    type: Boolean,
    default: true
  },
  
  dismissedUpgradePrompt: {
    type: Boolean,
    default: false
  },
  
  // Audit
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  }

}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Method to generate JWT token
userSchema.methods.generateAuthToken = function() {
  const token = jwt.sign(
    {
      id: this._id,
      email: this.email,
      tier: this.subscription.tier
    },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '24h' }
  );
  return token;
};

// Method to generate refresh token
userSchema.methods.generateRefreshToken = function() {
  const token = jwt.sign(
    { id: this._id },
    process.env.JWT_REFRESH_SECRET || 'your-refresh-secret',
    { expiresIn: '7d' }
  );
  return token;
};

// Method to check if user can use feature
userSchema.methods.canUseFeature = function(featureName) {
  const tierFeatures = {
    free: ['pubchemIntegration'],
    pro: ['whatIfChemist', 'realTimeDataAnalysis', 'explainableAIPredictions', 'advancedReporting', 'pubchemIntegration'],
    university: ['whatIfChemist', 'realTimeDataAnalysis', 'explainableAIPredictions', 'advancedReporting', 'pubchemIntegration', 'apiAccess'],
    enterprise: ['whatIfChemist', 'realTimeDataAnalysis', 'explainableAIPredictions', 'advancedReporting', 'pubchemIntegration', 'apiAccess', 'batchProcessing', 'dedicatedSupport']
  };

  const allowedFeatures = tierFeatures[this.subscription.tier] || [];
  return allowedFeatures.includes(featureName);
};

// Method to check usage limits
userSchema.methods.canPerformAction = function(actionType) {
  const limits = this.limits;
  const usage = this.usageMetrics;

  switch(actionType) {
    case 'simulation':
      if (limits.dailySimulations === -1 && limits.monthlySimulations === -1) return true; // unlimited
      
      const dailyOk = limits.dailySimulations === -1 || usage.simulationsUsedToday < limits.dailySimulations;
      const monthlyOk = limits.monthlySimulations === -1 || usage.simulationsUsedThisMonth < limits.monthlySimulations;
      
      return dailyOk && monthlyOk;
    
    case 'create_molecule':
      if (limits.moleculesPerMonth === -1) return true; // unlimited
      return usage.moleculesCreatedThisMonth < limits.moleculesPerMonth;
    
    case 'advanced_prediction':
      return limits.advancedPredictions;
    
    case 'real_dataset':
      return limits.realDatasets;
    
    default:
      return true;
  }
};

// Method to get remaining quota
userSchema.methods.getRemainingQuota = function(actionType) {
  const limits = this.limits;
  const usage = this.usageMetrics;

  switch(actionType) {
    case 'simulation':
      if (limits.dailySimulations === -1 && limits.monthlySimulations === -1) return 'unlimited';
      
      const remainingDaily = limits.dailySimulations === -1 ? Infinity : Math.max(0, limits.dailySimulations - usage.simulationsUsedToday);
      const remainingMonthly = limits.monthlySimulations === -1 ? Infinity : Math.max(0, limits.monthlySimulations - usage.simulationsUsedThisMonth);
      
      return Math.min(remainingDaily, remainingMonthly);
    
    case 'create_molecule':
      if (limits.moleculesPerMonth === -1) return 'unlimited';
      return Math.max(0, limits.moleculesPerMonth - usage.moleculesCreatedThisMonth);
    
    default:
      return 'unlimited';
  }
};

// Indexes
userSchema.index({ 'subscription.tier': 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ lastLogin: -1 });

module.exports = mongoose.model('User', userSchema);
