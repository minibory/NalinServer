const { issue, ADMIN_PW } = require('./_lib/auth');
const { readJson } = require('./_lib/reshape');

module.exports = (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method not allowed' });
  }
  const { password } = readJson(req);
  if (!ADMIN_PW) return res.status(500).json({ error: 'server not configured' });
  if (password && password === ADMIN_PW) {
    try { return res.json({ token: issue() }); }
    catch (e) { return res.status(500).json({ error: 'server not configured' }); }
  }
  return res.status(401).json({ error: 'bad password' });
};
