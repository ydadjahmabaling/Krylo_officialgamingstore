const { getSessionUser, publicUser } = require('../lib/auth');
module.exports = async (req, res) => {
  const u = getSessionUser(req);
  res.status(200).json({ user: publicUser(u) });
};
