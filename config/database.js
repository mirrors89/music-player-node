const Database = require('better-sqlite3');
const path = require('path');

// Create data directory if it doesn't exist
const fs = require('fs');
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize SQLite database
const dbPath = path.join(dataDir, 'music-player.db');
const db = new Database(dbPath, { verbose: console.log });

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Create songs table
const createTableSQL = `
  CREATE TABLE IF NOT EXISTS songs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    youtube_id TEXT NOT NULL,
    title TEXT NOT NULL,
    channel_title TEXT NOT NULL,
    thumbnail_url TEXT,
    duration TEXT,
    play_order INTEGER NOT NULL,
    is_played INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    played_at TEXT,
    requested_by_user_id TEXT,
    requested_by_user_name TEXT
  )
`;

db.exec(createTableSQL);

// Migration: Add requested_by columns if they don't exist
try {
  db.exec(`ALTER TABLE songs ADD COLUMN requested_by_user_id TEXT`);
  console.log('Added requested_by_user_id column');
} catch (e) {
  // Column already exists, ignore
}

try {
  db.exec(`ALTER TABLE songs ADD COLUMN requested_by_user_name TEXT`);
  console.log('Added requested_by_user_name column');
} catch (e) {
  // Column already exists, ignore
}

console.log('Database initialized at:', dbPath);

module.exports = db;
