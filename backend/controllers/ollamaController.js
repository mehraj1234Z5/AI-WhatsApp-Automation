const ollamaService = require('../../agent/generator/ollama');

async function getStatus(req, res, next) {
  try {
    const health = await ollamaService.checkHealth();
    return res.json({ success: true, data: health });
  } catch (err) {
    next(err);
  }
}

async function getModels(req, res, next) {
  try {
    const modelsResult = await ollamaService.listModels();
    return res.json(modelsResult);
  } catch (err) {
    next(err);
  }
}

async function testPrompt(req, res, next) {
  try {
    const { prompt, system, model, temperature } = req.body;
    if (!prompt) {
      return res.status(400).json({ success: false, error: 'Prompt is required.' });
    }

    const result = await ollamaService.generate({
      userPrompt: prompt,
      systemPrompt: system || 'You are an AI assistant.',
      model,
      temperature
    });

    return res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getStatus,
  getModels,
  testPrompt
};
