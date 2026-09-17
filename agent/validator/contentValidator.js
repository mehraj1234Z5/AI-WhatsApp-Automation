const db = require('../../database/db');

/**
 * Strips LLM conversational filler, thinking tags, and markdown code fences if wrapped around whole text
 */
function cleanGeneratedText(rawText) {
  if (!rawText || typeof rawText !== 'string') return '';

  let text = rawText;

  // Strip <think>...</think> tags (from reasoning models like DeepSeek-R1)
  text = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

  // Strip common introductory AI boilerplate
  const introPatterns = [
    /^(here\s+is\s+(a|the|your)?\s*(whatsapp\s+)?(post|message|content|tip|quiz)?:?\s*)/i,
    /^(certainly!?\s*(here\s+is\s+.*)?:?\s*)/i,
    /^(sure!?\s*(here\s+is\s+.*)?:?\s*)/i,
    /^(absolutely!?\s*)/i,
    /^(okay,?\s*here\s+is.*:?\s*)/i,
    /^(\[INST\][\s\S]*?\[\/INST\])/i
  ];

  for (const pattern of introPatterns) {
    text = text.replace(pattern, '').trim();
  }

  // Strip trailing notes
  text = text.replace(/(Hope\s+this\s+helps![\s\S]*)$/i, '').trim();
  text = text.replace(/(Let\s+me\s+know\s+if\s+you\s+need\s+anything\s+else!?[\s\S]*)$/i, '').trim();

  // If the entire text is wrapped in a single ```markdown or ``` block, unwrap it
  const codeBlockMatch = text.match(/^```(?:markdown|text)?\s*([\s\S]*?)\s*```$/i);
  if (codeBlockMatch && codeBlockMatch[1]) {
    text = codeBlockMatch[1].trim();
  }

  return text;
}

/**
 * Calculates Jaccard similarity coefficient between two strings based on word tokens
 */
function calculateWordSimilarity(text1, text2) {
  const getWords = (str) =>
    new Set(
      str
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(w => w.length > 3)
    );

  const set1 = getWords(text1);
  const set2 = getWords(text2);

  if (set1.size === 0 || set2.size === 0) return 0;

  let intersectionCount = 0;
  for (const word of set1) {
    if (set2.has(word)) {
      intersectionCount++;
    }
  }

  const unionCount = new Set([...set1, ...set2]).size;
  return unionCount === 0 ? 0 : intersectionCount / unionCount;
}

/**
 * Check if the content is too similar to any recent post in SQLite
 */
async function checkDuplicate(cleanedContent, topic, lookbackDays = 30) {
  try {
    const recentPosts = await db.all(
      `SELECT content, topic, generated_at 
       FROM generated_content 
       WHERE generated_at >= datetime('now', '-' || ? || ' days')
       ORDER BY id DESC LIMIT 50`,
      [lookbackDays]
    );

    for (const post of recentPosts) {
      if (!post.content) continue;
      const similarity = calculateWordSimilarity(cleanedContent, post.content);
      if (similarity > 0.75) {
        return {
          isDuplicate: true,
          similarity: Math.round(similarity * 100),
          matchedTopic: post.topic,
          matchedDate: post.generated_at
        };
      }
    }

    return { isDuplicate: false, similarity: 0 };
  } catch (err) {
    console.warn('[Validator] Duplicate check DB query warning:', err.message);
    return { isDuplicate: false, similarity: 0 };
  }
}

/**
 * Full validation pipeline
 */
async function validateContent(rawText, topic, options = {}) {
  const minLength = options.minLength || 50;
  const maxLength = options.maxLength || 4000;
  const lookbackDays = options.lookbackDays || 30;

  const cleaned = cleanGeneratedText(rawText);

  const errors = [];
  const warnings = [];

  if (!cleaned || cleaned.length === 0) {
    errors.push('Generated content is empty after cleaning.');
    return {
      isValid: false,
      cleanedContent: '',
      errors,
      warnings
    };
  }

  if (cleaned.length < minLength) {
    errors.push(`Content is too short (${cleaned.length} chars, minimum is ${minLength}).`);
  }

  if (cleaned.length > maxLength) {
    errors.push(`Content exceeds maximum length (${cleaned.length} chars, maximum is ${maxLength}).`);
  }

  // Check for duplicate
  const dupCheck = await checkDuplicate(cleaned, topic, lookbackDays);
  if (dupCheck.isDuplicate) {
    warnings.push(`High content similarity (${dupCheck.similarity}%) to previous post on "${dupCheck.matchedTopic}" (${dupCheck.matchedDate}).`);
  }

  // Formatting checks
  const hasFormatting = /\*|_|`|#|•|-/.test(cleaned);
  if (!hasFormatting) {
    warnings.push('Content does not include any bold, italic, or bullet formatting.');
  }

  return {
    isValid: errors.length === 0,
    cleanedContent: cleaned,
    errors,
    warnings,
    duplicateInfo: dupCheck
  };
}

module.exports = {
  cleanGeneratedText,
  calculateWordSimilarity,
  checkDuplicate,
  validateContent
};
