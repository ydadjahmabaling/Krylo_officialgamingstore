const { load, save, genId } = require('../lib/db');
const { requireUser } = require('../lib/auth');
const { readBody, needMethod } = require('../lib/http');

module.exports = async (req, res) => {
  try {
    const db = load();

    if (req.method === 'GET') {
      const me = requireUser(req, res);
      if (!me) return;
      const nameOf = id => { const u = db.users.find(u => u.id === id); return u ? u.name : 'Deleted user'; };
      const messages = db.messages
        .filter(m => m.fromId === me.id || m.toId === me.id)
        .sort((a, b) => b.createdAt - a.createdAt)
        .map(m => {
          const item = db.items.find(i => i.id === m.itemId);
          return {
            id: m.id, itemId: m.itemId, itemTitle: item ? item.name : '(item removed)',
            itemThumbnail: item ? item.thumbnail : '',
            fromId: m.fromId, fromName: nameOf(m.fromId),
            toId: m.toId, toName: nameOf(m.toId),
            body: m.body, read: m.read, createdAt: m.createdAt,
            mine: m.fromId === me.id
          };
        });
      const unread = messages.filter(m => !m.mine && !m.read).length;
      return res.status(200).json({ messages, unread });
    }

    if (req.method === 'PATCH') {          // mark messages as read
      const me = requireUser(req, res);
      if (!me) return;
      const { ids } = await readBody(req);
      const set = new Set(Array.isArray(ids) ? ids : []);
      let n = 0;
      for (const m of db.messages) {
        if (set.has(m.id) && m.toId === me.id && !m.read) { m.read = true; n++; }
      }
      save();
      return res.status(200).json({ ok: true, marked: n });
    }

    if (!needMethod(req, res, 'POST')) return;
    const me = requireUser(req, res);
    if (!me) return;

    const { itemId, body, toId } = await readBody(req);
    const item = db.items.find(i => i.id === itemId);
    if (!item) return res.status(404).json({ error: 'Item not found' });
    const text = String(body || '').trim();
    if (!text || text.length > 1000) return res.status(400).json({ error: 'Message must be 1-1000 characters' });

    // Default recipient is the seller; the seller can reply to a buyer via toId
    let target = item.sellerId;
    if (me.id === item.sellerId && toId && db.users.some(u => u.id === toId)) target = toId;
    if (target === me.id) return res.status(400).json({ error: 'You cannot message yourself' });
    if (!db.users.some(u => u.id === target)) return res.status(404).json({ error: 'Recipient not found' });

    const msg = { id: genId(), itemId: item.id, fromId: me.id, toId: target, body: text, read: false, createdAt: Date.now() };
    db.messages.push(msg);
    save();
    res.status(201).json({ message: msg });
  } catch (e) { res.status(500).json({ error: e.message }); }
};
