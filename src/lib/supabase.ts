import type { SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** True on preview builds (private Artifact link): always read-only built-in content. */
export const isPreviewBuild = import.meta.env.VITE_PREVIEW_BUILD === 'true';

/** True when the site is connected to its Supabase database. */
export const supabaseConfigured = Boolean(url && anonKey) && !isPreviewBuild;

let client: Promise<SupabaseClient> | null = null;

/** The Supabase client, loaded only when the site is connected to a database. */
export function getSupabase(): Promise<SupabaseClient> {
  if (!supabaseConfigured) {
    return Promise.reject(new Error('Supabase is not configured for this site.'));
  }
  client ??= import('@supabase/supabase-js').then(({ createClient }) =>
    createClient(url!, anonKey!, { auth: { persistSession: true, detectSessionInUrl: true } }),
  );
  return client;
}
