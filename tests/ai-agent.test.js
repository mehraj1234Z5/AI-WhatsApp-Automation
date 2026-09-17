const assert = require('assert');
const { buildPrompt } = require('../agent/prompts/templates');
const { cleanGeneratedText, calculateWordSimilarity, validateContent } = require('../agent/validator/contentValidator');
const ollamaService = require('../agent/generator/ollama');

async function runAITests() {
  console.log('\n--- Running AI Agent & Validator Tests ---');

  // Test 1: Prompt Construction
  const promptData = buildPrompt({
    category: 'SQL',
    topic: 'Window Functions (ROW_NUMBER)',
    contentType: 'Daily Tip',
    audience: 'Data Analytics Students',
    language: 'English',
    tone: 'Professional & Engaging'
  });
  assert(promptData.systemPrompt.includes('STRICT WHATSAPP FORMATTING RULES'), 'System prompt must contain formatting rules');
  assert(promptData.userPrompt.includes('Window Functions (ROW_NUMBER)'), 'User prompt must include topic');
  console.log('✔ Test 1: AI Prompt builder generated structured system and user prompts.');

  // Test 2: Text Cleaning & DeepSeek-R1 <think> stripping
  const rawTextWithThink = '<think>I should write a post about SQL window functions.</think>Here is the post:\n*SQL Tip of the Day:*\nUse `ROW_NUMBER()` to assign sequential numbers.';
  const cleaned = cleanGeneratedText(rawTextWithThink);
  assert(!cleaned.includes('<think>'), 'Cleaned text must not contain <think> tags');
  assert(!cleaned.includes('Here is the post:'), 'Cleaned text must not contain conversational filler');
  assert(cleaned.includes('*SQL Tip of the Day:*'), 'Cleaned text must retain core WhatsApp content');
  console.log('✔ Test 2: Text cleaner stripped reasoning tags and conversational boilerplate.');

  // Test 3: Word Similarity (Duplicate Prevention Algorithm)
  const textA = 'Master SQL window functions like ROW_NUMBER and RANK for high performance analytics queries.';
  const textB = 'Master SQL window functions such as ROW_NUMBER and RANK for fast analytics queries.';
  const textC = 'Learn how to build responsive React web applications with Vite and TailwindCSS.';
  const similarityAB = calculateWordSimilarity(textA, textB);
  const similarityAC = calculateWordSimilarity(textA, textC);

  assert(similarityAB > 0.5, `Expected high similarity between related texts, got ${similarityAB}`);
  assert(similarityAC < 0.2, `Expected very low similarity between unrelated texts, got ${similarityAC}`);
  console.log(`✔ Test 3: Duplicate similarity engine verified (SimAB: ${(similarityAB * 100).toFixed(1)}%, SimAC: ${(similarityAC * 100).toFixed(1)}%).`);

  // Test 4: Content Validation Pipeline
  const validPost = '*Mastering SQL Window Functions*\n\nDid you know `ROW_NUMBER()` helps paginate?\n\n```sql\nSELECT id, ROW_NUMBER() OVER (ORDER BY salary DESC) as rank FROM employees;\n```\n\n_What is your favorite query trick?_';
  const validationRes = await validateContent(validPost, 'SQL Window Functions');
  assert(validationRes.isValid === true, 'Valid formatted post should pass validation');
  assert(validationRes.cleanedContent.length > 50, 'Cleaned content length must be valid');
  console.log('✔ Test 4: Content validation pipeline passed for WhatsApp formatted post.');

  // Test 5: Ollama Server & Model Detection
  const health = await ollamaService.checkHealth();
  console.log(`✔ Test 5: Local Ollama connectivity checked (Status: ${health.status}, Connected: ${health.connected}, Models: ${health.availableModels.join(', ') || 'None'}).`);

  return true;
}

module.exports = runAITests;

if (require.main === module) {
  runAITests()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('AI Test Failed:', err);
      process.exit(1);
    });
}
