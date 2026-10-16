import { getSupabase, supabaseConfigured } from '../lib/supabase';
import { seedBundle } from './seed';
import type { CollectionKey, ContentBundle, Settings } from './types';

/** Collection key → database table. They share names so the mapping stays obvious. */
export const TABLES: Record<CollectionKey, string> = {
  courses: 'courses',
  tracks: 'tracks',
  placements: 'placements',
  partners: 'partners',
  faqs: 'faqs',
  announcements: 'announcements',
  documents: 'documents',
};

const ORDER: Record<CollectionKey, string> = {
  courses: 'sort',
  tracks: 'sort',
  placements: 'slot',
  partners: 'sort',
  faqs: 'sort',
  announcements: 'published_at',
  documents: 'sort',
};

/** A fresh copy of the built-in content, so edits in demo mode never touch the seed. */
export function seedContent(): ContentBundle {
  return structuredClone(seedBundle);
}

/**
 * Loads all site content. Reads from Supabase when the site is connected;
 * otherwise returns the built-in content that ships with the site. If the database
 * can't be reached, visitors still see the built-in content and the admin panel
 * shows the error.
 */
export async function loadContent(): Promise<ContentBundle> {
  if (!supabaseConfigured) return { ...seedContent(), source: 'built-in' };
  try {
    return { ...(await loadFromDatabase()), source: 'database' };
  } catch (e) {
    console.error('Could not load content from the database', e);
    return { ...seedContent(), source: 'built-in', loadError: e instanceof Error ? e.message : String(e) };
  }
}

async function loadFromDatabase(): Promise<ContentBundle> {
  const sb = await getSupabase();
  const keys = Object.keys(TABLES) as CollectionKey[];
  const [settingsRes, ...results] = await Promise.all([
    sb.from('site_settings').select('data').eq('id', 1).maybeSingle(),
    ...keys.map((k) =>
      sb
        .from(TABLES[k])
        .select('*')
        .order(ORDER[k], { ascending: k !== 'announcements' }),
    ),
  ]);

  const failed = [settingsRes, ...results].find((r) => r.error);
  if (failed?.error) throw new Error(failed.error.message);

  const bundle = { settings: mergeSettings(settingsRes.data?.data) } as ContentBundle;
  keys.forEach((k, i) => {
    (bundle as unknown as Record<string, unknown>)[k] = results[i].data ?? [];
  });
  return bundle;
}

/** Fills any missing settings from the built-in defaults. */
export function mergeSettings(data: Partial<Settings> | null | undefined): Settings {
  return { ...seedBundle.settings, ...(data ?? {}) };
}

export async function saveRow(key: CollectionKey, row: { id: string }) {
  const sb = await getSupabase();
  const { error } = await sb.from(TABLES[key]).upsert(row);
  if (error) throw new Error(error.message);
}

export async function deleteRow(key: CollectionKey, id: string) {
  const sb = await getSupabase();
  const { error } = await sb.from(TABLES[key]).delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function saveSettings(settings: Settings) {
  const sb = await getSupabase();
  const { error } = await sb.from('site_settings').upsert({ id: 1, data: settings });
  if (error) throw new Error(error.message);
}
