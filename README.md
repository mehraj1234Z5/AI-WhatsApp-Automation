# AI WhatsApp Content Automation System

A production-grade, local **AI WhatsApp Content Agent & Automation System** built for internship and enterprise operations. It connects a local Node.js backend with local Ollama LLMs (`llama3`, `deepseek-r1`, `tinyllama`), automated content quality & duplicate validation, WhatsApp Web group automation (`whatsapp-web.js`), persistent `node-cron` scheduling, and a modern React admin dashboard deployable to **Cloudflare Pages** connected securely via **Cloudflare Tunnel**.

---

## 🌟 Key Features

- 🤖 **100% Local AI (Zero Paid API Bills)**: Native integration with local Ollama (`llama3:latest`, `deepseek-r1:14b`, `tinyllama:latest`).
- 📱 **WhatsApp Web Automation**: Automatic group detection, persistent session caching (`.wwebjs_auth`), and safe single-group test sends.
- 🛡️ **Safety & Anti-Spam Controls**: Rate limiter (max messages/hour, min delay between sends), exponential retry backoff, and a global **Emergency Stop** killswitch.
- ⏰ **Independent Background Scheduler**: Runs persistently via `node-cron` in the Node.js service — continues automating and sending even when the browser is closed.
- 🎨 **Modern React Dashboard**: 9 complete pages (Login, Dashboard, WhatsApp Hub, Groups, Content Studio, Schedules, AI Settings, Audit Logs, System Settings).
- ☁️ **Cloudflare Integration**: Built for deployment on Cloudflare Pages and secure remote access via Cloudflare Tunnel (`cloudflared`).
- 🗄️ **Local SQLite Storage**: Complete schema for groups, topics, categories, content history, schedules, and message logs.

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js**: v18+ (tested on v24)
- **Ollama**: Running locally (`ollama serve`) with `llama3` pulled (`ollama pull llama3`)
- **Google Chrome**: Installed on your machine

### 2. Installation
```bash
# Clone or navigate to the repository
cd c:\AI_WhatsApp_Automation

# Install root & frontend dependencies
npm run install:all

# Initialize and seed SQLite database
npm run seed
```

### 3. Run Application
```bash
# Start both Backend (Port 5000) and Frontend (Port 5173) concurrently
npm run dev
```

### 4. Access Admin Console
- **URL**: `http://localhost:5173`
- **Default Email**: `admin@whatsappagent.local`
- **Default Password**: `adminpassword123`

---

## 📁 Project Structure

```
ai-whatsapp-automation/
├── frontend/                     # React + Vite Admin Dashboard (Cloudflare Pages ready)
│   ├── src/
│   │   ├── components/          # Navbar, Sidebar, StatusBadge, Cards, Modal, WhatsAppPreview
│   │   ├── pages/               # 9 Full Dashboard Pages
│   │   ├── services/            # Axios API client with JWT interceptor
│   │   ├── context/             # AuthContext, SystemStatusContext
│   │   ├── App.jsx
│   │   └── index.css            # Modern design system
│   ├── package.json
│   └── vite.config.js
│
├── backend/                      # Node.js + Express REST API Server
│   ├── controllers/             # Auth, WhatsApp, Ollama, Content, Schedules, Logs, Settings
│   ├── routes/                  # API router with JWT middleware
│   ├── middleware/              # Auth, RateLimiter, ErrorHandler
│   └── server.js                # Express app entry point & background worker
│
├── agent/                        # AI Content Engine
│   ├── prompts/                 # Templates for 10+ content types and audience personas
│   ├── generator/               # Local Ollama client & model switch
│   ├── validator/               # Content quality, reasoning tag stripper, duplicate detector
│   └── scheduler/               # Persistent node-cron scheduler engine
│
├── whatsapp/                     # WhatsApp Automation Engine
│   ├── client/                  # whatsapp-web.js + LocalAuth session manager
│   ├── groups/                  # Automatic group detection & synchronization
│   └── messaging/               # Message queue, safety delay, retry backoff
│
├── database/                     # SQLite Database Layer
│   ├── schema/                  # SQLite DDL schema
│   ├── seed.js                  # Database seeder (13 categories, 60+ topics, default settings)
│   └── db.js                    # Promised SQLite wrapper
│
├── tests/                        # Comprehensive Test Suite
│   ├── backend.test.js          # SQLite & JWT security tests
│   ├── ai-agent.test.js         # Ollama prompt generation & duplicate check tests
│   ├── scheduler.test.js        # Cron scheduling & Emergency Stop tests
│   ├── whatsapp.test.js         # WhatsApp client & rate limiter tests
│   └── run-tests.js             # Master test runner
│
├── docs/                         # Detailed Documentation
│   ├── INSTALLATION.md          # Step-by-step setup guide
│   ├── ARCHITECTURE.md          # System architecture & Cloudflare Tunnel guide
│   ├── API.md                   # Complete REST API reference
│   ├── DATABASE.md              # SQLite Schema & ERD
│   ├── USER_MANUAL.md           # Operator walkthrough
│   └── TROUBLESHOOTING.md       # Problem resolution & FAQ
│
├── .env.example
├── package.json
└── README.md
```

---

## 🧪 Running Automated Tests

Run the full end-to-end test suite:

```bash
npm test
```

---

## ☁️ Cloudflare Deployment

1. **Deploy Frontend to Cloudflare Pages**:
   - Connect your GitHub repo to Cloudflare Pages.
   - Set Build Command: `npm run build`
   - Set Output Directory: `dist`
   - Set Root Directory: `frontend`
   - Set Environment Variable: `VITE_API_URL` = `https://<YOUR_TUNNEL_DOMAIN>/api`

2. **Run Cloudflare Tunnel on Local Server**:
   ```bash
   cloudflared tunnel --url http://localhost:5000
   ```

---

## 📄 License & Safety Notice
This project is built for authorized, educational WhatsApp community automation. It implements strict anti-spam limits, minimum delay controls, and an emergency stop killswitch.
