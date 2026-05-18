const sb = require('../../_lib/supabase');
const { verify } = require('../../_lib/auth');
const { validId } = require('../../_lib/ids');
const { reshape, readJson, BUCKET } = require('../../_lib/reshape');

module.exports = async (req, res) => {
  const id = (req.query && req.query.id) || '';
  if (!validId(id)) return res.status(400).json({ error: 'bad id' });

  if (req.method === 'GET') {
    const { data, error } = await sb.from('docs')
      .select('id,template_id,values,status,signer_name,signature_path,created_at,signed_at')
      .eq('id', id)
      .maybeSingle();
    if (error) return res.status(500).json({ error: 'db' });
    if (!data) return res.status(404).json({ error: 'not found' });
    return res.json(reshape(data, { includeSignature: true }));
  }

  if (req.method === 'PUT') {
    if (!verify(req)) return res.status(401).json({ error: 'unauthorized' });
    const { values } = readJson(req);
    const { data: existing, error: readErr } = await sb.from('docs')
      .select('status').eq('id', id).maybeSingle();
    if (readErr) return res.status(500).json({ error: 'db' });
    if (!existing) return res.status(404).json({ error: 'not found' });
    if (existing.status === 'signed') return res.status(409).json({ error: 'already signed' });

    const { data, error } = await sb.from('docs')
      .update({ values: values || {} })
      .eq('id', id)
      .eq('status', 'pending')
      .select('id,template_id,values,status,signer_name,signature_path,created_at,signed_at')
      .single();
    if (error) return res.status(500).json({ error: 'db' });
    return res.json(reshape(data, { includeSignature: true }));
  }

  if (req.method === 'DELETE') {
    if (!verify(req)) return res.status(401).json({ error: 'unauthorized' });
    await sb.storage.from(BUCKET).remove([`${id}.png`]).catch(() => {});
    const { error } = await sb.from('docs').delete().eq('id', id);
    if (error) return res.status(500).json({ error: 'db' });
    return res.json({ ok: true });
  }

  res.setHeader('Allow', 'GET, PUT, DELETE');
  return res.status(405).json({ error: 'method not allowed' });
};
