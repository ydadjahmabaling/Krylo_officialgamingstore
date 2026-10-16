// JSON-file database. Works out of the box locally and on Vercel (ephemeral /tmp).
// For permanent production data on Vercel, point KRYLO_DATA_DIR at persistent storage
// or swap this module for Vercel Postgres / Neon / Supabase (same function signatures).
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = process.env.KRYLO_DATA_DIR ||
  (process.env.VERCEL ? '/tmp/krylo-data' : path.join(process.cwd(), 'data'));
const DB_FILE = path.join(DATA_DIR, 'db.json');

/* ---------- passwords (scrypt, no external deps) ---------- */
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return salt + ':' + hash;
}
function verifyPassword(password, stored) {
  try {
    const [salt, hash] = String(stored).split(':');
    const test = crypto.scryptSync(String(password), salt, 64);
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), test);
  } catch { return false; }
}

const genId = () => crypto.randomBytes(10).toString('hex');

/* ---------- seed thumbnails (inline SVG so demo works with zero uploads) ---------- */
const thumb = (txt, c1, c2) =>
  'data:image/svg+xml;utf8,' + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360">
      <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/>
      </linearGradient></defs>
      <rect width="640" height="360" fill="url(#g)"/>
      <circle cx="560" cy="60" r="90" fill="rgba(255,255,255,0.08)"/>
      <text x="50%" y="56%" font-family="Arial Black, Arial, sans-serif" font-size="44"
        fill="#ffffff" text-anchor="middle" font-weight="900">${txt}</text>
    </svg>`);

/* ---------- load / save ---------- */
let db = null;
function load() {
  if (db) return db;
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    if (fs.existsSync(DB_FILE)) {
      db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
      return db;
    }
  } catch { /* read-only fs (some serverless setups) -> fall back to memory */ }
  const now = Date.now();
  db = {
    users: [{
      id: 'admin',
      name: 'Krylo Admin',
      email: process.env.ADMIN_EMAIL || 'admin@krylo.market',
      password: hashPassword(process.env.ADMIN_PASSWORD || 'admin123'),
      role: 'admin',
      createdAt: now
    }],
    items: [
      { id: genId(), name: 'Rainbow Periastron Omega', priceCents: 1299,
        description: 'Limited-edition rainbow sword bundle for your avatar. Instant delivery after purchase confirmation.',
        thumbnail: thumb('Rainbow Periastron', '#7c3aed', '#06b6d4'),
        sellerId: 'admin', sellerName: 'Krylo Market', createdAt: now - 86400000 * 4 },
      { id: genId(), name: 'Korblox Deathspeaker', priceCents: 2499,
        description: 'The iconic skeletal package. Rare, verified and trade-ready. Message us after checkout.',
        thumbnail: thumb('Korblox', '#0ea5e9', '#1e293b'),
        sellerId: 'admin', sellerName: 'Krylo Market', createdAt: now - 86400000 * 3 },
      { id: genId(), name: 'Headless Horseman', priceCents: 3999,
        description: 'Halloween classic. Includes full avatar setup support via our messaging system.',
        thumbnail: thumb('Headless', '#f97316', '#7c2d12'),
        sellerId: 'admin', sellerName: 'Krylo Market', createdAt: now - 86400000 * 2 },
      { id: genId(), name: 'Dominus Aureus', priceCents: 9999,
        description: 'Crowned dominus series. Premium tier listing — contact seller to arrange secure transfer.',
        thumbnail: thumb('Dominus', '#eab308', '#713f12'),
        sellerId: 'admin', sellerName: 'Krylo Market', createdAt: now - 86400000 },
    ],
    messages: []
  };
  try { save(); } catch { /* stay in-memory */ }
  return db;
}

function save() {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const tmp = DB_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(db));
    fs.renameSync(tmp, DB_FILE);
  } catch { /* read-only fs: keep running with in-memory data */ }
}

module.exports = { load, save, genId, hashPassword, verifyPassword, DATA_DIR };
