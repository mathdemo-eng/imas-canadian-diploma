import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { CONTENT_KEY } from './content/hooks';
import { isPreviewBuild } from './lib/supabase';
import { createAppRouter } from './router';
import { applyPageMeta } from './seo';
import './styles.css';

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1 } },
});

// Pages built with their full text carry the content they were built from. Starting from it shows
// the same page straight away; marking it as old (updatedAt 0) makes the app fetch the latest
// content at once, so edits made in the admin panel still appear immediately.
const start = document.getElementById('start-content');
if (start?.textContent) {
  try {
    queryClient.setQueryData(CONTENT_KEY, JSON.parse(start.textContent), { updatedAt: 0 });
  } catch {
    /* unreadable: the app loads the content as usual */
  }
}

const router = createAppRouter();
// Each page gets its own title and description (search engines read them after the page loads).
if (!isPreviewBuild) {
  applyPageMeta(router.state.location.pathname);
  router.subscribe((state) => applyPageMeta(state.location.pathname));
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
