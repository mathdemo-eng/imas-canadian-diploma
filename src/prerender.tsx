// Renders the public chapters to HTML when the site is built (see scripts/prerender.mjs), so search
// engines and AI assistants that don't run JavaScript still read each page's full text. Visitors'
// browsers then start the app as usual, using the same content, so the page doesn't change.

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderToString } from 'react-dom/server';
import { createStaticHandler, createStaticRouter, StaticRouterProvider } from 'react-router-dom/server';
import { CONTENT_KEY } from './content/hooks';
import type { ContentBundle } from './content/types';
import { routes } from './router';

export { CHAPTERS } from './chapters';
export { loadContent } from './content/source';

export async function renderPage(path: string, content: ContentBundle): Promise<string> {
  const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } });
  queryClient.setQueryData(CONTENT_KEY, content);
  const handler = createStaticHandler(routes);
  const context = await handler.query(new Request(`https://prerender.local${path}`));
  if (context instanceof Response) throw new Error(`${path} redirected instead of rendering`);
  const router = createStaticRouter(handler.dataRoutes, context);
  return renderToString(
    <QueryClientProvider client={queryClient}>
      <StaticRouterProvider router={router} context={context} hydrate={false} />
    </QueryClientProvider>,
  );
}
