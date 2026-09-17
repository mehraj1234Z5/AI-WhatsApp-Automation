const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const dbPath = process.env.DATABASE_PATH || './database/whatsapp_automation.sqlite';
const resolvedDbPath = path.resolve(process.cwd(), dbPath);
const dbDir = path.dirname(resolvedDbPath);

// Ensure directory exists
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

let dbInstance = null;

function getDb() {
  if (!dbInstance) {
    dbInstance = new sqlite3.Database(resolvedDbPath, (err) => {
      if (err) {
        console.error(`[Database Error] Failed to connect to SQLite at ${resolvedDbPath}:`, err.message);
      } else {
        // Enable WAL mode for concurrency and foreign keys
        dbInstance.run('PRAGMA foreign_keys = ON;');
        dbInstance.run('PRAGMA journal_mode = WAL;');
      }
    });
  }
  return dbInstance;
}

// Async wrapper helpers
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    const db = getDb();
    db.run(sql, params, function (err) {
      if (err) {
        return reject(err);
      }
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    const db = getDb();
    db.get(sql, params, (err, row) => {
      if (err) {
        return reject(err);
      }
      resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    const db = getDb();
    db.all(sql, params, (err, rows) => {
      if (err) {
        return reject(err);
      }
      resolve(rows || []);
    });
  });
}

function exec(sql) {
  return new Promise((resolve, reject) => {
    const db = getDb();
    db.exec(sql, (err) => {
      if (err) {
        return reject(err);
      }
      resolve();
    });
  });
}

async function initDatabase() {
  const schemaPath = path.resolve(__dirname, 'schema', 'schema.sql');
  if (fs.existsSync(schemaPath)) {
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    await exec(schemaSql);
  }
}

module.exports = {
  getDb,
  run,
  get,
  all,
  exec,
  initDatabase,
  resolvedDbPath
};
