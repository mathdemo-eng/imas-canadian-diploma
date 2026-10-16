import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { CONTENT_KEY } from '../content/hooks';
import { deleteRow, loadContent, saveRow, saveSettings } from '../content/source';
import type { CollectionKey, ContentBundle, Settings } from '../content/types';
import { supabaseConfigured } from '../lib/supabase';

type Row = { id: string } & Record<string, unknown>;

/**
 * Saves and deletes content. Connected to the database, changes are written there first.
 * In demo mode they only update what this browser shows, until the page is reloaded.
 */
export function useContentEditor() {
  const qc = useQueryClient();

  const patch = useCallback(
    (fn: (b: ContentBundle) => ContentBundle) => qc.setQueryData<ContentBundle>(CONTENT_KEY, (b) => (b ? fn(b) : b)),
    [qc],
  );

  const save = useCallback(
    async (key: CollectionKey, row: Row) => {
      if (supabaseConfigured) await saveRow(key, row);
      patch((b) => {
        const list = b[key] as unknown as Row[];
        const exists = list.some((r) => r.id === row.id);
        const next = exists ? list.map((r) => (r.id === row.id ? row : r)) : [...list, row];
        return { ...b, [key]: next };
      });
    },
    [patch],
  );

  const remove = useCallback(
    async (key: CollectionKey, id: string) => {
      if (supabaseConfigured) await deleteRow(key, id);
      patch((b) => {
        const next: ContentBundle = { ...b, [key]: (b[key] as unknown as Row[]).filter((r) => r.id !== id) };
        // Removing a course or track also removes its subject placements, as the database does.
        if (key === 'courses') next.placements = b.placements.filter((p) => p.course_id !== id);
        if (key === 'tracks') next.placements = b.placements.filter((p) => p.track_id !== id);
        return next;
      });
    },
    [patch],
  );

  const saveSiteSettings = useCallback(
    async (settings: Settings) => {
      if (supabaseConfigured) await saveSettings(settings);
      patch((b) => ({ ...b, settings }));
    },
    [patch],
  );

  return { save, remove, saveSiteSettings };
}

/** Downloads every piece of site content as one JSON file. */
export async function downloadBackup(current: ContentBundle) {
  const bundle = supabaseConfigured ? await loadContent() : current;
  const { source: _s, loadError: _e, ...data } = bundle;
  const blob = new Blob([JSON.stringify({ exported_at: new Date().toISOString(), ...data }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `canadian-diploma-content-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
