const sb = require('./_lib/supabase');

module.exports = async (req, res) => {
  try {
    const { error } = await sb.from('docs').select('id', { head: true, count: 'exact' });
    if (error) {
      console.error('[health] supabase error', error);
      return res.status(500).json({ ok: false, error: 'db', detail: error.message, code: error.code, hint: error.hint });
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('[health] exception', e);
    return res.status(500).json({ ok: false, error: 'exception', detail: String(e && e.message || e) });
  }
};
