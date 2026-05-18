const sb = require('../_lib/supabase');
const { verify } = require('../_lib/auth');
const { genId } = require('../_lib/ids');
const { reshape, readJson } = require('../_lib/reshape');

module.exports = async (req, res) => {
  if (!verify(req)) return res.status(401).json({ error: 'unauthorized' });

  if (req.method === 'GET') {
    const { data, error } = await sb
      .from('docs')
      .select('id,template_id,values,status,signer_name,created_at,signed_at')
      .order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: 'db' });
    return res.json(data.map(r => reshape(r, { includeSignature: false })));
  }

  if (req.method === 'POST') {
    const { templateId, values } = readJson(req);
    if (!templateId) return res.status(400).json({ error: 'templateId required' });
    let id = null;
    for (let attempt = 0; attempt < 6; attempt++) {
      const candidate = genId();
      const { count, error } = await sb.from('docs')
        .select('id', { count: 'exact', head: true })
        .eq('id', candidate);
      if (error) return res.status(500).json({ error: 'db' });
      if ((count || 0) === 0) { id = candidate; break; }
    }
    if (!id) return res.status(500).json({ error: 'id collision' });

    const { data, error } = await sb.from('docs')
      .insert({ id, template_id: templateId, values: values || {} })
      .select('id,template_id,values,status,signer_name,created_at,signed_at')
      .single();
    if (error) return res.status(500).json({ error: 'db' });
    return res.json(reshape(data, { includeSignature: false }));
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'method not allowed' });
};
