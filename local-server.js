// Local dev server (no dependencies). For Vercel, the api/ folder is used directly.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { parse } = require('url');

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.webp': 'image/webp'
};

function helpers(res) {
  res.status = code => { res.statusCode = code; return res; };
  res.json = body => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(body)); return res; };
}

async function routeApi(req, res, u) {
  const p = u.pathname;
  const map = {
    '/api/register': './api/register',
    '/api/login': './api/login',
    '/api/logout': './api/logout',
    '/api/me': './api/me',
    '/api/items': './api/items',
    '/api/item': './api/item',
    '/api/health': './api/health',
    '/api/messages': './api/messages',
  };
  try {
    if (map[p]) return await require(map[p])(req, res);
    res.status(404).json({ error: 'API route not found' });
  } catch (e) { res.status(500).json({ error: e.message }); }
}

const server = http.createServer(async (req, res) => {
  helpers(res);
  const u = parse(req.url, true);
  req.query = u.query;

  if (u.pathname.startsWith('/api/')) return routeApi(req, res, u);

  const rel = u.pathname === '/' ? '/index.html' : decodeURIComponent(u.pathname);
  const file = path.normalize(path.join(ROOT, rel));
  if (!file.startsWith(ROOT)) return res.status(403).json({ error: 'Forbidden' });

  fs.readFile(file, (err, data) => {
    if (err) return res.status(404).json({ error: 'Not found' });
    res.setHeader('Content-Type', MIME[path.extname(file).toLowerCase()] || 'application/octet-stream');
    res.end(data);
  });
});

server.listen(PORT, () => console.log(`Krylo Market running at http://localhost:${PORT}`));
