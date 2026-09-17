const { buildPrompt } = require('./prompts/templates');
const { generate, checkHealth, listModels } = require('./generator/ollama');
const { validateContent } = require('./validator/contentValidator');
const db = require('../database/db');

/**
 * AI Agent workflow:
 * Prompt Construction -> Ollama Call -> Validation & Duplicate Check -> SQLite Storage
 */
async function generateAndValidateContent({
  groupId = null,
  category = 'Data Analytics',
  topic = 'SQL Basics',
  contentType = 'Daily Tip',
  audience = 'Data Analytics Students',
  language = 'English',
  tone = 'Professional & Engaging',
  customInstructions = '',
  model = null,
  autoApprove = false,
  saveToDb = true
}) {
  // 1. Fetch recent posts for duplicate context
  let pastPosts = [];
  try {
    const recent = await db.all(
      'SELECT content FROM generated_content WHERE category = ? ORDER BY id DESC LIMIT 3',
      [category]
    );
    pastPosts = recent.map(r => r.content);
  } catch (err) {
    console.warn('[AI Agent] Could not fetch past posts:', err.message);
  }

  // 2. Build prompt
  const { systemPrompt, userPrompt } = buildPrompt({
    category,
    topic,
    contentType,
    audience,
    language,
    tone,
    customInstructions,
    pastPosts
  });

  // 3. Generate via Ollama
  console.log(`[AI Agent] Generating content for [${category} -> ${topic}] using model: ${model || 'default'}`);
  const genResult = await generate({
    systemPrompt,
    userPrompt,
    model
  });

  // 4. Validate output
  const validation = await validateContent(genResult.content, topic);

  const status = autoApprove ? 'approved' : 'draft';
  const approved = autoApprove ? 1 : 0;

  // 5. Store in SQLite if requested
  let contentId = null;
  if (saveToDb) {
    const insertRes = await db.run(
      `INSERT INTO generated_content 
       (group_id, category, topic, content, content_type, audience, language, tone, model, approved, status, metadata) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        groupId,
        category,
        topic,
        validation.cleanedContent,
        contentType,
        audience,
        language,
        tone,
        genResult.model,
        approved,
        status,
        JSON.stringify({
          validationErrors: validation.errors,
          validationWarnings: validation.warnings,
          duplicateInfo: validation.duplicateInfo,
          evalCount: genResult.evalCount
        })
      ]
    );
    contentId = insertRes.lastID;
  }

  return {
    id: contentId,
    content: validation.cleanedContent,
    rawContent: genResult.content,
    model: genResult.model,
    category,
    topic,
    contentType,
    audience,
    language,
    tone,
    status,
    approved: !!approved,
    validation
  };
}

module.exports = {
  generateAndValidateContent,
  checkHealth,
  listModels
};
