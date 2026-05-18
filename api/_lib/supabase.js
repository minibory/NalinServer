const { createClient } = require('@supabase/supabase-js');

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.warn('[nalin] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 환경변수가 비어 있습니다.');
}

const sb = createClient(url || '', serviceKey || '', {
  auth: { persistSession: false, autoRefreshToken: false },
});

module.exports = sb;
