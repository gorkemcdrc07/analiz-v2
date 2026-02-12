import { createClient } from "@supabase/supabase-js";

const url = process.env.REACT_APP_SUPABASE2_URL;
const key = process.env.REACT_APP_SUPABASE2_ANON_KEY;

console.log("[ENV2] URL:", url);
console.log("[ENV2] KEY exists:", !!key);

if (!url || !key) {
    throw new Error("Supabase ENV2 eksik: REACT_APP_SUPABASE2_URL / REACT_APP_SUPABASE2_ANON_KEY");
}

export const supabase2 = createClient(url, key);
