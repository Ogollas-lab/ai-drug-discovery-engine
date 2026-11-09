/**
 * Chat API — SSE streaming with in-chat tool payloads for Vitalis UI.
 */
'use strict';

const express = require('express');
const { streamChat } = require('../orchestrator/chat-agent');
const { traceMiddleware } = require('../observability/logger');

const router = express.Router();
router.use(traceMiddleware);

function isValidMessages(messages) {
  return Array.isArray(messages) &&
    messages.length > 0 &&
    messages.length <= 50 &&
    messages.every((message) =>
      message &&
      (message.role === 'user' || message.role === 'assistant') &&
      typeof message.content === 'string' &&
      message.content.length <= 20000
    );
}

router.post('/stream', async (req, res) => {
  const { messages } = req.body;
  if (!isValidMessages(messages)) {
    return res.status(400).json({ success: false, message: 'messages must contain user or assistant text only' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Trace-Id', req.traceId);
  res.flushHeaders();

  const send = (payload) => {
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  };

  send({ type: 'connected', traceId: req.traceId });

  try {
    for await (const event of streamChat({ messages, traceId: req.traceId })) {
      send(event);
      if (event.type === 'error') break;
    }
  } catch (err) {
    send({ type: 'error', data: { message: err.message } });
  }

  res.end();
});

/** Non-streaming fallback for simple clients */
router.post('/', async (req, res) => {
  const { messages } = req.body;
  if (!isValidMessages(messages)) {
    return res.status(400).json({ success: false, message: 'messages must contain user or assistant text only' });
  }

  let text = '';
  const toolResults = [];

  try {
    for await (const event of streamChat({ messages, traceId: req.traceId })) {
      if (event.type === 'token') text += event.data.text;
      if (event.type === 'tool_result') toolResults.push(event.data);
      if (event.type === 'error') {
        return res.status(500).json({ success: false, message: event.data.message });
      }
    }
    res.json({ success: true, text, toolResults, traceId: req.traceId });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
