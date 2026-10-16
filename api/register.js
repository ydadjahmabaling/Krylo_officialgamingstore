const { load, save, genId, hashPassword } = require('../lib/db');
const { makeToken, setAuthCookie, publicUser } = require('../lib/auth');
const { readBody, needMethod } = require('../lib/http');

module.exports = async (req, res) => {
  try {
    if (!needMethod(req, res, 'POST')) return;
    const { name, email, password } = await readBody(req);
    const n = String(name || '').trim();
    const e = String(email || '').trim().toLowerCase();
    const p = String(password || '');
    if (n.length < 2 || n.length > 40) return res.status(400).json({ error: 'Name must be 2-40 characters' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return res.status(400).json({ error: 'Invalid email address' });
    if (p.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

    const db = load();
    if (db.users.some(u => u.email === e)) return res.status(409).json({ error: 'Email already registered' });

    const user = { id: genId(), name: n, email: e, password: hashPassword(p), role: 'user', createdAt: Date.now() };
    db.users.push(user);
    save();
    setAuthCookie(res, makeToken(user.id));
    res.status(201).json({ user: publicUser(user) });
  } catch (e) { res.status(500).json({ error: e.message }); }
};
