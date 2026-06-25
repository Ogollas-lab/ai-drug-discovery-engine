/**
 * Slim Express bootstrap — Vitalis engine + Pawanax chat (no MongoDB).
 */
'use strict';

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const { initEngine } = require('./engine');
const { optionalNeonAuth } = require('./auth/neon-auth');

const app = express();

app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || process.env.FRONTEND_URL || 'http://localhost:8080',
  credentials: true,
}));
app.use(morgan(process.env.NODE_ENV === 'development' ? 'dev' : 'combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(optionalNeonAuth);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    engine: 'v3.1.0',
    database: process.env.DATABASE_URL ? 'neon_configured' : 'memory_fallback',
    auth: process.env.NEON_AUTH_URL ? 'neon_oauth' : 'guest',
    user: req.user || null,
  });
});

app.get('/api/auth/config', (req, res) => {
  res.json({
    success: true,
    neonAuthUrl: process.env.NEON_AUTH_URL || null,
    providers: ['google', 'email'],
    callbackUrl: `${process.env.FRONTEND_URL || 'http://localhost:8080'}/auth/callback`,
  });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
  });
});

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await initEngine(app);
  } catch (err) {
    console.error('Engine init failed:', err.message);
  }

  if (!app._engine404Mounted) {
    app.use((req, res) => {
      res.status(404).json({ success: false, message: 'Route not found', path: req.path });
    });
    app._engine404Mounted = true;
  }

  if (process.env.NODE_ENV === 'test') return app;

  app.listen(PORT, () => {
    console.log(`\n🚀 Vitalis AI Drug Engine → http://localhost:${PORT}`);
    console.log(`🧬 Engine health → http://localhost:${PORT}/api/engine/health`);
    console.log(`💬 Pawanax Chat   → http://localhost:${PORT}/api/engine/chat/stream\n`);
  });

  return app;
}

if (process.env.NODE_ENV !== 'test') {
  startServer();
}

module.exports = app;
module.exports.startServer = startServer;
