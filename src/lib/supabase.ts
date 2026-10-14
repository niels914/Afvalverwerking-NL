import { createClient } from '@supabase/supabase-js';

// Supabase-client voor inloggen en ledendata. De publishable key is openbaar bedoeld:
// toegang tot data wordt afgedwongen met Row Level Security in de database.
const url = import.meta.env.VITE_SUPABASE_URL ?? 'https://mnwynrioozcqqvhelqku.supabase.co';
const sleutel = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? 'sb_publishable_I2RWzqXGfpTNOzamSLvCEw_ohby-4LM';

export const supabase = createClient(url, sleutel, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});
