import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

console.log('[ENV] REACT_APP_SUPABASE_URL:', supabaseUrl);
console.log('[ENV] REACT_APP_SUPABASE_ANON_KEY exists:', !!supabaseAnonKey);

if (!supabaseUrl) throw new Error('REACT_APP_SUPABASE_URL eksik (.env) ve restart þart');
if (!supabaseAnonKey) throw new Error('REACT_APP_SUPABASE_ANON_KEY eksik (.env) ve restart þart');

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
