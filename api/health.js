const sb = require('./_lib/supabase');

module.exports = async (req, res) => {
  try {
    const { error } = await sb.from('docs').select('id', { head: true, count: 'exact' });
    if (error) return res.status(500).json({ ok: false, error: 'db' });
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ ok: false, error: 'exception' });
  }
};
