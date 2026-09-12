// Supabase client singleton.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ??
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const MISSING_PLACEHOLDER =
  !SUPABASE_URL ||
  !SUPABASE_ANON_KEY ||
  SUPABASE_ANON_KEY.includes('your_supabase') ||
  SUPABASE_ANON_KEY.includes('test-key') ||
  SUPABASE_ANON_KEY.includes('placeholder');

if (MISSING_PLACEHOLDER) {
  console.error(
    '[MEVEST] Supabase is not configured. ' +
    'Copy .env.example to .env and set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY ' +
    'to the values from your Supabase project (https://supabase.com/dashboard).'
  );
}

export const supabase = createClient<Database>(
  SUPABASE_URL ?? 'https://placeholder.supabase.co',
  SUPABASE_ANON_KEY ?? 'public-anon-key',
  {
    auth: {
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

export function isSupabaseConfigured(): boolean {
  return !MISSING_PLACEHOLDER;
}