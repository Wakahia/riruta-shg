'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Tiny .env reader, so you do not need an extra package.
try {
  const envFile = path.join(__dirname, '.env');
  if (fs.existsSync(envFile)) {
    fs.readFileSync(envFile, 'utf8').split(/\r?\n/).forEach((line) => {
      const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    });
  }
} catch (e) { /* ignore */ }

const express = require('express');
const session = require('express-session');
const multer = require('multer');
const site = require('./config');
const db = require('./db');
const { hashPassword, verifyPassword, makeStore } = require('./auth');

const PORT = process.env.PORT || 3000;
const TZ = 'Africa/Nairobi';

let secret = process.env.SESSION_SECRET;
if (!secret || secret.length < 16) {
  secret = crypto.randomBytes(32).toString('hex');
  console.warn('WARNING: SESSION_SECRET is missing or too short (see .env.example). Admin logins will reset whenever the server restarts.');
}

/* ---------- small helpers ---------- */
const fmt = (s, withTime) => {
  if (!s) return '';
  const d = new Date(String(s).replace(' ', 'T') + 'Z');
  if (isNaN(d)) return String(s);
  return d.toLocaleString('en-KE', withTime
    ? { timeZone: TZ, dateStyle: 'medium', timeStyle: 'short' }
    : { timeZone: TZ, dateStyle: 'medium' });
};
const dayOffset = (n) => new Date(Date.now() - n * 864e5).toLocaleDateString('en-CA', { timeZone: TZ });
const clean = (s, max) => String(s == null ? '' : s).replace(/\r\n/g, '\n').trim().slice(0, max);
const addLog = (user, action, ip) => db.prepare('INSERT INTO logs (username, action, ip) VALUES (?, ?, ?)').run(user || null, action, ip || null);
const readCookie = (req, name) => {
  const hit = (req.headers.cookie || '').split(';').map((s) => s.trim()).find((s) => s.startsWith(name + '='));
  return hit ? decodeURIComponent(hit.slice(name.length + 1)) : null;
};
function limiter(max, windowMs) {
  const hits = new Map();
  const recent = (key) => {
    const now = Date.now();
    const a = (hits.get(key) || []).filter((t) => now - t < windowMs);
    if (a.length) hits.set(key, a); else hits.delete(key);
    return a;
  };
  return {
    ok: (key) => recent(key).length < max,
    add: (key) => { const a = recent(key); a.push(Date.now()); hits.set(key, a); },
    clear: (key) => hits.delete(key)
  };
}

/* ---------- uploads ---------- */
const upDir = path.join(__dirname, 'public', 'uploads');
fs.mkdirSync(upDir, { recursive: true });
const ALLOWED = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };
const upload = multer({
  storage: multer.diskStorage({
    destination: upDir,
    filename: (req, file, cb) => cb(null, Date.now() + '-' + crypto.randomBytes(6).toString('hex') + ALLOWED[file.mimetype])
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 20 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED[file.mimetype]) return cb(null, true);
    req.uploadError = 'Only JPG, PNG or WebP pictures are allowed.';
    cb(null, false);
  }
});
const handleUpload = (mw) => (req, res, next) => mw(req, res, (err) => {
  if (err) req.uploadError = err.code === 'LIMIT_FILE_SIZE' ? 'A picture is too large. The limit is 5 MB each.' : 'The upload failed. Please try again.';
  next();
});
function looksLikeImage(file) {
  try {
    const fd = fs.openSync(path.join(upDir, file), 'r');
    const b = Buffer.alloc(12);
    fs.readSync(fd, b, 0, 12, 0);
    fs.closeSync(fd);
    const jpg = b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
    const png = b[0] === 0x89 && b.toString('ascii', 1, 4) === 'PNG';
    const webp = b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP';
    return jpg || png || webp;
  } catch (e) { return false; }
}
const removeUpload = (name) => {
  if (name && /^[\w.-]+$/.test(name)) fs.unlink(path.join(upDir, name), () => {});
};

