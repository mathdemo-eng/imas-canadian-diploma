import { lazy, Suspense } from 'react';
import { createBrowserRouter, createMemoryRouter, type RouteObject } from 'react-router-dom';
import { Layout } from './components/Layout';
import { isPreviewBuild } from './lib/supabase';
import { AcademicPlan } from './pages/AcademicPlan';
import { AcademicYear } from './pages/AcademicYear';
import { Assessment } from './pages/Assessment';
import { Contact } from './pages/Contact';
import { Diploma } from './pages/Diploma';
import { Faq } from './pages/Faq';
import { Graduation } from './pages/Graduation';
import { Home } from './pages/Home';
import { NotFound } from './pages/NotFound';
import { Pathways } from './pages/Pathways';
import { StudentHub } from './pages/StudentHub';
import { Universities } from './pages/Universities';

const AdminApp = lazy(() => import('./admin/AdminApp'));

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'diploma', element: <Diploma /> },
      { path: 'pathways', element: <Pathways /> },
      { path: 'academic-plan', element: <AcademicPlan /> },
      { path: 'assessment', element: <Assessment /> },
      { path: 'graduation', element: <Graduation /> },
      { path: 'academic-year', element: <AcademicYear /> },
      { path: 'universities', element: <Universities /> },
      { path: 'student-hub', element: <StudentHub /> },
      { path: 'faq', element: <Faq /> },
      { path: 'contact', element: <Contact /> },
      { path: '*', element: <NotFound /> },
    ],
  },
  {
    path: '/admin/*',
    element: (
      <Suspense fallback={<p className="gutter py-16 text-center text-ink-3">Opening the admin panel…</p>}>
        <AdminApp />
      </Suspense>
    ),
  },
];

/**
 * The live site uses real addresses (/pathways, /academic-plan …).
 * Preview builds keep navigation in memory, so they work inside a private Artifact page.
 */
export function createAppRouter() {
  return isPreviewBuild ? createMemoryRouter(routes) : createBrowserRouter(routes);
}
