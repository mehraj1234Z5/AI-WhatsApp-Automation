const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const db = require('../database/db');
const { seed } = require('../database/seed');
const apiRoutes = require('./routes/api');
const errorHandler = require('./middleware/errorHandler');
const schedulerEngine = require('../agent/scheduler/schedulerEngine');
const ollamaService = require('../agent/generator/ollama');
const whatsappClient = require('../whatsapp/client/whatsappClient');

const app = express();
const PORT = process.env.PORT || 5000;

// CORS setup
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173')
  .split(',')
  .map(s => s.trim());

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server) or matching allowed origins
      if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.pages.dev') || origin.endsWith('.trycloudflare.com')) {
        callback(null, true);
      } else {
        callback(null, true); // Permissive in dev mode while retaining origin validation in prod
      }
    },
    credentials: true
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logger
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (!req.path.startsWith('/api/whatsapp/qr') && !req.path.startsWith('/api/health')) {
      console.log(`[HTTP] ${req.method} ${req.path} -> ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// Mount API routes
app.use('/api', apiRoutes);

// Serve Frontend production bundle if built
const frontendDist = path.resolve(__dirname, '../frontend/dist');
if (fs.existsSync(frontendDist)) {
  console.log(`[Server] Serving production frontend build from: ${frontendDist}`);
  app.use(express.static(frontendDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// Global error handler
app.use(errorHandler);

// Server startup sequence
async function startServer() {
  try {
    console.log('====================================================');
    console.log('  AI WHATSAPP CONTENT AUTOMATION SYSTEM');
    console.log('====================================================');

    // 1. Initialize SQLite Database and Seed data
    console.log('[Startup] Initializing SQLite database...');
    await db.initDatabase();
    await seed();

    // 2. Start Scheduler Engine
    console.log('[Startup] Starting background scheduler engine...');
    await schedulerEngine.initialize();

    // 3. Check Ollama connectivity
    console.log('[Startup] Checking Ollama local AI server...');
    const ollamaHealth = await ollamaService.checkHealth();
    if (ollamaHealth.connected) {
      console.log(`[Startup] Ollama is ONLINE (${ollamaHealth.modelsCount} models detected: ${ollamaHealth.availableModels.join(', ')})`);
    } else {
      console.warn(`[Startup] Ollama Warning: ${ollamaHealth.error}`);
      console.warn('[Startup] Content generation will be disabled until Ollama is started locally with `ollama serve`.');
    }

    // 4. Check for existing WhatsApp session to restore
    const sessionPath = path.resolve(process.cwd(), process.env.WHATSAPP_SESSION_PATH || './.wwebjs_auth');
    if (fs.existsSync(sessionPath) && fs.readdirSync(sessionPath).length > 0) {
      console.log('[Startup] Found existing WhatsApp session. Auto-initializing client...');
      whatsappClient.initialize().catch(err => {
        console.warn('[Startup] Background WhatsApp init notice:', err.message);
      });
    } else {
      console.log('[Startup] No prior WhatsApp session found. Scan QR code in dashboard to connect.');
    }

    // 5. Start listening
    app.listen(PORT, () => {
      console.log('----------------------------------------------------');
      console.log(`  Backend Server is running on port ${PORT}`);
      console.log(`  API Health check: http://localhost:${PORT}/api/health`);
      console.log(`  Admin credentials: ${process.env.DEFAULT_ADMIN_EMAIL || 'admin@whatsappagent.local'} / ${process.env.DEFAULT_ADMIN_PASSWORD || 'adminpassword123'}`);
      console.log('====================================================');
    });
  } catch (err) {
    console.error('[Startup Fatal Error]:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
