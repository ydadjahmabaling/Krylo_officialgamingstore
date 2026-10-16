// Small request/response helpers shared by all API routes
function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', c => {
      data += c;
      if (data.length > 2_000_000) { reject(new Error('Payload too large')); req.destroy(); }
    });
    req.on('end', () => {
      if (!data) return resolve({});
      try { resolve(JSON.parse(data)); } catch { reject(new Error('Invalid JSON body')); }
    });
    req.on('error', reject);
  });
}

function needMethod(req, res, m) {
  if (req.method !== m) { res.status(405).json({ error: `Method ${req.method} not allowed` }); return false; }
  return true;
}

module.exports = { readBody, needMethod };
