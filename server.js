// Passione Briks — server
// Salva costruzioni, foto e messaggi.
// Su Replit usa il database PostgreSQL (variabile DATABASE_URL), così i dati
// restano anche dopo la pubblicazione. Senza database usa la cartella ./data.

const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const ADMIN_PIN = (process.env.ADMIN_PIN || '').trim();
const SECRET = process.env.SESSION_SECRET || ADMIN_PIN || 'passione-briks';

const app = express();
app.use(express.json({ limit: '12mb' }));
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));

const newId = () => crypto.randomBytes(9).toString('base64url');
const tokenFor = (pin) => crypto.createHmac('sha256', SECRET).update('admin:' + pin).digest('hex');

// ---------- Storage ----------

function fileStore() {
  const dir = path.join(__dirname, 'data');
  const imgDir = path.join(dir, 'images');
  const dbFile = path.join(dir, 'db.json');
  fs.mkdirSync(imgDir, { recursive: true });
  const load = () => {
    try { return JSON.parse(fs.readFileSync(dbFile, 'utf8')); }
    catch { return { projects: [], messages: [] }; }
  };
  const save = (db) => fs.writeFileSync(dbFile, JSON.stringify(db, null, 2));
  return {
    async init() {},
    async listProjects() { return load().projects.sort((a, b) => b.createdAt.localeCompare(a.createdAt)); },
    async getProject(id) { return load().projects.find((p) => p.id === id) || null; },
    async saveProject(p) {
      const db = load();
      const i = db.projects.findIndex((x) => x.id === p.id);
      if (i >= 0) db.projects[i] = p; else db.projects.push(p);
      save(db);
    },
    async deleteProject(id) { const db = load(); db.projects = db.projects.filter((p) => p.id !== id); save(db); },
    async saveImage(id, mime, buf) { fs.writeFileSync(path.join(imgDir, id), buf); fs.writeFileSync(path.join(imgDir, id + '.type'), mime); },
    async getImage(id) {
      try { return { mime: fs.readFileSync(path.join(imgDir, id + '.type'), 'utf8'), data: fs.readFileSync(path.join(imgDir, id)) }; }
      catch { return null; }
    },
    async deleteImage(id) { for (const f of [id, id + '.type']) { try { fs.unlinkSync(path.join(imgDir, f)); } catch {} } },
    async listMessages(all) {
      const m = load().messages.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return all ? m : m.filter((x) => x.approved);
    },
    async addMessage(m) { const db = load(); db.messages.push(m); save(db); },
    async setMessageApproved(id, approved) {
      const db = load(); const m = db.messages.find((x) => x.id === id); if (m) m.approved = approved; save(db);
    },
    async deleteMessage(id) { const db = load(); db.messages = db.messages.filter((m) => m.id !== id); save(db); },
    async getCollection() { return load().collection || { owned: [], wish: [] }; },
    async saveCollection(c) { const db = load(); db.collection = c; save(db); },
  };
}

function pgStore() {
  const { Pool } = require('pg');
  const ssl = /localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL) ? false : { rejectUnauthorized: false };
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl });
  const q = (sql, params) => pool.query(sql, params);
  return {
    async init() {
      await q(`CREATE TABLE IF NOT EXISTS pb_projects (id TEXT PRIMARY KEY, data JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now())`);
      await q(`CREATE TABLE IF NOT EXISTS pb_images (id TEXT PRIMARY KEY, mime TEXT NOT NULL, data BYTEA NOT NULL)`);
      await q(`CREATE TABLE IF NOT EXISTS pb_messages (id TEXT PRIMARY KEY, name TEXT NOT NULL, text TEXT NOT NULL, approved BOOLEAN NOT NULL DEFAULT false, created_at TIMESTAMPTZ NOT NULL DEFAULT now())`);
      await q(`CREATE TABLE IF NOT EXISTS pb_kv (k TEXT PRIMARY KEY, v JSONB NOT NULL)`);
    },
    async getCollection() { const r = await q(`SELECT v FROM pb_kv WHERE k='collection'`); return r.rows[0] ? r.rows[0].v : { owned: [], wish: [] }; },
    async saveCollection(c) { await q(`INSERT INTO pb_kv (k, v) VALUES ('collection', $1) ON CONFLICT (k) DO UPDATE SET v=EXCLUDED.v`, [c]); },
    async listProjects() { return (await q(`SELECT data FROM pb_projects ORDER BY created_at DESC`)).rows.map((r) => r.data); },
    async getProject(id) { const r = await q(`SELECT data FROM pb_projects WHERE id=$1`, [id]); return r.rows[0] ? r.rows[0].data : null; },
    async saveProject(p) {
      await q(`INSERT INTO pb_projects (id, data, created_at) VALUES ($1,$2,$3)
               ON CONFLICT (id) DO UPDATE SET data=EXCLUDED.data`, [p.id, p, p.createdAt]);
    },
    async deleteProject(id) { await q(`DELETE FROM pb_projects WHERE id=$1`, [id]); },
    async saveImage(id, mime, buf) { await q(`INSERT INTO pb_images (id, mime, data) VALUES ($1,$2,$3)`, [id, mime, buf]); },
    async getImage(id) { const r = await q(`SELECT mime, data FROM pb_images WHERE id=$1`, [id]); return r.rows[0] || null; },
    async deleteImage(id) { await q(`DELETE FROM pb_images WHERE id=$1`, [id]); },
    async listMessages(all) {
      const r = await q(`SELECT id, name, text, approved, created_at FROM pb_messages ${all ? '' : 'WHERE approved'} ORDER BY created_at DESC LIMIT 200`);
      return r.rows.map((m) => ({ id: m.id, name: m.name, text: m.text, approved: m.approved, createdAt: m.created_at.toISOString() }));
    },
    async addMessage(m) { await q(`INSERT INTO pb_messages (id, name, text, approved, created_at) VALUES ($1,$2,$3,$4,$5)`, [m.id, m.name, m.text, m.approved, m.createdAt]); },
    async setMessageApproved(id, approved) { await q(`UPDATE pb_messages SET approved=$2 WHERE id=$1`, [id, approved]); },
    async deleteMessage(id) { await q(`DELETE FROM pb_messages WHERE id=$1`, [id]); },
  };
}

