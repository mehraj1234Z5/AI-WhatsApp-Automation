-- SQLite Database Schema for AI WhatsApp Content Automation System

PRAGMA foreign_keys = ON;

-- 1. Users table (Admin accounts)
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Content Categories
CREATE TABLE IF NOT EXISTS content_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    is_default INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. Content Topics
CREATE TABLE IF NOT EXISTS content_topics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES content_categories(id) ON DELETE CASCADE
);

-- 4. WhatsApp Groups
CREATE TABLE IF NOT EXISTS whatsapp_groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_name TEXT NOT NULL,
    whatsapp_group_id TEXT UNIQUE NOT NULL,
    enabled INTEGER DEFAULT 0,
    category TEXT DEFAULT 'Data Analytics',
    audience TEXT DEFAULT 'Data Analytics Students',
    language TEXT DEFAULT 'English',
    topic TEXT DEFAULT 'SQL Basics & Queries',
    tone TEXT DEFAULT 'Professional & Engaging',
    content_type TEXT DEFAULT 'Daily Tip',
    posting_time TEXT DEFAULT '09:00',
    frequency TEXT DEFAULT 'Daily',
    participant_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 5. Generated Content History
CREATE TABLE IF NOT EXISTS generated_content (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id INTEGER,
    category TEXT NOT NULL,
    topic TEXT NOT NULL,
    content TEXT NOT NULL,
    content_type TEXT NOT NULL,
    audience TEXT,
    language TEXT DEFAULT 'English',
    tone TEXT DEFAULT 'Professional',
    model TEXT NOT NULL,
    generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    approved INTEGER DEFAULT 0,
    status TEXT DEFAULT 'draft', -- draft, approved, rejected, sent, failed
    metadata TEXT,
    FOREIGN KEY (group_id) REFERENCES whatsapp_groups(id) ON DELETE SET NULL
);

-- 6. Automation Schedules
CREATE TABLE IF NOT EXISTS schedules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id INTEGER NOT NULL,
    topic TEXT NOT NULL,
    content_type TEXT NOT NULL DEFAULT 'Daily Tip',
    posting_time TEXT NOT NULL DEFAULT '09:00',
    frequency TEXT NOT NULL DEFAULT 'Daily', -- Daily, Weekdays, Weekends, Custom
    cron_expression TEXT NOT NULL,
    enabled INTEGER DEFAULT 1,
    last_run_at DATETIME,
    next_run_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (group_id) REFERENCES whatsapp_groups(id) ON DELETE CASCADE
);

-- 7. Message Delivery Logs
CREATE TABLE IF NOT EXISTS message_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id INTEGER,
    group_name TEXT,
    content_id INTEGER,
    content_snippet TEXT,
    scheduled_at DATETIME,
    sent_at DATETIME,
    status TEXT NOT NULL, -- success, failed, retrying, skipped
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    log_type TEXT DEFAULT 'scheduled', -- scheduled, manual_test, immediate
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (group_id) REFERENCES whatsapp_groups(id) ON DELETE SET NULL,
    FOREIGN KEY (content_id) REFERENCES generated_content(id) ON DELETE SET NULL
);

-- 8. System & Automation Settings
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Performance indices
CREATE INDEX IF NOT EXISTS idx_groups_jid ON whatsapp_groups(whatsapp_group_id);
CREATE INDEX IF NOT EXISTS idx_content_topic ON generated_content(topic);
CREATE INDEX IF NOT EXISTS idx_content_status ON generated_content(status);
CREATE INDEX IF NOT EXISTS idx_logs_created ON message_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_logs_status ON message_logs(status);
CREATE INDEX IF NOT EXISTS idx_schedules_enabled ON schedules(enabled);
