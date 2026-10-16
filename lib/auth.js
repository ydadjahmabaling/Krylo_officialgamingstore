// Cookie-session auth using HMAC-signed tokens (no external deps)
const crypto = require('crypto');
const { load } = require('./db');

const SECRET = process.env.KRYLO_SECRET || 'krylo-dev-secret-change-me';
const COOKIE = 'krylo_token';
const WEEK = 60 * 60 * 24 * 7;

const sign = v => crypto.createHmac('sha256', SECRET).update(v).digest('hex');

function makeToken(userId) {
  const payload = `${userId}.${Date.now() + WEEK * 1000}`;
  return `${payload}.${sign(payload)}`;
}

function readToken(token) {
  if (!token) return null;
  const parts = String(token).split('.');
  if (parts.length !== 3) return null;
  const [userId, exp, sig] = parts;
  if (sig !== sign(`${userId}.${exp}`)) return null;
  if (Number(exp) < Date.now()) return null;
  return userId;
}

function parseCookies(req) {
  const out = {};
  const raw = req.headers.cookie || '';
  for (const part of raw.split(';')) {
    const i = part.indexOf('=');
    if (i > -1) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

function setAuthCookie(res, token) {
  res.setHeader('Set-Cookie',
    `${COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${WEEK}`);
}
function clearAuthCookie(res) {
  res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
}

function publicUser(u) {
  return u ? { id: u.id, name: u.name, email: u.email, role: u.role, createdAt: u.createdAt } : null;
}

function getSessionUser(req) {
  const id = readToken(parseCookies(req)[COOKIE]);
  if (!id) return null;
  return load().users.find(u => u.id === id) || null;
}

function requireUser(req, res) {
  const u = getSessionUser(req);
  if (!u) { res.status(401).json({ error: 'You must be logged in' }); return null; }
  return u;
}

function requireAdmin(req, res) {
  const u = requireUser(req, res);
  if (!u) return null;
  if (u.role !== 'admin') { res.status(403).json({ error: 'Admin access required' }); return null; }
  return u;
}

module.exports = { makeToken, setAuthCookie, clearAuthCookie, getSessionUser, requireUser, requireAdmin, publicUser, parseCookies };
