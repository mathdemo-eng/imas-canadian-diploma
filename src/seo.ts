// What search engines and link previews show for each page: the title (the blue headline in
// Google) and the description (the grey text under it). They use the words people search for,
// such as "Canadian high school diploma Malaysia". The build also writes them into each page's
// HTML (see vite.config.ts), so they are there before any script runs.

export const SITE_NAME = 'IMAS Canadian Diploma';
/** The name Google shows above the page title in results (its "site name"). */
export const ORG_NAME = 'IMAS International School';

export interface PageSeo {
  title: string;
  description: string;
}

export const PAGE_SEO: Record<string, PageSeo> = {
  '/': {
    title: 'Canadian High School Diploma in Malaysia | IMAS International School',
    description:
      'Earn the official New Brunswick (Canada) High School Diploma at IMAS International School, the first school in Malaysia accredited by New Brunswick. CAN or the Dual Program (IGCSE + Canadian diploma), from Grade 10 or 11.',
  },
  '/diploma': {
    title: 'The New Brunswick Canadian Diploma | IMAS Malaysia',
    description:
      'What the New Brunswick High School Diploma is, how IMAS is accredited to teach it, and its recognition in Malaysia by the Ministry of Education and the MQA.',
  },
  '/pathways': {
    title: 'CAN and Dual Program (IGCSE + Canadian Diploma) | IMAS',
    description:
      'Two routes to the Canadian high school diploma at IMAS: CAN, or the Dual Program with IGCSE. Join in Grade 10 or Grade 11; see the entry requirements.',
  },
  '/academic-plan': {
    title: 'Canadian Diploma Subjects, Grade 10 to 12 | IMAS',
    description:
      'Every subject in the CAN and Dual Program cohorts at IMAS, from Grade 10 to Grade 12, semester by semester, with New Brunswick course numbers.',
  },
  '/assessment': {
    title: 'How Canadian Diploma Courses Are Marked | IMAS',
    description:
      'Assessment in the Canadian Diploma at IMAS: 60% continuous assessment and a 40% final exam, no midterms, and the pass mark and attendance you need.',
  },
  '/graduation': {
    title: 'Canadian Diploma Graduation Requirements | IMAS',
    description:
      'What you need to earn the New Brunswick High School Diploma at IMAS: credit-hours, a pass in every course, Grade 12 courses, IELTS band 6 and a Career Life Plan.',
  },
  '/academic-year': {
    title: 'The Canadian Diploma Academic Year | IMAS',
    description: 'The IMAS Canadian Diploma year: Semester 1 from September to February and Semester 2 from March to July.',
  },
  '/universities': {
    title: 'Universities & Scholarships for Canadian Diploma Graduates | IMAS',
    description:
      'Where the New Brunswick diploma can take you: partner universities St. Thomas, Mount Allison and Saint Mary’s in Canada, scholarships, and universities in Malaysia and worldwide.',
  },
  '/student-hub': {
    title: 'Student Hub | IMAS Canadian Diploma',
    description: 'For current IMAS Canadian Diploma students: your cohort plan, graduation checklist, news, documents and the Student Portal.',
  },
  '/faq': {
    title: 'Canadian Diploma Questions & Answers | IMAS',
    description:
      'Answers about the Canadian high school diploma at IMAS International School: recognition in Malaysia, entry, IELTS, assessment and universities.',
  },
  '/contact': {
    title: 'Contact Admissions | IMAS Canadian Diploma',
    description: 'Talk to the IMAS International School admissions team about the Canadian Diploma by phone, email or an enquiry in Gmail.',
  },
  '/portal': {
    title: 'Student Portal | IMAS Canadian Diploma',
    description: 'Sign in to your IMAS Canadian Diploma Student Portal.',
  },
};

/** Pages that shouldn't appear in search results. */
const PRIVATE = [/^\/admin(\/|$)/, /^\/portal(\/|$)/];

/** Sets the page's title, description and canonical address after each change of page. */
export function applyPageMeta(pathname: string, origin = window.location.origin) {
  const path = pathname.replace(/\/+$/, '') || '/';
  const seo = PAGE_SEO[path] ?? (path.startsWith('/admin') ? { title: `Admin | ${SITE_NAME}`, description: '' } : PAGE_SEO['/']);
  document.title = seo.title;
  const set = (selector: string, attr: string, value: string, create: () => HTMLElement) => {
    let el = document.head.querySelector(selector);
    if (!el) {
      el = create();
      document.head.appendChild(el);
    }
    el.setAttribute(attr, value);
  };
  const meta = (key: 'name' | 'property', name: string) => () => {
    const m = document.createElement('meta');
    m.setAttribute(key, name);
    return m;
  };
  if (seo.description) {
    set('meta[name="description"]', 'content', seo.description, meta('name', 'description'));
    set('meta[property="og:description"]', 'content', seo.description, meta('property', 'og:description'));
  }
  set('meta[property="og:title"]', 'content', seo.title, meta('property', 'og:title'));
  set('link[rel="canonical"]', 'href', `${origin}${path === '/' ? '/' : path}`, () => {
    const l = document.createElement('link');
    l.rel = 'canonical';
    return l;
  });
  const hidden = PRIVATE.some((r) => r.test(path));
  const robots = document.head.querySelector('meta[name="robots"]');
  if (hidden) set('meta[name="robots"]', 'content', 'noindex', meta('name', 'robots'));
  else robots?.remove();
}
