# Troubleshooting & FAQ Guide

This guide covers common issues, root causes, and verified fixes for the **AI WhatsApp Content Automation System**.

---

## 1. Ollama / AI Generation Issues

### Issue: "Ollama is not running / ECONNREFUSED"
- **Cause**: The local Ollama background service is stopped.
- **Fix**:
  1. Open a new terminal and run:
     ```bash
     ollama serve
     ```
  2. Test health: `curl http://localhost:11434/api/tags`
  3. Go to the dashboard and click the **Refresh** button on the top right.

### Issue: "Model not found: llama3:latest"
- **Cause**: The specified model has not been downloaded to Ollama yet.
- **Fix**:
  1. In terminal, run:
     ```bash
     ollama pull llama3
     ```
  2. Once complete, refresh the **AI Settings** page in the dashboard and select `llama3:latest`.

---

## 2. WhatsApp Web Automation Issues

### Issue: "QR Code does not appear / Timeout"
- **Cause**: Puppeteer Chromium was unable to launch or is blocked by antivirus/firewall.
- **Fix**:
  1. Ensure Google Chrome is installed on Windows.
  2. Click **Disconnect** in the WhatsApp tab, wait 5 seconds, and click **Connect WhatsApp** again.
  3. If running headless fails on your machine, you can change `WHATSAPP_HEADLESS=false` in `.env`.

### Issue: "Session expired or disconnected"
- **Cause**: Logged out from your phone's WhatsApp Linked Devices.
- **Fix**:
  1. Click **Disconnect** in the WhatsApp tab.
  2. Click **Connect WhatsApp** to generate a new QR code.
  3. Scan the new QR code with your phone.

### Issue: "Resetting corrupt session data"
- **Fix**:
  1. Stop the backend server.
  2. Delete the `.wwebjs_auth/` directory:
     ```bash
     # PowerShell
     Remove-Item -Recurse -Force .\.wwebjs_auth
     ```
  3. Restart the server and scan the QR code.

---

## 3. Cloudflare & Tunnel Issues

### Issue: "CORS error when accessing dashboard from Cloudflare Pages"
- **Cause**: The Cloudflare Pages origin domain is not in the backend's allowed origins list.
- **Fix**:
  1. In `.env`, add your Cloudflare domain to `CORS_ORIGIN`:
     ```env
     CORS_ORIGIN=http://localhost:5173,https://my-app.pages.dev
     ```
  2. Restart the backend server.

### Issue: "Cannot reach backend from remote Cloudflare Pages dashboard"
- **Fix**:
  1. Start Cloudflare Tunnel on your local machine:
     ```bash
     cloudflared tunnel --url http://localhost:5000
     ```
  2. Copy the tunnel URL (e.g. `https://random-words.trycloudflare.com`).
  3. In Cloudflare Pages Settings → Environment Variables, set:
     - `VITE_API_URL` = `https://random-words.trycloudflare.com/api`
  4. Redeploy frontend.

---

## 4. SQLite Database Issues

### Issue: "SQLITE_BUSY / Database locked"
- **Cause**: Multiple processes trying to write concurrently.
- **Fix**:
  The system uses SQLite Write-Ahead Logging (`WAL`) mode by default to prevent locking. If encountered, restart the Node.js server.

### Issue: "Forgotten Admin Password"
- **Fix**:
  Re-run the database seeder to restore default credentials (`admin@whatsappagent.local` / `adminpassword123`):
  ```bash
  npm run seed
  ```
