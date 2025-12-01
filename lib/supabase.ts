import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.local.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.local.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase URL or Anonymous Key is missing");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
