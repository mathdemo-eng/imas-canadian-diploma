import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { CHAPTERS } from './src/chapters';
import { seedBundle } from './src/content/seed';
import { ORG_NAME, PAGE_SEO, SITE_NAME } from './src/seo';

/**
 * The site's public address. Netlify sets URL during builds to the main address
 * (the custom domain once one is added), so these files follow a change of domain.
 */
const SITE_URL = (process.env.URL || process.env.SITE_URL || 'https://canadian.imas.edu.my').replace(/\/+$/, '');

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Who runs the site, in the format search engines read (schema.org). */
function structuredData() {
  const s = seedBundle.settings;
  const data = [
    // Google takes the site name shown above results from here (and from og:site_name).
    { '@context': 'https://schema.org', '@type': 'WebSite', name: ORG_NAME, alternateName: [SITE_NAME, 'IMAS'], url: `${SITE_URL}/` },
    {
      '@context': 'https://schema.org',
      '@type': 'EducationalOrganization',
      name: ORG_NAME,
      alternateName: SITE_NAME,
      url: `${SITE_URL}/`,
      logo: `${SITE_URL}/brand/imas-logo-600.png`,
      description: PAGE_SEO['/'].description,
      email: s.admissions_email,
      telephone: s.admissions_phone.replace(/\s+/g, ''),
      address: { '@type': 'PostalAddress', addressCountry: 'MY' },
      sameAs: [s.website_selangor, s.website_kl],
    },
  ];
  return `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;
}

/**
 * One HTML file per chapter (e.g. pathways.html, served at /pathways) with its own title,
 * description and address, and a short text outline inside the page. Search engines and link
 * previews see these straight away; the app then loads and replaces the outline as usual.
 */
function pageFiles(html: string) {
  const links = CHAPTERS.map((c) => `<li><a href="${c.path}">${esc(c.title)}</a>: ${esc(c.blurb)}</li>`).join('');
  return CHAPTERS.map((c) => {
    const seo = PAGE_SEO[c.path];
    const url = `${SITE_URL}${c.path === '/' ? '/' : c.path}`;
    const head = [
      `<title>${esc(seo.title)}</title>`,
      `<meta name="description" content="${esc(seo.description)}" />`,
      `<link rel="canonical" href="${url}" />`,
      `<meta property="og:type" content="website" />`,
      `<meta property="og:site_name" content="${ORG_NAME}" />`,
      `<meta property="og:url" content="${url}" />`,
      `<meta property="og:title" content="${esc(seo.title)}" />`,
      `<meta property="og:description" content="${esc(seo.description)}" />`,
      structuredData(),
    ].join('\n    ');
    const outline =
      `<div style="max-width:880px;margin:0 auto;padding:48px 20px">` +
      `<p>IMAS International School · Canadian Diploma</p>` +
      `<h1>${esc(c.path === '/' ? 'Your Canadian high school diploma, earned at IMAS' : c.title)}</h1>` +
      `<p>${esc(seo.description)}</p>` +
      `<nav aria-label="Chapters"><ul>${links}</ul></nav></div>`;
    const page = html
      .replace(/<title>[\s\S]*?<\/title>/, '')
      .replace(/<meta\s+name="description"[\s\S]*?\/>/, '')
      .replace(/<meta\s+property="og:title"[\s\S]*?\/>/, '')
      .replace(/<meta\s+property="og:description"[\s\S]*?\/>/, '')
      .replace('</head>', `    ${head}\n  </head>`)
      .replace('<div id="root"></div>', `<div id="root">${outline}</div>`);
    return { file: c.path === '/' ? 'index.html' : `${c.path.slice(1)}.html`, page };
  });
}

/** robots.txt and sitemap.xml, so search engines can find every chapter, and a page file per chapter. */
function searchEngineFiles(): Plugin {
  let outDir = 'dist';
  return {
    name: 'search-engine-files',
    apply: 'build',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir);
    },
    // Runs after index.html is written, so every page file starts from the finished page.
    closeBundle() {
      const html = readFileSync(resolve(outDir, 'index.html'), 'utf8');
      for (const { file, page } of pageFiles(html)) writeFileSync(resolve(outDir, file), page);
    },
    generateBundle() {
      const today = new Date().toISOString().slice(0, 10);
      const urls = CHAPTERS.map(
        (c) => `  <url><loc>${SITE_URL}${c.path}</loc><lastmod>${today}</lastmod><priority>${c.path === '/' ? '1.0' : '0.8'}</priority></url>`,
      ).join('\n');
      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
      });
      this.emitFile({
        type: 'asset',
        fileName: 'robots.txt',
        source: `User-agent: *\nAllow: /\nDisallow: /admin\n\nSitemap: ${SITE_URL}/sitemap.xml\n`,
      });
    },
    // Link previews (WhatsApp, Facebook) need the full address of the share image.
    transformIndexHtml: (html) => html.replace('content="/brand/', `content="${SITE_URL}/brand/`),
  };
}

// Two build targets:
//  - default: the real website (clean URLs, deployed to Netlify).
//  - "artifact": a single self-contained HTML file used for private previews.
export default defineConfig(({ mode }) => {
  const artifact = mode === 'artifact';
  return {
    base: artifact ? './' : '/',
    plugins: [react(), tailwindcss(), ...(artifact ? [viteSingleFile()] : [searchEngineFiles()])],
    define: {
      'import.meta.env.VITE_PREVIEW_BUILD': JSON.stringify(artifact ? 'true' : 'false'),
    },
    build: {
      outDir: artifact ? 'dist-artifact' : 'dist',
      emptyOutDir: true,
      ...(artifact ? { assetsInlineLimit: 100_000_000 } : {}),
    },
  };
});
