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

// Body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/vitalis-ai')
.then(() => console.log('✓ MongoDB connected'))
.catch(err => console.error('✗ MongoDB connection error:', err));

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

// Webhook Routes (raw body, no auth needed)
app.use('/api/webhooks', webhookRoutes);

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
