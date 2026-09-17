# Installation & Setup Guide

This guide provides step-by-step instructions for installing, configuring, and running the **AI WhatsApp Content Automation System** on Windows (or Linux/macOS).

---

## 1. Prerequisites

Before starting, ensure you have the following installed on your machine:

1. **Node.js (v18+ recommended, v20 or v24 supported)**:
   - Download from: [https://nodejs.org/](https://nodejs.org/)
   - Verify in terminal:
     ```bash
     node -v
     npm -v
     ```

2. **Ollama (Local AI Model Engine)**:
   - Download from: [https://ollama.com/download](https://ollama.com/download)
   - Install and launch Ollama.
   - Verify in terminal:
     ```bash
     ollama -v
     ```

3. **Google Chrome / Chromium**:
   - Required by Puppeteer for WhatsApp Web automation. (Standard Google Chrome on Windows is automatically detected).

4. **Git**:
   - Download from: [https://git-scm.com/](https://git-scm.com/)

---

## 2. Download and Set Up Local AI Models

Pull the recommended model using Ollama:

```bash
# Recommended default model (Fast and high quality)
ollama pull llama3

# Optional lightweight model (Low RAM / CPU only)
ollama pull tinyllama

# Optional deep reasoning model
ollama pull deepseek-r1:14b
```

Verify your models are available:
```bash
ollama list
```

Ensure the Ollama local service is running (default port is `11434`):
```bash
# Test endpoint
curl http://localhost:11434/api/tags
```

---

## 3. Project Setup & Dependencies

1. Open a terminal in the project directory:
   ```bash
   cd c:\AI_WhatsApp_Automation
   ```

2. Install all backend and frontend dependencies:
   ```bash
   npm run install:all
   ```
   *(Or individually: `npm install` in root, then `npm install` inside `frontend/`)*

---

## 4. Environment Configuration

1. Copy the example configuration file:
   ```bash
   copy .env.example .env
   ```

2. Open `.env` and verify key settings:
   ```env
   PORT=5000
   NODE_ENV=development
   JWT_SECRET=your_secure_custom_jwt_secret_here
   DEFAULT_ADMIN_EMAIL=admin@whatsappagent.local
   DEFAULT_ADMIN_PASSWORD=adminpassword123
   OLLAMA_URL=http://127.0.0.1:11434
   OLLAMA_MODEL=llama3:latest
   DATABASE_PATH=./database/whatsapp_automation.sqlite
   WHATSAPP_SESSION_PATH=./.wwebjs_auth
   MAX_RETRIES=3
   MAX_MESSAGES_PER_HOUR=30
   MIN_DELAY_BETWEEN_MESSAGES_SEC=15
   ```

---

## 5. Database Initialization & Seeding

Initialize the SQLite database with tables, default categories, topics, and initial admin account:

```bash
npm run seed
```

Output:
```
[Seed] Initializing database schema...
[Seed] Created default admin user: admin@whatsappagent.local
[Seed] Added 13 content categories and curated topics
[Seed] Database initialization and seeding complete.
```

---

## 6. Running the Application

### Option A: Concurrent Development Mode (Recommended)
Starts both the Backend API server (`http://localhost:5000`) and Vite Frontend (`http://localhost:5173`) simultaneously:
```bash
npm run dev
```

### Option B: Running Services Individually
- **Backend**:
  ```bash
  npm start
  ```
- **Frontend**:
  ```bash
  npm run dev:frontend
  ```

---

## 7. First-Time Walkthrough

1. Open your browser to `http://localhost:5173`.
2. Log in with:
   - **Email**: `admin@whatsappagent.local`
   - **Password**: `adminpassword123`
3. Navigate to **WhatsApp**:
   - Click **Connect WhatsApp**.
   - Scan the rendered QR code with WhatsApp on your phone (*Linked Devices → Link a Device*).
4. Navigate to **Groups**:
   - Click **Sync Groups from WhatsApp** to detect your groups.
   - Configure topics, audience, and frequency for your target groups.
5. Navigate to **Content Studio**:
   - Select a topic and click **Generate AI WhatsApp Post**.
   - Review and test send!
