const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || '';
const ADMIN_PW = process.env.ADMIN_PASSWORD || '';

function issue() {
  if (!SECRET) throw new Error('JWT_SECRET not configured');
  return jwt.sign({ role: 'admin' }, SECRET, { expiresIn: '7d' });
}

function verify(req) {
  if (!SECRET) return false;
  const h = req.headers.authorization || '';
  const t = h.startsWith('Bearer ') ? h.slice(7) : '';
  if (!t) return false;
  try {
    const payload = jwt.verify(t, SECRET);
    return payload && payload.role === 'admin';
  } catch (_) {
    return false;
  }
}

module.exports = { issue, verify, ADMIN_PW };
