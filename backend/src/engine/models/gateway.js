/**
 * Model Gateway — swappable provider abstraction for LangChain agents.
 */
'use strict';

const { config, isNvidiaConfigured } = require('../config');

class ModelGateway {
  constructor() {
    this._chatModel = null;
    this._reasoningModel = null;
  }

  async getChatModel() {
    if (this._chatModel) return this._chatModel;
    this._chatModel = await this._createModel(config.engine.defaultProvider, 'chat');
    return this._chatModel;
  }

  async getReasoningModel() {
    if (this._reasoningModel) return this._reasoningModel;
    this._reasoningModel = await this._createModel(config.engine.defaultProvider, 'reasoning');
    return this._reasoningModel;
  }

  async _createModel(provider, tier) {
    if (provider === 'nvidia' && isNvidiaConfigured()) {
      const { ChatOpenAI } = require('@langchain/openai');
      const modelId = tier === 'reasoning' ? config.nvidia.reasoningModel : config.nvidia.chatModel;
      return new ChatOpenAI({
        model: modelId,
        apiKey: config.nvidia.apiKey,
        configuration: { baseURL: config.nvidia.baseUrl },
        temperature: tier === 'reasoning' ? 0.2 : 0.4,
        maxTokens: tier === 'reasoning' ? 4096 : 2048,
      });
    }

    if (config.gemini.apiKey) {
      return this._createGeminiModel(tier);
    }

    return this._createMockModel();
  }

  _createGeminiModel(_tier) {
    const { AIMessage } = require('@langchain/core/messages');
    const axios = require('axios');
    const apiKey = config.gemini.apiKey;
    const model = config.gemini.model;

    return {
      _llmType: () => 'gemini',
      invoke: async (messages) => {
        const text = messages.map((m) => (typeof m.content === 'string' ? m.content : JSON.stringify(m.content))).join('\n\n');
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const res = await axios.post(url, {
          contents: [{ parts: [{ text }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 2048 },
        }, { timeout: 60000 });
        const content = res.data?.candidates?.[0]?.content?.parts?.[0]?.text || '[Gemini returned empty response]';
        return new AIMessage({ content });
      },
    };
  }

  _createMockModel() {
    const { AIMessage } = require('@langchain/core/messages');
    return {
      _llmType: () => 'mock',
      invoke: async (messages) => {
        const last = messages[messages.length - 1]?.content || '';
        return new AIMessage({
          content: `[MOCK REASONING — configure NVIDIA_API_KEY]\n\nBased on validated descriptors, experimental validation is required before synthesis decisions.\n\nContext: ${String(last).slice(0, 200)}...`,
        });
      },
    };
  }

  async health() {
    const providers = [];
    if (isNvidiaConfigured()) providers.push({ id: 'nvidia', status: 'configured' });
    if (config.gemini.apiKey) providers.push({ id: 'gemini', status: 'configured' });
    if (providers.length === 0) providers.push({ id: 'mock', status: 'fallback' });
    return { providers, defaultProvider: config.engine.defaultProvider };
  }
}

const gateway = new ModelGateway();

module.exports = { ModelGateway, gateway };
