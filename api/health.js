const { load } = require('../lib/db');
module.exports = async (req, res) => {
  let dbStatus = 'ok';
  try { load(); } catch (e) { dbStatus = e.message; }
  res.status(200).json({ ok: true, db: dbStatus, time: Date.now() });
};
