# REST API Documentation

Base URL: `http://localhost:5000/api` (or through Cloudflare Tunnel).

All protected endpoints require the following header:
```http
Authorization: Bearer <JWT_TOKEN>
```

---

## 1. System Health

### `GET /api/health`
Public endpoint for health monitoring, Cloudflare liveness checks, and dashboard metrics.

**Response (200 OK):**
```json
{
  "success": true,
  "status": "healthy",
  "data": {
    "timestamp": "2026-09-17T10:30:00.000Z",
    "backend": "OK",
    "database": "OK",
    "ollama": "OK",
    "aiModel": "OK (llama3:latest)",
    "whatsapp": "READY",
    "whatsappConnected": true,
    "scheduler": "RUNNING",
    "activeJobs": 3,
    "emergencyStop": false
  }
}
```

---

## 2. Authentication

### `POST /api/auth/login`
Authenticates admin user and issues a JWT token.

**Request Body:**
```json
{
  "email": "admin@whatsappagent.local",
  "password": "adminpassword123"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6...",
  "user": {
    "id": 1,
    "name": "System Administrator",
    "email": "admin@whatsappagent.local",
    "role": "admin"
  }
}
```

### `GET /api/auth/me` *(Protected)*
Returns current authenticated user details.

### `PUT /api/auth/password` *(Protected)*
Updates the admin password.

**Request Body:**
```json
{
  "currentPassword": "adminpassword123",
  "newPassword": "newSecurePassword2026"
}
```

---

## 3. WhatsApp Client & Groups

### `GET /api/whatsapp/status` *(Protected)*
Returns current connection status and session information.

### `POST /api/whatsapp/connect` *(Protected)*
Initializes the WhatsApp client and Chromium engine.

### `POST /api/whatsapp/disconnect` *(Protected)*
Gracefully destroys the active WhatsApp session.

### `GET /api/whatsapp/qr` *(Protected)*
Returns the raw string QR and Base64 Data URL for display.

### `GET /api/whatsapp/groups` *(Protected)*
Retrieves all synchronized WhatsApp groups.
- **Query Params**: `enabled` (boolean), `category` (string), `search` (string).

### `POST /api/whatsapp/sync-groups` *(Protected)*
Fetches live groups from the connected WhatsApp session and stores them in SQLite.

### `PUT /api/whatsapp/groups/:id` *(Protected)*
Updates group settings (category, audience, topic, tone, content_type, posting_time, frequency, enabled).

---

## 4. Ollama & AI Models

### `GET /api/ollama/status` *(Protected)*
Checks Ollama server connectivity and model tags.

### `GET /api/ollama/models` *(Protected)*
Lists all models currently installed locally in Ollama.

### `POST /api/ollama/test` *(Protected)*
Live test generation playground.

**Request Body:**
```json
{
  "prompt": "Explain SQL CTEs in 3 bullet points.",
  "model": "llama3:latest",
  "system": "You are a tech mentor."
}
```

---

## 5. Content Management

### `POST /api/content/generate` *(Protected)*
Generates tailored educational post via Ollama, validates formatting, checks duplicates, and saves to SQLite.

**Request Body:**
```json
{
  "groupId": 1,
  "category": "SQL",
  "topic": "Window Functions (ROW_NUMBER vs RANK)",
  "contentType": "Daily Tip",
  "audience": "Data Analytics Students",
  "language": "English",
  "tone": "Professional & Engaging",
  "customInstructions": "Include code example",
  "autoApprove": false
}
```

### `GET /api/content` *(Protected)*
Retrieves content history with pagination and filters.
- **Query Params**: `category`, `status` (`draft`, `approved`, `rejected`, `sent`, `failed`), `topic`, `page`, `limit`.

### `PUT /api/content/:id` *(Protected)*
Updates draft content text or status.

### `POST /api/content/:id/approve` *(Protected)*
Marks content item as approved.

### `POST /api/content/:id/reject` *(Protected)*
Marks content item as rejected.

### `POST /api/content/:id/send` *(Protected)*
Dispatches content item directly to the target WhatsApp group.

---

## 6. Schedules

### `GET /api/schedules` *(Protected)*
Returns all active and paused automation schedules.

### `POST /api/schedules` *(Protected)*
Creates a new automated schedule.

**Request Body:**
```json
{
  "groupId": 1,
  "topic": "Power BI DAX Measures",
  "contentType": "Daily Tip",
  "postingTime": "09:00",
  "frequency": "Daily",
  "cronExpression": "0 9 * * *"
}
```

### `PUT /api/schedules/:id` *(Protected)*
Updates schedule configuration.

### `DELETE /api/schedules/:id` *(Protected)*
Deletes an automated schedule.

### `POST /api/schedules/:id/toggle` *(Protected)*
Enables or pauses a schedule.

### `POST /api/schedules/:id/run-now` *(Protected)*
Triggers immediate execution of a scheduled job in the background.

---

## 7. Messages & Safety

### `POST /api/messages/test` *(Protected)*
Safely dispatches a test message to ONE target group.

**Request Body:**
```json
{
  "groupId": 1,
  "messageText": "🎓 *Test Verification Message*"
}
```

### `POST /api/messages/send` *(Protected)*
Sends an immediate message through the rate-limited queue.

---

## 8. Logs & System Settings

### `GET /api/logs` *(Protected)*
Returns delivery logs with search, status, and pagination.

### `GET /api/logs/stats` *(Protected)*
Returns metric totals for today's messages, success count, failure count, active schedules.

### `POST /api/logs/clear` *(Protected)*
Clears logs older than specified days (default: 30).

### `GET /api/settings` *(Protected)*
Retrieves all system configuration parameters.

### `PUT /api/settings` *(Protected)*
Updates safety settings (rate limits, delays, retries).

### `POST /api/settings/emergency-stop` *(Protected)*
Toggles the global Emergency Stop killswitch.
