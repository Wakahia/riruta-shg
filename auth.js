'use strict';
const crypto = require('crypto');

function hashPassword(pw) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(pw, salt, 64).toString('hex');
  return 'scrypt$' + salt + '$' + hash;
}

function verifyPassword(pw, stored) {
  try {
    const parts = String(stored).split('$');
    if (parts[0] !== 'scrypt') return false;
    const a = Buffer.from(parts[2], 'hex');
    const b = crypto.scryptSync(pw, parts[1], 64);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch (e) {
    return false;
  }
}

// Keeps admin logins in the same SQLite database, so they survive a restart.
function makeStore(session, db) {
  const getQ = db.prepare('SELECT data, expires FROM sessions WHERE sid = ?');
  const setQ = db.prepare('INSERT OR REPLACE INTO sessions (sid, data, expires) VALUES (?, ?, ?)');
  const delQ = db.prepare('DELETE FROM sessions WHERE sid = ?');
  const touchQ = db.prepare('UPDATE sessions SET expires = ? WHERE sid = ?');
  const expiry = (sess) => (sess && sess.cookie && sess.cookie.expires)
    ? new Date(sess.cookie.expires).getTime()
    : Date.now() + 8 * 3600 * 1000;

  class SqliteStore extends session.Store {
    get(sid, cb) {
      try {
        const r = getQ.get(sid);
        if (!r || r.expires < Date.now()) return cb(null, null);
        cb(null, JSON.parse(r.data));
      } catch (e) { cb(e); }
    }
    set(sid, sess, cb) {
      try { setQ.run(sid, JSON.stringify(sess), expiry(sess)); cb && cb(null); } catch (e) { cb && cb(e); }
    }
    destroy(sid, cb) {
      try { delQ.run(sid); cb && cb(null); } catch (e) { cb && cb(e); }
    }
    touch(sid, sess, cb) {
      try { touchQ.run(expiry(sess), sid); cb && cb(null); } catch (e) { cb && cb(e); }
    }
  }
  const store = new SqliteStore();
  setInterval(() => {
    try { db.prepare('DELETE FROM sessions WHERE expires < ?').run(Date.now()); } catch (e) {}
  }, 3600 * 1000).unref();
  return store;
}

module.exports = { hashPassword, verifyPassword, makeStore };
