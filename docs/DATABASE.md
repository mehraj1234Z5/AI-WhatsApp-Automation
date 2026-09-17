# SQLite Database Documentation

The AI WhatsApp Content Automation System uses **SQLite** with Write-Ahead Logging (`WAL`) mode enabled for high concurrency, durability, and fast local execution.

Database file location: `./database/whatsapp_automation.sqlite`

---

## 1. Entity Relationship Diagram (ERD)

```mermaid
erDiagram
    users {
        INTEGER id PK
        TEXT name
        TEXT email UK
        TEXT password_hash
        TEXT role
        DATETIME created_at
        DATETIME updated_at
    }

    content_categories {
        INTEGER id PK
        TEXT name UK
        TEXT description
        INTEGER is_default
        DATETIME created_at
    }

    content_topics {
        INTEGER id PK
        INTEGER category_id FK
        TEXT name
        TEXT description
        DATETIME created_at
    }

    whatsapp_groups {
        INTEGER id PK
        TEXT group_name
        TEXT whatsapp_group_id UK
        INTEGER enabled
        TEXT category
        TEXT audience
        TEXT language
        TEXT topic
        TEXT tone
        TEXT content_type
        TEXT posting_time
        TEXT frequency
        INTEGER participant_count
        DATETIME created_at
        DATETIME updated_at
    }

    generated_content {
        INTEGER id PK
        INTEGER group_id FK
        TEXT category
        TEXT topic
        TEXT content
        TEXT content_type
        TEXT audience
        TEXT language
        TEXT tone
        TEXT model
        DATETIME generated_at
        INTEGER approved
        TEXT status
        TEXT metadata
    }

    schedules {
        INTEGER id PK
        INTEGER group_id FK
        TEXT topic
        TEXT content_type
        TEXT posting_time
        TEXT frequency
        TEXT cron_expression
        INTEGER enabled
        DATETIME last_run_at
        DATETIME next_run_at
        DATETIME created_at
        DATETIME updated_at
    }

    message_logs {
        INTEGER id PK
        INTEGER group_id FK
        TEXT group_name
        INTEGER content_id FK
        TEXT content_snippet
        DATETIME scheduled_at
        DATETIME sent_at
        TEXT status
        TEXT error_message
        INTEGER retry_count
        TEXT log_type
        DATETIME created_at
    }

    settings {
        TEXT key PK
        TEXT value
        TEXT description
        DATETIME updated_at
    }

    content_categories ||--o{ content_topics : "has"
    whatsapp_groups ||--o{ generated_content : "receives"
    whatsapp_groups ||--o{ schedules : "scheduled_for"
    whatsapp_groups ||--o{ message_logs : "logs"
    generated_content ||--o{ message_logs : "dispatched_as"
```

---

## 2. Table Specifications

### `users`
Stores administrative accounts.
- `id`: Primary key (autoincrement).
- `name`: Admin display name.
- `email`: Unique login email.
- `password_hash`: Bcrypt hashed password (10 salt rounds).
- `role`: Role string (`admin`).

### `content_categories`
Content domains (Data Analytics, Python, SQL, Generative AI, SEO, etc.).

### `content_topics`
Curated topics tied to each category.

### `whatsapp_groups`
Detected WhatsApp groups synchronized from active session.
- `whatsapp_group_id`: Unique WhatsApp JID (e.g. `120363024829102934@g.us`).
- `enabled`: `1` if automation is active, `0` if paused.
- `category`, `audience`, `language`, `topic`, `tone`, `content_type`: Group-specific generation settings.
- `posting_time`, `frequency`: Schedule parameters.

### `generated_content`
Historical repository of all LLM generated posts.
- `status`: `draft`, `approved`, `rejected`, `sent`, `failed`.
- `metadata`: JSON payload containing duplicate similarity scores and evaluation metrics.

### `schedules`
Recurring automation configurations registered with `node-cron`.

### `message_logs`
Delivery audit log tracking dispatches, retries, and errors.
- `status`: `success`, `failed`, `retrying`, `skipped`.
- `log_type`: `scheduled`, `manual_test`, `immediate`.

### `settings`
Key-value configuration store for safety thresholds and global flags (`emergency_stop`, `auto_send_enabled`, `max_messages_per_hour`, `min_delay_between_messages_sec`, `max_retries`).

---

## 3. Database Maintenance & Backup

### Backup Database:
```bash
# Windows PowerShell
Copy-Item ./database/whatsapp_automation.sqlite ./database/backup_whatsapp_automation.sqlite
```

### Reset & Reseed Database:
```bash
npm run seed
```