/* ---------- app ---------- */
const app = express();
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use((req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Content-Security-Policy': "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; script-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
  });
  next();
});
app.use(express.static(path.join(__dirname, 'public'), { maxAge: '1d' }));
app.use(express.urlencoded({ extended: false, limit: '50kb' }));
app.use((req, res, next) => {
  res.locals.site = site;
  res.locals.path = req.path;
  res.locals.title = '';
  res.locals.fmt = fmt;
  res.locals.user = null;
  next();
});

/* ---------- public pages (with visitor counting) ---------- */
function track(req, res, next) {
  if (req.method !== 'GET') return next();
  if (/bot|crawl|spider|slurp|preview|monitor|curl|wget/i.test(req.get('user-agent') || '')) return next();
  try {
    let vid = readCookie(req, 'vid');
    if (!vid || !/^[a-f0-9]{24}$/.test(vid)) {
      vid = crypto.randomBytes(12).toString('hex');
      res.cookie('vid', vid, { maxAge: 365 * 864e5, httpOnly: true, sameSite: 'lax', secure: req.secure });
    }
    const day = new Date().toLocaleDateString('en-CA', { timeZone: TZ });
    db.prepare('INSERT INTO visits (day, visitor, path) VALUES (?, ?, ?)').run(day, vid, req.path.slice(0, 100));
  } catch (e) { console.error('visit not recorded:', e.message); }
  next();
}

const pub = express.Router();
pub.use(track);
pub.get('/', (req, res) => res.render('index', { title: '', news: db.prepare('SELECT * FROM news ORDER BY id DESC LIMIT 3').all() }));
pub.get('/loans', (req, res) => res.render('loans', { title: 'Loans' }));
pub.get('/join', (req, res) => res.render('join', { title: 'Join us' }));
pub.get('/faq', (req, res) => res.render('faq', { title: 'FAQs' }));
pub.get('/contact', (req, res) => res.render('contact', { title: 'Contact' }));
pub.get('/news', (req, res) => res.render('news', { title: 'News', news: db.prepare('SELECT * FROM news ORDER BY id DESC').all() }));
pub.get('/gallery', (req, res) => res.render('gallery', { title: 'Gallery', pics: db.prepare('SELECT * FROM gallery ORDER BY id DESC').all() }));
pub.get('/careers', (req, res) => res.render('careers', { title: 'Careers', jobs: db.prepare('SELECT * FROM careers ORDER BY id DESC').all() }));

const fbLimit = limiter(5, 3600 * 1000);
pub.get('/feedback', (req, res) => res.render('feedback', { title: 'Feedback', sent: req.query.sent === '1', error: null, form: {} }));
pub.post('/feedback', (req, res) => {
  const form = { name: clean(req.body.name, 100), phone: clean(req.body.phone, 20), message: clean(req.body.message, 2000) };
  if (req.body.website) return res.redirect('/feedback?sent=1'); // hidden field: only bots fill it in
  let error = null;
  if (form.name.length < 2) error = 'Please enter your full name.';
  else if (!/^[0-9+()\s-]{7,20}$/.test(form.phone)) error = 'Please enter a valid phone number.';
  else if (form.message.length < 5) error = 'Please write your suggestion.';
  else if (!fbLimit.ok(req.ip)) error = 'You have sent several messages already. Please try again later.';
  if (error) return res.status(400).render('feedback', { title: 'Feedback', sent: false, error, form });
  fbLimit.add(req.ip);
  db.prepare('INSERT INTO feedback (name, phone, message) VALUES (?, ?, ?)').run(form.name, form.phone, form.message);
  res.redirect('/feedback?sent=1');
});

/* ---------- admin ---------- */
const admin = express.Router();
const loginLimit = limiter(5, 15 * 60 * 1000);
const DUMMY = hashPassword('not-a-real-password');

admin.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  res.locals.flash = req.session.flash || null;
  delete req.session.flash;
  next();
});