const store = process.env.DATABASE_URL ? pgStore() : fileStore();

// ---------- Helpers ----------

const wrap = (fn) => (req, res) => fn(req, res).catch((e) => {
  console.error(e);
  res.status(500).json({ error: 'Qualcosa non ha funzionato sul server. Riprova tra poco.' });
});

function requireAdmin(req, res, next) {
  if (!ADMIN_PIN) return res.status(503).json({ error: 'Area di Alessio non attiva: manca il PIN (ADMIN_PIN nei Secrets).' });
  const t = req.get('x-admin-token') || '';
  const ok = t.length === 64 && crypto.timingSafeEqual(Buffer.from(t), Buffer.from(tokenFor(ADMIN_PIN)));
  if (!ok) return res.status(401).json({ error: 'PIN non valido. Rientra nell’area di Alessio.' });
  next();
}

const CATEGORIES = ['treni-storici', 'treni-lego', 'altro'];
const STATUSES = ['finito', 'in-costruzione', 'idea'];
const str = (v, max) => String(v == null ? '' : v).trim().slice(0, max);
const int = (v) => { const n = parseInt(v, 10); return Number.isFinite(n) && n >= 0 ? n : null; };

function cleanProject(body, existing) {
  const steps = Array.isArray(body.steps) ? body.steps.slice(0, 60).map((s) => ({
    text: str(s && s.text, 1500),
    image: s && s.image ? str(s.image, 40) : null,
  })).filter((s) => s.text || s.image) : [];
  return {
    id: existing ? existing.id : newId(),
    createdAt: existing ? existing.createdAt : new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    title: str(body.title, 120) || 'Costruzione senza nome',
    category: CATEGORIES.includes(body.category) ? body.category : 'altro',
    status: STATUSES.includes(body.status) ? body.status : 'finito',
    description: str(body.description, 4000),
    realTrain: str(body.realTrain, 160),
    pieces: int(body.pieces),
    hours: int(body.hours),
    width: int(body.width),
    cover: body.cover ? str(body.cover, 40) : null,
    featured: !!body.featured,
    gallery: Array.isArray(body.gallery) ? body.gallery.slice(0, 30).map((g) => str(g, 40)).filter(Boolean) : [],
    steps,
  };
}

// Una sola costruzione alla volta in home
async function keepOneFeatured(p) {
  if (!p.featured) return;
  for (const other of await store.listProjects()) {
    if (other.id !== p.id && other.featured) await store.saveProject({ ...other, featured: false });
  }
}

const imagesOf = (p) => [p.cover, ...(p.gallery || []), ...(p.steps || []).map((s) => s.image)].filter(Boolean);

// ---------- Routes ----------

app.get('/api/status', (req, res) => res.json({ adminEnabled: !!ADMIN_PIN }));

app.post('/api/login', (req, res) => {
  if (!ADMIN_PIN) return res.status(503).json({ error: 'Area di Alessio non attiva: manca il PIN (ADMIN_PIN nei Secrets).' });
  const pin = str(req.body && req.body.pin, 64);
  if (pin !== ADMIN_PIN) return res.status(401).json({ error: 'PIN sbagliato. Riprova.' });
  res.json({ token: tokenFor(ADMIN_PIN) });
});

