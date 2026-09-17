# System Architecture Documentation

This document explains the technical architecture, component relationships, data flow, and Cloudflare integration of the **AI WhatsApp Content Automation System**.

---

## 1. High-Level Architecture Diagram

```mermaid
flowchart TB
    subgraph CloudLayer ["Cloud Layer (Cloudflare)"]
        CF_Pages["Cloudflare Pages (React + Vite SPA)"]
        CF_Tunnel["Cloudflare Tunnel (cloudflared)"]
        AdminUser["Admin User Browser"]
    end

    subgraph LocalMachine ["Local Secure Host (Windows / Linux)"]
        subgraph BackendNode ["Local Node.js Server (Port 5000)"]
            Express["Express.js REST API & JWT Auth"]
            Scheduler["Persistent Scheduler (node-cron)"]
            Safety["Rate Limiter & Emergency Stop"]
        end

        subgraph AIAgentLayer ["AI Content Engine"]
            Agent["AI Agent Coordinator"]
            Prompts["Prompt Templates & Context"]
            Validator["Content & Duplicate Validator"]
        end

        subgraph LocalAI ["Local AI Provider"]
            Ollama["Ollama Local Server (127.0.0.1:11434)"]
            LLM["Local LLM (llama3 / deepseek-r1 / tinyllama)"]
        end

        subgraph WALayer ["WhatsApp Automation Engine"]
            WAClient["WhatsApp Client (whatsapp-web.js)"]
            Puppeteer["Headless Chromium Browser"]
            LocalAuth["Local Persistent Session (.wwebjs_auth)"]
        end

        subgraph StorageLayer ["Local Persistence Layer"]
            SQLite[("SQLite Database (whatsapp_automation.sqlite)")]
        end
    end

    subgraph ExternalServices ["WhatsApp Network"]
        WAGroups["WhatsApp Groups & Community Members"]
    end

    AdminUser -->|HTTPS| CF_Pages
    CF_Pages -->|Secure API Requests| CF_Tunnel
    CF_Tunnel -->|Encrypted Outbound Tunnel| Express

    Express --> SQLite
    Express --> Agent
    Express --> WAClient
    Scheduler --> Safety
    Safety --> Agent
    Safety --> WAClient

    Agent --> Prompts
    Agent --> Ollama
    Ollama --> LLM
    Agent --> Validator
    Validator --> SQLite

    WAClient --> Puppeteer
    WAClient --> LocalAuth
    Puppeteer -->|Encrypted WebSocket / Web Session| WAGroups
```

---

## 2. Component Breakdown

### A. Frontend Layer (Cloudflare Pages)
- **Technology**: React 18, Vite, React Router 6, Vanilla CSS design system, Lucide icons.
- **Hosting**: Build artifacts (`frontend/dist`) are deployed to **Cloudflare Pages**.
- **Security**: Zero backend secrets are embedded in the frontend bundle. All communication is routed through the API client using JWT Bearer tokens.

### B. Secure Remote Access (Cloudflare Tunnel)
- **Concept**: Cloudflare Tunnel (`cloudflared`) establishes a lightweight outbound-only encrypted tunnel from the local Node.js server to Cloudflare edge servers.
- **Advantage**: No public IP exposure, no router port forwarding (no opening port 5000 to the open web), and DDoS protection.
- **Workflow**:
  ```bash
  # Local host initiates outbound tunnel to Cloudflare
  cloudflared tunnel --url http://localhost:5000
  ```
  The generated URL (e.g. `https://my-app-tunnel.trycloudflare.com`) is configured as `VITE_API_URL` in Cloudflare Pages.

### C. Local Backend Server & API
- **Technology**: Node.js, Express.js.
- **Responsibilities**:
  1. REST API endpoint handler.
  2. JWT Authentication & Password verification.
  3. Safety checks (Emergency Stop, max messages/hour, min delay).
  4. Local SQLite database operations.

### D. AI Agent & Ollama Integration
- **Technology**: Local Ollama instance (`http://127.0.0.1:11434`).
- **Prompt Engineering**: Dynamic prompt synthesis based on Category, Topic, Audience persona, Content type, Tone, and Past post history.
- **Quality & Safety Validation**:
  - DeepSeek `<think>` and reasoning tag stripper.
  - Conversational AI boilerplate remover.
  - Jaccard n-gram duplicate detection against past posts stored in SQLite.
  - WhatsApp markdown normalization.

### E. WhatsApp Automation Engine
- **Technology**: `whatsapp-web.js` + Puppeteer.
- **Session Persistence**: Multi-device persistent authentication stored in `.wwebjs_auth/`.
- **Group Synchronization**: Auto-detects all groups from active session without hardcoding.
- **Rate-Limiting & Queue**: Guaranteed interval pauses between messages to prevent spam or flagging.

### F. Persistent Scheduler
- **Technology**: `node-cron`.
- **Background Execution**: Runs directly inside the local Node.js process. Automation tasks continue firing at their scheduled times regardless of whether the browser or dashboard is open.

---

## 3. Automated Daily Flow Diagram

```mermaid
sequenceDiagram
    autonumber
    participant Sched as Node-Cron Scheduler
    participant Safe as Safety & Emergency Stop
    participant DB as SQLite DB
    participant Agent as AI Agent Coordinator
    participant Ollama as Local Ollama LLM
    participant WA as WhatsApp Web Client
    participant Group as WhatsApp Group

    Sched->>Safe: Check Emergency Stop & Rate Limits
    Safe-->>Sched: Status: ACTIVE & Permitted
    Sched->>DB: Query enabled schedule & group settings
    DB-->>Sched: Group ID, Category, Audience, Topic
    Sched->>Agent: Request Content Generation
    Agent->>DB: Fetch recent 3 posts for duplicate avoidance
    DB-->>Agent: Past post snippets
    Agent->>Ollama: POST /api/generate (System + User Prompt)
    Ollama-->>Agent: Raw AI Response
    Agent->>Agent: Clean boilerplate & validate formatting
    Agent->>DB: Store in generated_content table (status: draft / approved)
    
    alt Auto-Send Mode Enabled
        Sched->>WA: Send formatted message to Group JID
        WA->>Group: Deliver message
        WA-->>Sched: Message Ack (Timestamp & ID)
        Sched->>DB: Insert message_logs (status: success)
    else Manual Approval Mode Enabled
        Sched->>DB: Insert message_logs (status: skipped, draft pending)
    end
```