admin.get('/login', (req, res) => {
  if (req.session.user) return res.redirect('/admin');
  res.render('admin/login', { error: null });
});
admin.post('/login', (req, res, next) => {
  const ip = req.ip;
  if (!loginLimit.ok(ip)) {
    addLog(null, 'Login blocked: too many attempts', ip);
    return res.status(429).render('admin/login', { error: 'Too many attempts. Please wait 15 minutes and try again.' });
  }
  const name = clean(req.body.username, 40).toLowerCase();
  const pw = String(req.body.password || '');
  const row = db.prepare('SELECT * FROM admins WHERE username = ?').get(name);
  const ok = row ? verifyPassword(pw, row.password) : (verifyPassword(pw, DUMMY), false);
  if (!ok) {
    loginLimit.add(ip);
    addLog(name || '?', 'Failed login', ip);
    return res.status(401).render('admin/login', { error: 'Wrong username or password.' });
  }
  loginLimit.clear(ip);
  req.session.regenerate((err) => {
    if (err) return next(err);
    req.session.user = { id: row.id, username: row.username };
    req.session.csrf = crypto.randomBytes(24).toString('hex');
    addLog(row.username, 'Logged in', ip);
    res.redirect('/admin');
  });
});

// Everything below needs a login.
admin.use((req, res, next) => {
  if (!req.session.user) return res.redirect('/admin/login');
  res.locals.user = req.session.user;
  res.locals.csrf = req.session.csrf;
  res.locals.unread = db.prepare('SELECT COUNT(*) c FROM feedback WHERE seen = 0').get().c;
  next();
});
admin.use((req, res, next) => {
  if (req.method === 'POST' && (!req.query._csrf || req.query._csrf !== req.session.csrf)) {
    return res.status(403).send('Security check failed. Go back, refresh the page and try again.');
  }
  next();
});
const back = (req, res, to, type, msg) => { req.session.flash = { type, msg }; res.redirect(to); };
const who = (req) => req.session.user.username;

admin.post('/logout', (req, res) => {
  addLog(who(req), 'Logged out', req.ip);
  req.session.destroy(() => res.redirect('/admin/login'));
});

admin.get('/', (req, res) => {
  const one = (sql, ...a) => db.prepare(sql).get(...a).c;
  const d0 = dayOffset(0), d6 = dayOffset(6), d29 = dayOffset(29), d13 = dayOffset(13);
  const stats = {
    viewsToday: one('SELECT COUNT(*) c FROM visits WHERE day = ?', d0),
    visitorsToday: one('SELECT COUNT(DISTINCT visitor) c FROM visits WHERE day = ?', d0),
    visitors7: one('SELECT COUNT(DISTINCT visitor) c FROM visits WHERE day >= ?', d6),
    visitors30: one('SELECT COUNT(DISTINCT visitor) c FROM visits WHERE day >= ?', d29),
    viewsAll: one('SELECT COUNT(*) c FROM visits'),
    visitorsAll: one('SELECT COUNT(DISTINCT visitor) c FROM visits'),
    news: one('SELECT COUNT(*) c FROM news'),
    gallery: one('SELECT COUNT(*) c FROM gallery'),
    careers: one('SELECT COUNT(*) c FROM careers'),
    feedback: one('SELECT COUNT(*) c FROM feedback')
  };
  const rows = db.prepare('SELECT day, COUNT(*) views, COUNT(DISTINCT visitor) visitors FROM visits WHERE day >= ? GROUP BY day').all(d13);
  const byDay = {};
  rows.forEach((r) => { byDay[r.day] = r; });
  const series = [];
  for (let i = 13; i >= 0; i--) {
    const day = dayOffset(i);
    series.push({ day, views: byDay[day] ? byDay[day].views : 0, visitors: byDay[day] ? byDay[day].visitors : 0 });
  }
  const top = db.prepare('SELECT path, COUNT(*) c FROM visits WHERE day >= ? GROUP BY path ORDER BY c DESC LIMIT 6').all(d29);
  res.render('admin/dashboard', { stats, series, top, max: Math.max(1, ...series.map((s) => s.views)) });
});