app.get('/api/projects', wrap(async (req, res) => res.json(await store.listProjects())));

app.post('/api/projects', requireAdmin, wrap(async (req, res) => {
  const p = cleanProject(req.body || {});
  await store.saveProject(p);
  await keepOneFeatured(p);
  res.status(201).json(p);
}));

app.put('/api/projects/:id', requireAdmin, wrap(async (req, res) => {
  const existing = await store.getProject(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Costruzione non trovata.' });
  const p = cleanProject(req.body || {}, existing);
  const keep = new Set(imagesOf(p));
  for (const img of imagesOf(existing)) if (!keep.has(img)) await store.deleteImage(img);
  await store.saveProject(p);
  await keepOneFeatured(p);
  res.json(p);
}));

app.delete('/api/projects/:id', requireAdmin, wrap(async (req, res) => {
  const existing = await store.getProject(req.params.id);
  if (existing) {
    for (const img of imagesOf(existing)) await store.deleteImage(img);
    await store.deleteProject(existing.id);
  }
  res.json({ ok: true });
}));

app.post('/api/images', requireAdmin, wrap(async (req, res) => {
  const m = /^data:(image\/(jpeg|png|webp));base64,(.+)$/.exec(String((req.body && req.body.dataUrl) || ''));
  if (!m) return res.status(400).json({ error: 'Foto non valida: usa JPG, PNG o WebP.' });
  const buf = Buffer.from(m[3], 'base64');
  if (buf.length > 8 * 1024 * 1024) return res.status(413).json({ error: 'Foto troppo grande (massimo 8 MB).' });
  const id = newId();
  await store.saveImage(id, m[1], buf);
  res.status(201).json({ id });
}));

app.get('/img/:id', wrap(async (req, res) => {
  const img = await store.getImage(req.params.id);
  if (!img) return res.status(404).end();
  res.set('Content-Type', img.mime);
  res.set('Cache-Control', 'public, max-age=31536000, immutable');
  res.send(img.data);
}));

// Collezione di Alessio: set del catalogo che ha già e che vorrebbe
app.get('/api/collection', wrap(async (req, res) => res.json(await store.getCollection())));

app.put('/api/collection', requireAdmin, wrap(async (req, res) => {
  const list = (v) => [...new Set((Array.isArray(v) ? v : []).map((x) => str(x, 20)).filter(Boolean))].slice(0, 2000);
  const c = { owned: list(req.body && req.body.owned), wish: list(req.body && req.body.wish) };
  c.wish = c.wish.filter((x) => !c.owned.includes(x));
  await store.saveCollection(c);
  res.json(c);
}));

app.get('/api/messages', wrap(async (req, res) => {
  const wantsAll = req.query.all === '1';
  if (wantsAll) return requireAdmin(req, res, async () => res.json(await store.listMessages(true)));
  const list = await store.listMessages(false);
  res.json(list.map(({ id, name, text, createdAt }) => ({ id, name, text, createdAt })));
}));

const lastPost = new Map();
app.post('/api/messages', wrap(async (req, res) => {
  const ip = req.ip || 'x';
  const now = Date.now();
  if (now - (lastPost.get(ip) || 0) < 30000) return res.status(429).json({ error: 'Hai appena scritto: aspetta mezzo minuto prima di mandare un altro messaggio.' });
  const name = str(req.body && req.body.name, 40);
  const text = str(req.body && req.body.text, 600);
  if (!name || !text) return res.status(400).json({ error: 'Scrivi il tuo nome e il messaggio.' });
  lastPost.set(ip, now);
  await store.addMessage({ id: newId(), name, text, approved: false, createdAt: new Date().toISOString() });
  res.status(201).json({ ok: true });
}));

app.patch('/api/messages/:id', requireAdmin, wrap(async (req, res) => {
  await store.setMessageApproved(req.params.id, !!(req.body && req.body.approved));
  res.json({ ok: true });
}));

app.delete('/api/messages/:id', requireAdmin, wrap(async (req, res) => {
  await store.deleteMessage(req.params.id);
  res.json({ ok: true });
}));

store.init().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Passione Briks attivo sulla porta ${PORT} — archivio: ${process.env.DATABASE_URL ? 'PostgreSQL' : 'cartella ./data'}`);
    if (!ADMIN_PIN) console.log('Attenzione: imposta ADMIN_PIN per attivare l’area di Alessio.');
  });
}).catch((e) => { console.error('Avvio non riuscito:', e); process.exit(1); });
