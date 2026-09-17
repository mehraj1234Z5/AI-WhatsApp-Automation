# Cloudflare Pages Deployment & Tunnel Guide
**AI WhatsApp Content Automation System**

This guide outlines how to deploy the React Admin Dashboard frontend to **Cloudflare Pages** and connect it securely to your local Node.js backend and Ollama instance via **Cloudflare Tunnel (`cloudflared`)**.

---

## Architecture Overview

```
[ Admin / User ]
       │
       ▼ (HTTPS)
[ Cloudflare Pages ] ─── (VITE_API_URL / CORS) ───► [ Cloudflare Tunnel (cloudflared) ]
(React SPA Dashboard)                                          │ (Encrypted Tunnel)
                                                               ▼
                                                  [ Local Node.js Backend (:5000) ]
                                                               │
                                             ┌─────────────────┴─────────────────┐
                                             ▼                                   ▼
                                     [ Local Ollama ]               [ WhatsApp Multi-Device ]
                                     (llama3 / deepseek)              (Baileys Native Socket)
```

---

## 1. Cloudflare Pages SPA Configuration (Prepared)

The frontend has been configured with:
1. **`frontend/public/_redirects`**:
   ```
   /*    /index.html   200
   ```
   Ensures client-side routing (`/whatsapp`, `/content`, `/groups`, `/schedules`) resolves correctly on page refresh without 404s.

2. **`frontend/public/_headers`**:
   Security headers (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`) and immutable asset caching.

3. **`frontend/src/services/api.js`**:
   Auto-normalizes `VITE_API_URL` to route requests to your Cloudflare Tunnel endpoint.

---

## 2. Deploying Frontend to Cloudflare Pages

### Method A: Direct Upload (Fastest — 2 Minutes)
1. Build the production bundle:
   ```bash
   npm run build:frontend
   ```
2. Log in to the [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Workers & Pages** → **Create application** → **Pages** → **Upload assets**.
3. Set your project name (e.g. `ai-whatsapp-automation`).
4. Drag and drop the `frontend/dist` directory.
5. Click **Deploy site**.

### Method B: Git Integration (Continuous Deployment)
1. Push your project to GitHub / GitLab.
2. In Cloudflare Dashboard → **Workers & Pages** → **Create application** → **Pages** → **Connect to Git**.
3. Select your repository and configure the build settings:
   - **Framework preset**: `Vite`
   - **Root directory**: `frontend`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
4. Under **Environment variables (production)**, add:
   - `VITE_API_URL`: Your Cloudflare Tunnel URL (e.g. `https://wa-api.yourdomain.com` or `https://your-tunnel.trycloudflare.com`)
5. Click **Save and Deploy**.

---

## 3. Exposing Local Backend via Cloudflare Tunnel

To allow your Cloudflare Pages frontend to communicate with your local backend and Ollama:

### Quick Ad-Hoc Tunnel (No Domain Required)
1. Download `cloudflared` from Cloudflare if not installed:
   ```powershell
   winget install Cloudflare.cloudflared
   ```
2. Start the tunnel forwarding to your local Node.js backend (port 5000):
   ```powershell
   cloudflared tunnel --url http://localhost:5000
   ```
3. Copy the generated `https://xxxx.trycloudflare.com` URL.
4. Set that URL as `VITE_API_URL` in Cloudflare Pages settings (or in `frontend/.env.production` before building).

### Named Permanent Tunnel (With Custom Domain)
1. Authenticate `cloudflared`:
   ```powershell
   cloudflared tunnel login
   ```
2. Create your tunnel:
   ```powershell
   cloudflared tunnel create wa-backend
   ```
3. Route DNS to your tunnel:
   ```powershell
   cloudflared tunnel route dns wa-backend api.yourdomain.com
   ```
4. Run the tunnel:
   ```powershell
   cloudflared tunnel run --url http://localhost:5000 wa-backend
   ```
5. Set `VITE_API_URL=https://api.yourdomain.com` on Cloudflare Pages.

---

## 4. Verification Checklist

- [x] `npm run build:frontend` builds without errors into `frontend/dist/`.
- [x] `_redirects` file is in `frontend/dist/` for SPA routing.
- [x] `_headers` file is in `frontend/dist/` with security headers.
- [x] `backend/server.js` CORS permits `*.pages.dev` and `*.trycloudflare.com`.
- [x] `api.js` automatically normalizes Tunnel URL to `/api` endpoints.
