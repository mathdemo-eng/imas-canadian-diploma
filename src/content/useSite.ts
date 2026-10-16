import { useContent } from './hooks';
import type { ContentBundle } from './types';

/**
 * Site content for pages. The layout only renders pages once content has loaded,
 * so pages can rely on it being present.
 */
export function useSite(): ContentBundle {
  const content = useContent();
  if (!content) throw new Error('Site content is not loaded yet.');
  return content;
}
