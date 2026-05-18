const sb = require('./supabase');

const BUCKET = 'signatures';

function publicUrl(path) {
  if (!path) return '';
  const { data } = sb.storage.from(BUCKET).getPublicUrl(path);
  return (data && data.publicUrl) || '';
}

function reshape(row, { includeSignature = false } = {}) {
  if (!row) return null;
  return {
    id: row.id,
    templateId: row.template_id,
    values: row.values || {},
    status: row.status,
    signerName: row.signer_name || '',
    signatureDataUrl: includeSignature ? publicUrl(row.signature_path) : '',
    createdAt: row.created_at ? new Date(row.created_at).getTime() : 0,
    signedAt: row.signed_at ? new Date(row.signed_at).getTime() : null,
  };
}

function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch (_) { return {}; }
  }
  return {};
}

module.exports = { reshape, publicUrl, readJson, BUCKET };
