const { load, save } = require('../lib/db');
const { requireAdmin } = require('../lib/auth');
const { readBody } = require('../lib/http');

const publicItem = i => ({
  id: i.id, name: i.name, description: i.description, priceCents: i.priceCents,
  thumbnail: i.thumbnail, sellerId: i.sellerId, sellerName: i.sellerName, createdAt: i.createdAt
});

module.exports = async (req, res) => {
  try {
    const db = load();
    const id = String((req.query && req.query.id) || '');
    const item = db.items.find(i => i.id === id);
    if (!item) return res.status(404).json({ error: 'Item not found' });

    if (req.method === 'GET') return res.status(200).json({ item: publicItem(item) });

    if (req.method === 'PUT' || req.method === 'PATCH') {
      const admin = requireAdmin(req, res);
      if (!admin) return;
      const { name, description, priceCents, thumbnail } = await readBody(req);
      if (name !== undefined) {
        const n = String(name).trim();
        if (n.length < 2 || n.length > 80) return res.status(400).json({ error: 'Name must be 2-80 characters' });
        item.name = n;
      }
      if (description !== undefined) item.description = String(description).slice(0, 2000);
      if (priceCents !== undefined) {
        const price = Number(priceCents);
        if (!Number.isInteger(price) || price < 1) return res.status(400).json({ error: 'Invalid price' });
        item.priceCents = price;
      }
      if (thumbnail !== undefined) {
        const th = String(thumbnail).trim();
        if (!/^(data:image\/|https?:\/\/)/i.test(th) || th.length > 800000)
          return res.status(400).json({ error: 'Invalid thumbnail' });
        item.thumbnail = th;
      }
      save();
      return res.status(200).json({ item: publicItem(item) });
    }

    if (req.method === 'DELETE') {
      const admin = requireAdmin(req, res);
      if (!admin) return;
      db.items = db.items.filter(i => i.id !== item.id);
      db.messages = db.messages.filter(m => m.itemId !== item.id);
      save();
      return res.status(200).json({ ok: true });
    }

    res.status(405).json({ error: `Method ${req.method} not allowed` });
  } catch (e) { res.status(500).json({ error: e.message }); }
};
