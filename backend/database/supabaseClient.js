// ============================================================
// Supabase JS Client Instance
// ------------------------------------------------------------
// Initializes official @supabase/supabase-js client using
// SUPABASE_URL and SUPABASE_SECRET_KEY / SUPABASE_PUBLISHABLE_KEY.
// ============================================================

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || '';

let supabase = null;

if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
  console.log('✅ Supabase JS client initialized');
} else {
  console.log('ℹ️ Supabase JS client not initialized (SUPABASE_URL or Key missing in .env)');
}

module.exports = { supabase };
