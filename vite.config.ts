import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Two build targets:
//  - default: the real website (clean URLs, deployed to Netlify).
//  - "artifact": a single self-contained HTML file used for private previews.
export default defineConfig(({ mode }) => {
  const artifact = mode === 'artifact';
  return {
    base: artifact ? './' : '/',
    plugins: [react(), tailwindcss(), ...(artifact ? [viteSingleFile()] : [])],
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
