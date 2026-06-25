/**
 * Engine configuration — centralized env with safe defaults.
 */
'use strict';

const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:8080',

  databaseUrl: process.env.DATABASE_URL || null,
  redisUrl: process.env.REDIS_URL || null,

  nvidia: {
    apiKey: process.env.NVIDIA_API_KEY || '',
    baseUrl: process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1',
    reasoningModel: process.env.NVIDIA_REASONING_MODEL || 'meta/llama-3.3-70b-instruct',
    chatModel: process.env.NVIDIA_CHAT_MODEL || 'meta/llama-3.1-8b-instruct',
  },

  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
    model: process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite',
  },

  engine: {
    requireAuth: process.env.ENGINE_REQUIRE_AUTH === 'true',
    pipelineVersion: '3.1.0',
    defaultProvider: process.env.DEFAULT_MODEL_PROVIDER || 'nvidia',
  },
};

function isDatabaseConfigured() {
  return Boolean(config.databaseUrl);
}

function isNvidiaConfigured() {
  return Boolean(config.nvidia.apiKey);
}

function isRedisConfigured() {
  return Boolean(config.redisUrl);
}

module.exports = { config, isDatabaseConfigured, isNvidiaConfigured, isRedisConfigured };
