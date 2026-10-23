import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { isPreviewBuild } from './lib/supabase';
import { createAppRouter } from './router';
import { applyPageMeta } from './seo';
import './styles.css';

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1 } },
});

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
