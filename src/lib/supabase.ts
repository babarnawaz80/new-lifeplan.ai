import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Browser-safe: the anon key is public by design. Persistence is optional —
// if env vars are absent the app falls back to in-memory only (no crash).
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const persistenceEnabled = Boolean(url && anon);

export const supabase: SupabaseClient | null = persistenceEnabled
  ? createClient(url as string, anon as string, { auth: { persistSession: false } })
  : null;
