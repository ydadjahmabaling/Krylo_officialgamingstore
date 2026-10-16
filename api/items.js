const { load, save, genId } = require('../lib/db');
const { requireAdmin } = require('../lib/auth');
const { readBody, needMethod } = require('../lib/http');

const publicItem = i => ({
  id: i.id, name: i.name, description: i.description, priceCents: i.priceCents,
  thumbnail: i.thumbnail, sellerId: i.sellerId, sellerName: i.sellerName, createdAt: i.createdAt
});

module.exports = async (req, res) => {
  try {
    const db = load();

    if (req.method === 'GET') {
      const items = db.items
        .slice()
        .sort((a, b) => b.createdAt - a.createdAt)
        .map(publicItem);
      return res.status(200).json({ items });
    }

    if (!needMethod(req, res, 'POST')) return;
    const admin = requireAdmin(req, res);
    if (!admin) return;

    const { name, description, priceCents, thumbnail } = await readBody(req);
    const n = String(name || '').trim();
    const price = Number(priceCents);
    const desc = String(description || '').trim();
    const th = String(thumbnail || '').trim();

    if (n.length < 2 || n.length > 80) return res.status(400).json({ error: 'Name must be 2-80 characters' });
    if (!Number.isInteger(price) || price < 1 || price > 100000000)
      return res.status(400).json({ error: 'Price must be a positive amount in cents' });
    if (desc.length > 2000) return res.status(400).json({ error: 'Description too long' });
    if (!/^(data:image\/|https?:\/\/)/i.test(th)) return res.status(400).json({ error: 'Thumbnail must be an image URL or an uploaded image' });
    if (th.length > 800000) return res.status(400).json({ error: 'Thumbnail image is too large (max ~500KB)' });

    const item = {
      id: genId(), name: n, description: desc, priceCents: price, thumbnail: th,
      sellerId: admin.id, sellerName: admin.name, createdAt: Date.now()
    };
    db.items.push(item);
    save();
    res.status(201).json({ item: publicItem(item) });
  } catch (e) { res.status(500).json({ error: e.message }); }
};
