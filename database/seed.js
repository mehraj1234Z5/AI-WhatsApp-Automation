const bcrypt = require('bcryptjs');
const db = require('./db');
require('dotenv').config();

const DEFAULT_CATEGORIES = [
  {
    name: 'Data Analytics',
    description: 'Data analysis methodologies, metrics, business intelligence, and visualization techniques.',
    topics: [
      'KPI Frameworks & Business Metrics',
      'Data Cleaning Best Practices',
      'Exploratory Data Analysis (EDA) Steps',
      'Cohort Analysis & Customer Segmentation',
      'A/B Testing Fundamentals'
    ]
  },
  {
    name: 'SQL',
    description: 'Relational databases, queries, performance optimization, and schema design.',
    topics: [
      'SQL Window Functions (ROW_NUMBER, RANK, DENSE_RANK)',
      'Common Table Expressions (CTEs) & Subqueries',
      'Indexing Strategies for High Performance',
      'GROUP BY vs HAVING with Real Examples',
      'Self Joins and Cross Joins in Practice'
    ]
  },
  {
    name: 'Power BI',
    description: 'Dashboard design, DAX calculations, Power Query ETL, and data modeling.',
    topics: [
      'DAX CALCULATE & FILTER Mastery',
      'Star Schema vs Snowflake Schema Modeling',
      'Power Query M-Code Transformation Tricks',
      'Time Intelligence Functions in DAX',
      'Interactive Dashboard UX Best Practices'
    ]
  },
  {
    name: 'Python',
    description: 'Python programming, pandas, numpy, scripting, and automation.',
    topics: [
      'Pandas Vectorization vs Apply Performance',
      'List & Dictionary Comprehensions with Edge Cases',
      'Python Decorators & Generators Explained Simply',
      'Data Pipelines with Pandas & Polars',
      'Error Handling with Custom Exceptions'
    ]
  },
  {
    name: 'Data Science',
    description: 'Statistical modeling, feature engineering, hypothesis testing, and analytics.',
    topics: [
      'Feature Engineering for Tabular Data',
      'Handling Imbalanced Datasets (SMOTE vs Class Weights)',
      'Cross-Validation Strategies (Stratified, Time-Series)',
      'P-Values, Confidence Intervals & Statistical Tests',
      'Model Evaluation Metrics (ROC-AUC, PR-AUC, F1)'
    ]
  },
  {
    name: 'Artificial Intelligence',
    description: 'Core AI concepts, search algorithms, agents, and modern AI paradigms.',
    topics: [
      'AI Agent Architectures & Tool Calling',
      'Reasoning Models vs Standard LLMs',
      'Search & Optimization in Modern AI',
      'Knowledge Graphs & Semantic Search',
      'Ethics and Bias in AI Systems'
    ]
  },
  {
    name: 'Machine Learning',
    description: 'Supervised, unsupervised algorithms, ensemble models, and deployment.',
    topics: [
      'Gradient Boosting vs Random Forest Deep Dive',
      'Hyperparameter Tuning (Optuna vs Grid Search)',
      'Dimensionality Reduction (PCA vs t-SNE)',
      'Regularization (L1 Lasso vs L2 Ridge)',
      'ML Model Drift & Monitoring in Production'
    ]
  },
  {
    name: 'Generative AI',
    description: 'Large Language Models, RAG, Prompt Engineering, and fine-tuning.',
    topics: [
      'Retrieval-Augmented Generation (RAG) Architectures',
      'Prompt Engineering Frameworks (CoT, ReAct, Few-Shot)',
      'Vector Embeddings and Similarity Search',
      'Fine-tuning vs In-Context Learning (LoRA/QLoRA)',
      'Guardrails & Safety in LLM Applications'
    ]
  },
  {
    name: 'Digital Marketing',
    description: 'Growth marketing, conversion rate optimization, campaign strategies.',
    topics: [
      'High-Converting Landing Page Frameworks',
      'Customer Acquisition Cost (CAC) vs Lifetime Value (LTV)',
      'Email Marketing Automation & Drip Campaigns',
      'Attribution Modeling (First-Click vs Multi-Touch)',
      'Social Media Organic Growth Algorithms'
    ]
  },
  {
    name: 'SEO',
    description: 'Search Engine Optimization, technical SEO, keyword research, and on-page tactics.',
    topics: [
      'Technical SEO Audit Checklist',
      'Search Intent Optimization (Informational vs Transactional)',
      'Core Web Vitals & Page Experience',
      'Internal Linking Architecture for Authority',
      'AI Overviews & Search Generative Experience Optimization'
    ]
  },
  {
    name: 'Career',
    description: 'Career growth, portfolio building, networking, and soft skills.',
    topics: [
      'Building a Standout Data & Tech Portfolio',
      'LinkedIn Optimization for Tech Professionals',
      'Transitioning from Non-Tech to Tech Roles',
      'Effective Communication with Business Stakeholders',
      'Negotiating Tech Job Offers'
    ]
  },
  {
    name: 'Interview Preparation',
    description: 'Technical interview problems, behavioral questions, and live coding tips.',
    topics: [
      'Top 5 SQL Query Interview Questions Solved',
      'Behavioral Questions with STAR Method Examples',
      'System Design for Data Pipelines: Interview Walkthrough',
      'How to Explain Complex Tech Concepts in 60 Seconds',
      'Live Coding Test Mistakes to Avoid'
    ]
  },
  {
    name: 'Technology',
    description: 'Cloud computing, DevOps, APIs, and modern engineering practices.',
    topics: [
      'REST APIs vs GraphQL vs WebSockets',
      'Docker & Containerization Fundamentals',
      'Cloud Architecture Basics (AWS/GCP/Azure)',
      'Git Branching & Pull Request Workflows',
      'Serverless Functions & Microservices Overview'
    ]
  }
];

