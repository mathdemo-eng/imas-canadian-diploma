// After the build: writes each chapter's full text into its page file, so search engines and AI
// assistants that read pages without running JavaScript see everything a visitor sees. Also adds
// the content the app starts from (so the page doesn't flicker as it starts), the FAQ and
// programme in schema.org form, and llms.txt, a plain summary for AI assistants.
//
// Content comes from the database when the site is connected (the Netlify build has the keys), so
// the pages match what the admin panel shows at the time of the build.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const dist = fileURLToPath(new URL('../dist/', import.meta.url));
const { renderPage, loadContent, CHAPTERS } = await import(new URL('../dist-ssr/prerender.js', import.meta.url).href);

const SITE_URL = (process.env.URL || process.env.SITE_URL || 'https://canadian.imas.edu.my').replace(/\/+$/, '');
const fileFor = (path) => (path === '/' ? 'index.html' : `${path.slice(1)}.html`);
const json = (data) => JSON.stringify(data).replace(/</g, '\\u003c');
const ld = (data) => `<script type="application/ld+json">${json(data)}</script>`;

const content = await loadContent();
if (content.loadError) console.warn(`prerender: using built-in content (${content.loadError})`);
const { loadError: _ignored, ...startContent } = content;
const s = content.settings;
const published = (rows) => rows.filter((r) => r.published !== false).sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
const faqs = published(content.faqs);
const partners = published(content.partners);

// The programme, as one schema.org entry (shown on the home and Pathways pages).
const programme = {
  '@context': 'https://schema.org',
  '@type': 'EducationalOccupationalProgram',
  name: 'New Brunswick (Canada) High School Diploma at IMAS International School',
  alternateName: ['Canadian High School Diploma in Malaysia', 'IMAS Canadian Diploma', 'CAN and Dual Program (IGCSE + Canadian Diploma)'],
  description:
    'The official New Brunswick (Canada) High School Diploma, taught at IMAS International School in Malaysia, the first school in Malaysia accredited by New Brunswick. Two routes: CAN, or the Dual Program (IGCSE + Canadian diploma), joining in Grade 10 or Grade 11.',
  url: `${SITE_URL}/pathways`,
  provider: { '@type': 'EducationalOrganization', name: 'IMAS International School', url: `${SITE_URL}/` },
  educationalCredentialAwarded: 'New Brunswick High School Graduation Diploma (Canada)',
  programPrerequisites: 'Grade 10 entry: completed Grade 9. Grade 11 entry: completed Grade 10.',
  timeToComplete: 'P2Y',
  educationalProgramMode: 'in-person',
  inLanguage: 'en',
};

const faqPage = faqs.length
  ? {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.question, acceptedAnswer: { '@type': 'Answer', text: f.answer } })),
    }
  : null;

const extraData = { '/': [programme], '/pathways': [programme], '/faq': faqPage ? [faqPage] : [] };

let rendered = 0;
for (const chapter of CHAPTERS) {
  const file = dist + fileFor(chapter.path);
  let html = readFileSync(file, 'utf8');
  try {
    const body = await renderPage(chapter.path, content);
    html = html.replace(/<div id="root">[\s\S]*?<\/div>\s*<\/body>/, () => `<div id="root">${body}</div>\n  </body>`);
    rendered++;
  } catch (e) {
    // The short outline written by the build stays in place, so the page still works.
    console.warn(`prerender: ${chapter.path} kept its outline (${e instanceof Error ? e.message : e})`);
  }
  const extras = (extraData[chapter.path] ?? []).map(ld).join('\n    ');
  if (extras) html = html.replace('</head>', `    ${extras}\n  </head>`);
  writeFileSync(file, withStartContent(html));
}
writeFileSync(dist + 'shell.html', withStartContent(readFileSync(dist + 'shell.html', 'utf8')));

/** The content the app starts from, so it shows the same page straight away and then checks for newer content. */
function withStartContent(html) {
  return html.replace('</body>', () => `  <script type="application/json" id="start-content">${json(startContent)}</script>\n  </body>`);
}

// llms.txt: a plain summary for AI assistants (see llmstxt.org).
const tracks = published(content.tracks);
const llms = [
  '# IMAS Canadian Diploma',
  '',
  '> IMAS International School in Malaysia offers the official New Brunswick (Canada) High School Diploma. IMAS is the first school in Malaysia accredited by New Brunswick. Students graduate with the same diploma as students in Canada, without leaving Malaysia.',
  '',
  '## Key facts',
  '',
  '- Diploma: New Brunswick High School Graduation Diploma (Canada), issued by the Province of New Brunswick.',
  '- Recognition in Malaysia: approved by the Ministry of Education Malaysia (post-secondary Canadian High School Program, December 2025) and listed by the Malaysian Qualifications Agency (MQA) as an entry qualification for bachelor’s degrees.',
  '- Routes: CAN (Canadian Diploma), or the Dual Program (CAD: IGCSE + Canadian Diploma). Join in Grade 10 or Grade 11; the programme takes at least two years.',
  `- Cohorts: ${tracks.map((t) => `${t.name} (${t.stated_total} courses)`).join('; ')}.`,
  `- Assessment: ${s.ca_weight}% continuous assessment (assignments, end-of-chapter tests, project) and ${s.exam_weight}% final exam. No midterm examinations. Pass mark ${s.pass_mark}% in every course; attendance at least ${s.attendance_min}%.`,
  `- Graduation: ${s.total_credit_hours} credit-hours, including ${s.grade12_credit_hours} at Grade 12; a pass in every course; IELTS band ${s.ielts_min_band} (IMAS prepares students and arranges the exam); a Career Life Plan.`,
  '- Academic year: Semester 1 from September to February, Semester 2 from March to July.',
  partners.length ? `- Partner universities in Canada: ${partners.map((p) => p.name).join(', ')}.` : '',
  `- Admissions: ${s.admissions_email}, ${s.admissions_phone}.`,
  '',
  '## Pages',
  '',
  ...CHAPTERS.map((c) => `- [${c.title}](${SITE_URL}${c.path}): ${c.blurb}`),
  '',
].filter((line, i, all) => line !== '' || all[i - 1] !== '');
writeFileSync(dist + 'llms.txt', llms.join('\n') + '\n');

console.log(`prerender: ${rendered} of ${CHAPTERS.length} pages written with full text (content: ${content.source})`);
