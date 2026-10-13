'use strict';
// Usage: node create-admin.js USERNAME "A LONG PASSWORD"
// Run it again with the same username to reset a forgotten password.
const db = require('./db');
const { hashPassword } = require('./auth');

const username = String(process.argv[2] || '').trim().toLowerCase();
const password = String(process.argv[3] || '');

if (!/^[a-z0-9._-]{3,30}$/.test(username)) {
  console.log('Username must be 3 to 30 characters: letters, numbers, dot, dash or underscore.');
  process.exit(1);
}
if (password.length < 10) {
  console.log('Password must be at least 10 characters. A short sentence works well.');
  process.exit(1);
}
const existing = db.prepare('SELECT id FROM admins WHERE username = ?').get(username);
if (existing) {
  db.prepare('UPDATE admins SET password = ? WHERE id = ?').run(hashPassword(password), existing.id);
  console.log('Password updated for ' + username);
} else {
  db.prepare('INSERT INTO admins (username, password) VALUES (?, ?)').run(username, hashPassword(password));
  console.log('Admin created: ' + username);
}
