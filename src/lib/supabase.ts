import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * The Project URL, accepting common slips when it was pasted into Netlify: just the project ID
 * ("abcdefghijkl" → https://abcdefghijkl.supabase.co), no https://, or a trailing /rest/v1.
 */
export function normaliseSupabaseUrl(raw: string | undefined): string | undefined {
  const v = raw?.trim().replace(/\/+$/, '').replace(/\/(rest|auth)\/v1$/i, '');
  if (!v) return undefined;
  if (/^[a-z0-9]{15,40}$/i.test(v)) return `https://${v.toLowerCase()}.supabase.co`;
  if (!/^https?:\/\//i.test(v)) return `https://${v}`;
  return v;
}

const url = normaliseSupabaseUrl(import.meta.env.VITE_SUPABASE_URL as string | undefined);
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();

/** True on preview builds (private Artifact link): always read-only built-in content. */
export const isPreviewBuild = import.meta.env.VITE_PREVIEW_BUILD === 'true';

/** The database address the site was built with (e.g. abcd.supabase.co), for error messages. */
export const supabaseTarget = (() => {
  if (!url) return '';
  try {
    return new URL(url).host || url;
  } catch {
    return url.length > 60 ? `${url.slice(0, 60)}…` : url;
  }
})();

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
