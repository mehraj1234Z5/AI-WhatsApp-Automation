/**
 * AI Prompt Templates and Content Guidelines for WhatsApp
 */

const CONTENT_TYPES = {
  'Daily Tip': {
    name: 'Daily Tip',
    description: 'A crisp, actionable, high-impact tip that can be immediately applied.',
    structure: '1-2 sentence hook + Actionable tip with code/example + Key takeaway + Call-to-action/question.'
  },
  'Educational Post': {
    name: 'Educational Post',
    description: 'In-depth explanation of a core concept broken down into simple points.',
    structure: 'Concept Introduction + Why it matters + Breakdown (3-4 bullet points) + Real-world use case + Summary.'
  },
  'Quiz': {
    name: 'Quiz',
    description: 'An interactive multiple-choice question with options and a hidden or follow-up explanation.',
    structure: 'Question context + Multiple Choice (A, B, C, D) + Hint + "Reply with your answer below!"'
  },
  'Interview Question': {
    name: 'Interview Question',
    description: 'A real-world interview question asked at top companies with optimal approach.',
    structure: 'Question + Company Context + Ideal Approach/Framework + Sample Solution/Code + Pro-Tip for Interviews.'
  },
  'Daily Challenge': {
    name: 'Daily Challenge',
    description: 'A mini coding or analytical challenge for community members to solve today.',
    structure: 'Challenge Objective + Sample Input/Problem + Constraints + "Share your solution in the group!"'
  },
  'Career Tip': {
    name: 'Career Tip',
    description: 'Actionable guidance on resume, portfolio, networking, or career progression.',
    structure: 'Career Myth/Problem + The Smart Solution + 3 Action Steps + Encouraging closing.'
  },
  'Industry Update': {
    name: 'Industry Update',
    description: 'Current trends, tools, or best practices emerging in the tech landscape.',
    structure: 'Trend Headline + What Changed + Impact on Tech Professionals + What you should learn.'
  },
  'Question of the Day': {
    name: 'Question of the Day',
    description: 'A thought-provoking discussion starter to trigger group engagement.',
    structure: 'Engaging Dilemma/Scenario + Two/Three Perspectives + "What is your take? Let us discuss!"'
  },
  'Course Promotion': {
    name: 'Course Promotion',
    description: 'Value-first post introducing upcoming learning cohorts or specialized workshops.',
    structure: 'Skills Gap/Need + What you will master + Key highlights + How to enroll/register.'
  },
  'Announcement': {
    name: 'Announcement',
    description: 'Official group announcement or event notification.',
    structure: 'Important Header + Key Details (Date, Topic, Speaker/Agenda) + Call-to-action.'
  }
};

const AUDIENCE_PERSONAS = {
  'Data Analytics Students': 'Aspiring data analysts learning SQL, Excel, Power BI, Python, and business metrics. Keep explanations intuitive with business examples.',
  'Fresh Graduates': 'Recent college graduates preparing for their first tech jobs. Focus on entry-level concepts, portfolio development, and interview fundamentals.',
  'Digital Marketing Students': 'Marketers learning SEO, analytics, Google Ads, content strategy, and conversion optimization.',
  'Working Professionals': 'Mid-level engineers and analysts looking to upskill, optimize existing systems, and prepare for senior roles.',
  'Trainers': 'Educators and mentors who need teaching analogies, curriculum topics, and student exercise ideas.',
  'General Technology Audience': 'Curious tech enthusiasts interested in AI, software engineering, and industry advancements.'
};

const TONE_GUIDES = {
  'Professional & Engaging': 'Professional, encouraging, authoritative yet approachable.',
  'Casual & Friendly': 'Warm, conversational, enthusiastic, relatable community-style.',
  'Technical & In-Depth': 'Precise, technical, syntactically accurate, syntax-focused.',
  'Inspirational & Motivating': 'Uplifting, empowering, focused on continuous growth and mastery.'
};

/**
 * Builds the complete system and user prompt for Ollama
 */
function buildPrompt({ category, topic, contentType, audience, language, tone, customInstructions, pastPosts = [] }) {
  const cType = CONTENT_TYPES[contentType] || CONTENT_TYPES['Daily Tip'];
  const audienceInfo = AUDIENCE_PERSONAS[audience] || `Target Audience: ${audience}`;
  const toneInfo = TONE_GUIDES[tone] || `Tone: ${tone}`;
  const lang = language || 'English';

  const systemPrompt = `You are an expert AI Educator and Community Lead creating high-value WhatsApp educational posts.
Your goal is to produce engaging, accurate, perfectly-formatted WhatsApp messages for community groups.

STRICT WHATSAPP FORMATTING RULES:
1. Use WhatsApp styling: *bold* for key terms and headlines, _italics_ for emphasis, \`monospace\` for keywords/commands, and triple backticks \`\`\`code\`\`\` for code snippets.
2. Include relevant emojis naturally to enhance readability and visual appeal.
3. Keep the total length between 150 and 350 words (concise, scannable, mobile-friendly).
4. Do NOT output conversational filler like "Here is your post:", "Sure, I can help", or thinking tags.
5. Do NOT hallucinate made-up syntax or outdated methods.
6. The entire output must be the ready-to-send WhatsApp message text only.`;

  let userPrompt = `Generate a high-quality WhatsApp post with the following specifications:

- Category: ${category}
- Topic: ${topic}
- Content Type: ${cType.name} (${cType.description})
- Recommended Structure: ${cType.structure}
- Target Audience: ${audienceInfo}
- Tone: ${toneInfo}
- Language: ${lang}
${customInstructions ? `- Custom Instructions: ${customInstructions}` : ''}
`;

  if (pastPosts && pastPosts.length > 0) {
    const recentSnippets = pastPosts.slice(0, 3).map((p, i) => `[Post ${i + 1}]: "${p.substring(0, 100)}..."`).join('\n');
    userPrompt += `\nAvoid repeating the exact angle or phrasing from these recent posts on similar topics:\n${recentSnippets}\n`;
  }

  userPrompt += `\nOutput ONLY the final formatted WhatsApp message now:`;

  return {
    systemPrompt,
    userPrompt
  };
}

module.exports = {
  CONTENT_TYPES,
  AUDIENCE_PERSONAS,
  TONE_GUIDES,
  buildPrompt
};