const DEFAULT_SETTINGS = [
  { key: 'emergency_stop', value: 'false', description: 'Global killswitch to immediately halt all automated messaging' },
  { key: 'auto_send_enabled', value: 'false', description: 'Enable full automatic generation & sending without manual review' },
  { key: 'ollama_url', value: process.env.OLLAMA_URL || 'http://127.0.0.1:11434', description: 'Ollama local server URL' },
  { key: 'ollama_model', value: process.env.OLLAMA_MODEL || 'llama3:latest', description: 'Default Ollama model' },
  { key: 'max_messages_per_hour', value: '30', description: 'Maximum messages sent across all groups per hour' },
  { key: 'min_delay_between_messages_sec', value: '15', description: 'Minimum delay between successive messages in seconds' },
  { key: 'max_retries', value: '3', description: 'Maximum retry attempts for temporary message failure' },
  { key: 'retry_delay_sec', value: '30', description: 'Delay between retry attempts in seconds' },
  { key: 'duplicate_threshold_days', value: '30', description: 'Lookback window to prevent duplicate topics' }
];

async function seed() {
  console.log('[Seed] Initializing database schema...');
  await db.initDatabase();

  // 1. Seed Admin User
  const adminEmail = process.env.DEFAULT_ADMIN_EMAIL || 'admin@whatsappagent.local';
  const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'adminpassword123';
  const existingUser = await db.get('SELECT id FROM users WHERE email = ?', [adminEmail]);

  if (!existingUser) {
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    await db.run(
      'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
      ['System Administrator', adminEmail, passwordHash, 'admin']
    );
    console.log(`[Seed] Created default admin user: ${adminEmail} (password: ${adminPassword})`);
  } else {
    console.log(`[Seed] Admin user already exists: ${adminEmail}`);
  }

  // 2. Seed Categories and Topics
  for (const cat of DEFAULT_CATEGORIES) {
    let catRow = await db.get('SELECT id FROM content_categories WHERE name = ?', [cat.name]);
    let catId;
    if (!catRow) {
      const res = await db.run(
        'INSERT INTO content_categories (name, description, is_default) VALUES (?, ?, 1)',
        [cat.name, cat.description]
      );
      catId = res.lastID;
      console.log(`[Seed] Added category: ${cat.name}`);
    } else {
      catId = catRow.id;
    }

    for (const topicName of cat.topics) {
      const existingTopic = await db.get(
        'SELECT id FROM content_topics WHERE category_id = ? AND name = ?',
        [catId, topicName]
      );
      if (!existingTopic) {
        await db.run(
          'INSERT INTO content_topics (category_id, name, description) VALUES (?, ?, ?)',
          [catId, topicName, `Comprehensive guide and insights for ${topicName}`]
        );
      }
    }
  }

  // 3. Seed Default Settings
  for (const setting of DEFAULT_SETTINGS) {
    const existing = await db.get('SELECT key FROM settings WHERE key = ?', [setting.key]);
    if (!existing) {
      await db.run(
        'INSERT INTO settings (key, value, description) VALUES (?, ?, ?)',
        [setting.key, setting.value, setting.description]
      );
    }
  }
  console.log('[Seed] Settings verified/initialized.');

  console.log('[Seed] Database initialization and seeding complete.');
}

if (require.main === module) {
  seed()
    .then(() => {
      console.log('[Seed] Script finished successfully.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('[Seed Error]:', err);
      process.exit(1);
    });
}

module.exports = { seed, DEFAULT_CATEGORIES, DEFAULT_SETTINGS };
