const axios = require('axios');
const db = require('../../database/db');
require('dotenv').config();

const DEFAULT_OLLAMA_URL = process.env.OLLAMA_URL || 'http://127.0.0.1:11434';
const DEFAULT_MODEL = process.env.OLLAMA_MODEL || 'llama3:latest';
const TIMEOUT_MS = parseInt(process.env.OLLAMA_TIMEOUT_MS, 10) || 120000;

async function getOllamaConfig() {
  try {
    const urlSetting = await db.get('SELECT value FROM settings WHERE key = ?', ['ollama_url']);
    const modelSetting = await db.get('SELECT value FROM settings WHERE key = ?', ['ollama_model']);
    return {
      url: urlSetting ? urlSetting.value : DEFAULT_OLLAMA_URL,
      model: modelSetting ? modelSetting.value : DEFAULT_MODEL
    };
  } catch {
    return {
      url: DEFAULT_OLLAMA_URL,
      model: DEFAULT_MODEL
    };
  }
}

/**
 * Check if Ollama server is running and responsive
 */
async function checkHealth(customUrl) {
  const config = await getOllamaConfig();
  const targetUrl = customUrl || config.url;

  try {
    const response = await axios.get(`${targetUrl}/api/tags`, {
      timeout: 5000
    });
    const models = response.data && response.data.models ? response.data.models : [];
    return {
      status: 'OK',
      connected: true,
      url: targetUrl,
      modelsCount: models.length,
      availableModels: models.map(m => m.name || m.model)
    };
  } catch (err) {
    return {
      status: 'OFFLINE',
      connected: false,
      url: targetUrl,
      error: err.code === 'ECONNREFUSED'
        ? 'Ollama is not running. Start Ollama locally with `ollama serve` or open the Ollama app.'
        : err.message,
      modelsCount: 0,
      availableModels: []
    };
  }
}

/**
 * Get list of available models on the local Ollama instance
 */
async function listModels(customUrl) {
  const config = await getOllamaConfig();
  const targetUrl = customUrl || config.url;

  try {
    const response = await axios.get(`${targetUrl}/api/tags`, { timeout: 8000 });
    const models = (response.data && response.data.models) || [];
    return {
      success: true,
      models: models.map(m => ({
        name: m.name || m.model,
        size: m.size,
        modified_at: m.modified_at,
        details: m.details
      }))
    };
  } catch (err) {
    return {
      success: false,
      models: [],
      error: err.message
    };
  }
}

/**
 * Generate AI content using local Ollama model
 */
async function generate({ systemPrompt, userPrompt, model, temperature = 0.7, topP = 0.9 }) {
  const config = await getOllamaConfig();
  const targetUrl = config.url;
  const activeModel = model || config.model;

  // Verify health first
  const health = await checkHealth(targetUrl);
  if (!health.connected) {
    throw new Error(`Cannot connect to Ollama at ${targetUrl}. Please ensure Ollama is running locally.`);
  }

  // Model check
  const isModelPresent = health.availableModels.some(m => m === activeModel || m.startsWith(activeModel));
  if (!isModelPresent && health.availableModels.length > 0) {
    console.warn(`[Ollama] Model '${activeModel}' not in tags. Available: ${health.availableModels.join(', ')}. Trying anyway...`);
  }

  try {
    const response = await axios.post(
      `${targetUrl}/api/generate`,
      {
        model: activeModel,
        prompt: userPrompt,
        system: systemPrompt,
        stream: false,
        options: {
          num_predict: 400,
          temperature: parseFloat(temperature) || 0.7,
          top_p: parseFloat(topP) || 0.9
        }
      },
      {
        timeout: TIMEOUT_MS
      }
    );

    if (!response.data || typeof response.data.response !== 'string') {
      throw new Error('Received unexpected empty response payload from Ollama.');
    }

    return {
      content: response.data.response,
      model: activeModel,
      totalDuration: response.data.total_duration,
      evalCount: response.data.eval_count
    };
  } catch (err) {
    if (err.code === 'ECONNABORTED' || err.message.includes('timeout')) {
      throw new Error(`Ollama generation timed out after ${TIMEOUT_MS / 1000}s. Try a smaller model like tinyllama or llama3.`);
    }
    throw new Error(`Ollama generation failed: ${err.message}`);
  }
}

module.exports = {
  getOllamaConfig,
  checkHealth,
  listModels,
  generate
};
