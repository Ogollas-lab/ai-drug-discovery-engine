/**
 * Structured engine logging with trace/run correlation.
 */
'use strict';

const { randomUUID } = require('crypto');

function log(level, message, meta = {}) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    message,
    service: 'pawanax-engine',
    ...meta,
  };
  const line = JSON.stringify(entry);
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

function createTraceId() {
  return randomUUID();
}

function traceMiddleware(req, res, next) {
  const traceId = req.headers['x-trace-id'] || createTraceId();
  req.traceId = traceId;
  res.setHeader('X-Trace-Id', traceId);
  log('info', 'engine_request', { traceId, method: req.method, path: req.path });
  next();
}

module.exports = { log, createTraceId, traceMiddleware };