/* news */
admin.get('/news', (req, res) => res.render('admin/news', { rows: db.prepare('SELECT * FROM news ORDER BY id DESC').all() }));
admin.post('/news', handleUpload(upload.single('image')), (req, res) => {
  const title = clean(req.body.title, 150), text = clean(req.body.body, 5000);
  let image = null;
  if (req.file) {
    if (looksLikeImage(req.file.filename)) image = req.file.filename; else removeUpload(req.file.filename);
  }
  if (req.uploadError || !title || !text) {
    removeUpload(image);
    return back(req, res, '/admin/news', 'error', req.uploadError || 'Please fill in the title and the story.');
  }
  db.prepare('INSERT INTO news (title, body, image) VALUES (?, ?, ?)').run(title, text, image);
  addLog(who(req), 'Added news: ' + title, req.ip);
  back(req, res, '/admin/news', 'ok', 'News added. It is now on the website.');
});
admin.post('/news/:id/delete', (req, res) => {
  const row = db.prepare('SELECT * FROM news WHERE id = ?').get(parseInt(req.params.id, 10));
  if (row) {
    db.prepare('DELETE FROM news WHERE id = ?').run(row.id);
    removeUpload(row.image);
    addLog(who(req), 'Deleted news: ' + row.title, req.ip);
  }
  back(req, res, '/admin/news', 'ok', 'News deleted.');
});

/* gallery */
admin.get('/gallery', (req, res) => res.render('admin/gallery', { rows: db.prepare('SELECT * FROM gallery ORDER BY id DESC').all() }));
admin.post('/gallery', handleUpload(upload.array('images', 20)), (req, res) => {
  const caption = clean(req.body.caption, 150);
  let added = 0;
  (req.files || []).forEach((f) => {
    if (looksLikeImage(f.filename)) {
      db.prepare('INSERT INTO gallery (image, caption) VALUES (?, ?)').run(f.filename, caption);
      added++;
    } else removeUpload(f.filename);
  });
  if (!added) return back(req, res, '/admin/gallery', 'error', req.uploadError || 'Please choose at least one JPG, PNG or WebP picture.');
  addLog(who(req), 'Added ' + added + ' gallery picture(s)', req.ip);
  back(req, res, '/admin/gallery', 'ok', added + ' picture(s) added. They are now on the website.');
});
admin.post('/gallery/:id/delete', (req, res) => {
  const row = db.prepare('SELECT * FROM gallery WHERE id = ?').get(parseInt(req.params.id, 10));
  if (row) {
    db.prepare('DELETE FROM gallery WHERE id = ?').run(row.id);
    removeUpload(row.image);
    addLog(who(req), 'Deleted gallery picture: ' + (row.caption || row.image), req.ip);
  }
  back(req, res, '/admin/gallery', 'ok', 'Picture deleted.');
});

/* careers */
admin.get('/careers', (req, res) => res.render('admin/careers', { rows: db.prepare('SELECT * FROM careers ORDER BY id DESC').all() }));
admin.post('/careers', (req, res) => {
  const title = clean(req.body.title, 150), details = clean(req.body.details, 3000);
  const closing = /^\d{4}-\d{2}-\d{2}$/.test(req.body.closing || '') ? req.body.closing : null;
  if (!title) return back(req, res, '/admin/careers', 'error', 'Please enter the position title.');
  db.prepare('INSERT INTO careers (title, details, closing) VALUES (?, ?, ?)').run(title, details, closing);
  addLog(who(req), 'Added position: ' + title, req.ip);
  back(req, res, '/admin/careers', 'ok', 'Position added. It is now on the Careers page.');
});
admin.post('/careers/:id/delete', (req, res) => {
  const row = db.prepare('SELECT * FROM careers WHERE id = ?').get(parseInt(req.params.id, 10));
  if (row) {
    db.prepare('DELETE FROM careers WHERE id = ?').run(row.id);
    addLog(who(req), 'Removed position: ' + row.title, req.ip);
  }
  back(req, res, '/admin/careers', 'ok', 'Position removed.');
});

