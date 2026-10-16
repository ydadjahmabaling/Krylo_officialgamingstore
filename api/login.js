const { load, verifyPassword } = require('../lib/db');
const { makeToken, setAuthCookie, publicUser } = require('../lib/auth');
const { readBody, needMethod } = require('../lib/http');

module.exports = async (req, res) => {
  try {
    if (!needMethod(req, res, 'POST')) return;
    const { email, password } = await readBody(req);
    const db = load();
    const user = db.users.find(u => u.email === String(email || '').trim().toLowerCase());
    if (!user || !verifyPassword(password, user.password))
      return res.status(401).json({ error: 'Wrong email or password' });
    setAuthCookie(res, makeToken(user.id));
    res.status(200).json({ user: publicUser(user) });
  } catch (e) { res.status(500).json({ error: e.message }); }
};
