const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const moleculeRoutes = require('./routes/molecules');
const predictionRoutes = require('./routes/predictions');
const pubchemRoutes = require('./routes/pubchem');
const simulationRoutes = require('./routes/simulations');
const authRoutes = require('./routes/auth');
const subscriptionRoutes = require('./routes/subscription');
const classroomRoutes = require('./routes/classroom');
const webhookRoutes = require('./routes/webhooks');
const adminRoutes = require('./routes/admin');

// Middleware
const {
  checkUsageQuota,
  enforceActionLimit,
  resetMonthlyMetrics,
  authenticateToken
} = require('./middleware/auth');

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));

// Logging middleware
app.use(morgan(process.env.NODE_ENV === 'development' ? 'dev' : 'combined'));

// Webhook Routes MUST be mounted before express.json() to preserve raw body for Stripe signatures
app.use('/api/webhooks', webhookRoutes);

// Body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// MongoDB Connection
const mongoUri = process.env.MONGODB_URI || process.env.MONGODB_ATLAS_URI || 'mongodb://localhost:27017/vitalis-ai';
const mongoOptions = {
  retryWrites: true,
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 45000,
};

// Add SSL options for MongoDB Atlas
if (mongoUri.includes('mongodb+srv://')) {
  mongoOptions.ssl = true;
  // For development, you may need to disable certificate verification
  // For production, this should be false
  mongoOptions.tlsInsecure = process.env.NODE_ENV !== 'production';
}

mongoose.connect(mongoUri, mongoOptions)
  .then(() => console.log('✓ MongoDB connected'))
  .catch(err => {
    console.error('✗ MongoDB connection error:', err.message);
    // Continue running even if MongoDB fails for development
    console.log('⚠️  Running in offline mode - some features may not work');
    console.log('💡 Tip: Install local MongoDB or check MongoDB Atlas connection string');
  });

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Use middleware for usage tracking and monthly resets
app.use('/api/', checkUsageQuota);
app.use('/api/', resetMonthlyMetrics);

// Authentication Routes (public)
app.use('/api/auth', authRoutes);

// Admin Routes (protected by authenticateToken internally + requireAdmin)
app.use('/api/admin', adminRoutes);

// Webhook Routes have been lifted above body-parsers

// Subscription Routes (require auth)
app.use('/api/subscription', authenticateToken, subscriptionRoutes);

// Protected Routes with usage tracking
app.use('/api/molecules', authenticateToken, enforceActionLimit('create_molecule'), moleculeRoutes);
app.use('/api/predictions', authenticateToken, enforceActionLimit('prediction'), predictionRoutes);
app.use('/api/pubchem', authenticateToken, pubchemRoutes);
app.use('/api/simulations', authenticateToken, enforceActionLimit('simulation'), simulationRoutes);
app.use('/api/classroom', authenticateToken, classroomRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.path
  });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🚀 Vitalis AI Backend running on http://localhost:${PORT}`);
  console.log(`📊 API Documentation: http://localhost:${PORT}/api/docs`);
  console.log(`🔍 Health Check: http://localhost:${PORT}/api/health\n`);
});

module.exports = app;
