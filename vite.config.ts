import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { CHAPTERS } from './src/chapters';

/**
 * The site's public address. Netlify sets URL during builds to the main address
 * (the custom domain once one is added), so these files follow a change of domain.
 */
const SITE_URL = (process.env.URL || process.env.SITE_URL || 'https://imas-canadian.netlify.app').replace(/\/+$/, '');

/** robots.txt and sitemap.xml, so search engines can find every chapter. */
function searchEngineFiles(): Plugin {
  return {
    name: 'search-engine-files',
    apply: 'build',
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
