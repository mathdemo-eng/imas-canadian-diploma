import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { loadContent } from './source';
import type { ContentBundle } from './types';

export const CONTENT_KEY = ['content'] as const;

/** Everything, including unpublished rows (for the admin panel). */
export function useAllContent() {
  return useQuery<ContentBundle>({
    queryKey: CONTENT_KEY,
    queryFn: loadContent,
    staleTime: 5 * 60_000,
  });
}

/** What visitors see: published rows only, in display order. */
export function useContent(): ContentBundle | undefined {
  const { data } = useAllContent();
  return useMemo(() => {
    if (!data) return undefined;
    const bySort = <T extends { sort: number }>(a: T, b: T) => a.sort - b.sort;
    return {
      ...data,
      courses: [...data.courses].sort(bySort),
      tracks: [...data.tracks].sort(bySort),
      partners: data.partners.filter((p) => p.published).sort(bySort),
      faqs: data.faqs.filter((f) => f.published).sort(bySort),
      documents: data.documents.filter((d) => d.published).sort(bySort),
      announcements: data.announcements
        .filter((a) => a.published)
        .sort((a, b) => b.published_at.localeCompare(a.published_at)),
    };
  }, [data]);
}