/* feedback */
admin.get('/feedback', (req, res) => {
  const rows = db.prepare('SELECT * FROM feedback ORDER BY id DESC').all();
  db.prepare('UPDATE feedback SET seen = 1 WHERE seen = 0').run();
  res.render('admin/feedback', { rows, unread: 0 });
});
admin.post('/feedback/:id/delete', (req, res) => {
  db.prepare('DELETE FROM feedback WHERE id = ?').run(parseInt(req.params.id, 10));
  addLog(who(req), 'Deleted a feedback message', req.ip);
  back(req, res, '/admin/feedback', 'ok', 'Message deleted.');
});

/* logs */
admin.get('/logs', (req, res) => res.render('admin/logs', { rows: db.prepare('SELECT * FROM logs ORDER BY id DESC LIMIT 300').all() }));

/* staff and password */
admin.get('/staff', (req, res) => res.render('admin/staff', { rows: db.prepare('SELECT id, username, created_at FROM admins ORDER BY id').all() }));
admin.post('/staff', (req, res) => {
  const name = clean(req.body.username, 40).toLowerCase(), pw = String(req.body.password || '');
  if (!/^[a-z0-9._-]{3,30}$/.test(name)) return back(req, res, '/admin/staff', 'error', 'Username must be 3 to 30 characters: letters, numbers, dot, dash or underscore.');
  if (pw.length < 10) return back(req, res, '/admin/staff', 'error', 'Password must be at least 10 characters.');
  if (db.prepare('SELECT id FROM admins WHERE username = ?').get(name)) return back(req, res, '/admin/staff', 'error', 'That username already exists.');
  db.prepare('INSERT INTO admins (username, password) VALUES (?, ?)').run(name, hashPassword(pw));
  addLog(who(req), 'Added admin user: ' + name, req.ip);
  back(req, res, '/admin/staff', 'ok', 'Admin user added.');
});
admin.post('/staff/:id/delete', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const row = db.prepare('SELECT * FROM admins WHERE id = ?').get(id);
  const count = db.prepare('SELECT COUNT(*) c FROM admins').get().c;
  if (!row) return back(req, res, '/admin/staff', 'error', 'User not found.');
  if (id === req.session.user.id) return back(req, res, '/admin/staff', 'error', 'You cannot delete your own account.');
  if (count < 2) return back(req, res, '/admin/staff', 'error', 'At least one admin must remain.');
  db.prepare('DELETE FROM admins WHERE id = ?').run(id);
  db.prepare('DELETE FROM sessions WHERE data LIKE ?').run('%"id":' + id + ',%');
  addLog(who(req), 'Deleted admin user: ' + row.username, req.ip);
  back(req, res, '/admin/staff', 'ok', 'Admin user deleted.');
});
admin.post('/password', (req, res) => {
  const row = db.prepare('SELECT * FROM admins WHERE id = ?').get(req.session.user.id);
  const cur = String(req.body.current || ''), nw = String(req.body.password || ''), again = String(req.body.again || '');
  if (!row || !verifyPassword(cur, row.password)) return back(req, res, '/admin/staff', 'error', 'Your current password is not correct.');
  if (nw.length < 10) return back(req, res, '/admin/staff', 'error', 'New password must be at least 10 characters.');
  if (nw !== again) return back(req, res, '/admin/staff', 'error', 'The two new passwords do not match.');
  db.prepare('UPDATE admins SET password = ? WHERE id = ?').run(hashPassword(nw), row.id);
  addLog(who(req), 'Changed own password', req.ip);
  back(req, res, '/admin/staff', 'ok', 'Password changed.');
});

app.use('/admin', session({
  store: makeStore(session, db),
  name: 'shg.sid',
  secret,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: { httpOnly: true, sameSite: 'lax', secure: 'auto', maxAge: 8 * 3600 * 1000 }
}), admin);
app.use('/', pub);

app.use((req, res) => res.status(404).render('404', { title: 'Page not found' }));
app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  console.error(err);
  res.status(500).send('Something went wrong. Please try again.');
});

app.listen(PORT, () => console.log('Site running at http://localhost:' + PORT));
