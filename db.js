'use strict';
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const dataDir = path.join(__dirname, 'data');
fs.mkdirSync(dataDir, { recursive: true });
const db = new Database(path.join(dataDir, 'shg.db'));
db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS admins (id INTEGER PRIMARY KEY, username TEXT UNIQUE NOT NULL, password TEXT NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS news (id INTEGER PRIMARY KEY, title TEXT NOT NULL, body TEXT NOT NULL, image TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS gallery (id INTEGER PRIMARY KEY, image TEXT NOT NULL, caption TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS careers (id INTEGER PRIMARY KEY, title TEXT NOT NULL, details TEXT, closing TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS feedback (id INTEGER PRIMARY KEY, name TEXT NOT NULL, phone TEXT NOT NULL, message TEXT NOT NULL, seen INTEGER DEFAULT 0, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS visits (id INTEGER PRIMARY KEY, day TEXT NOT NULL, visitor TEXT NOT NULL, path TEXT NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX IF NOT EXISTS visits_day ON visits (day);
CREATE TABLE IF NOT EXISTS logs (id INTEGER PRIMARY KEY, username TEXT, action TEXT NOT NULL, ip TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS sessions (sid TEXT PRIMARY KEY, data TEXT NOT NULL, expires INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT);
`);

// First run only: start the gallery with a few of your pictures.
if (!db.prepare("SELECT value FROM meta WHERE key = 'gallery_seeded'").get()) {
  const ins = db.prepare('INSERT INTO gallery (image, caption) VALUES (?, ?)');
  [
    ['seed-team.jpg', 'Members in a group meeting'],
    ['seed-1.jpg', 'Stay active, save consistently'],
    ['seed-2.jpg', 'Repay on time, borrow again'],
    ['seed-3.jpg', 'Guarantors: your questions answered'],
    ['seed-4.jpg', 'How to make a loan repayment']
  ].forEach(([file, cap]) => {
    if (fs.existsSync(path.join(__dirname, 'public', 'uploads', file))) ins.run(file, cap);
  });
  db.prepare("INSERT INTO meta (key, value) VALUES ('gallery_seeded', '1')").run();
}

module.exports = db;
