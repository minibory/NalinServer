const sb = require('../../_lib/supabase');
const { validId } = require('../../_lib/ids');
const { reshape, readJson, BUCKET } = require('../../_lib/reshape');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method not allowed' });
  }

  const id = (req.query && req.query.id) || '';
  if (!validId(id)) return res.status(400).json({ error: 'bad id' });

  const { signerName, signatureDataUrl } = readJson(req);
  if (!signatureDataUrl) return res.status(400).json({ error: 'signature required' });
  const m = String(signatureDataUrl).match(/^data:image\/png;base64,(.+)$/);
  if (!m) return res.status(400).json({ error: 'bad signature format' });

  const { data: existing, error: readErr } = await sb.from('docs')
    .select('id,status,values')
    .eq('id', id)
    .maybeSingle();
  if (readErr) { console.error('[sign] read db error', readErr); return res.status(500).json({ error: 'db', detail: readErr.message, code: readErr.code, hint: readErr.hint }); }
  if (!existing) return res.status(404).json({ error: 'not found' });
  if (existing.status === 'signed') return res.status(409).json({ error: 'already signed' });

  const buf = Buffer.from(m[1], 'base64');
  const path = `${id}.png`;
  const { error: upErr } = await sb.storage.from(BUCKET)
    .upload(path, buf, { contentType: 'image/png', upsert: true });
  if (upErr) return res.status(500).json({ error: 'upload', detail: upErr.message });

  const fallbackName = (existing.values && existing.values.applicant) || '신청자';
  const { data, error } = await sb.from('docs')
    .update({
      status: 'signed',
      signer_name: signerName || fallbackName,
      signature_path: path,
      signed_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('status', 'pending')
    .select('id,template_id,values,status,signer_name,signature_path,created_at,signed_at')
    .single();

  if (error) { console.error('[sign] update db error', error); return res.status(500).json({ error: 'db', detail: error.message, code: error.code, hint: error.hint }); }
  return res.json(reshape(data, { includeSignature: true }));
};
