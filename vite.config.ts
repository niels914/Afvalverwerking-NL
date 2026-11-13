/// <reference types="vitest" />
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

// Transparante portretfoto voor het 'Meer weten?'-blok (src/components/contact/MeerWeten.tsx).
// Staat public/foto-niels-transparant.png er, dan toont het fotoblok de foto; anders de initialen.
const fotoNiels = existsSync(fileURLToPath(new URL('./public/foto-niels-transparant.png', import.meta.url))) ? '/foto-niels-transparant.png' : '';

/**
 * Indexeerschakelaar: de site is een bèta en staat op noindex. Bouw met VITE_INDEXEERBAAR=true om de noindex weg te
 * halen; scripts/prerender-heffingenscan.mjs zet dan ook robots.txt open en schrijft sitemap.xml. Standaard uit.
 */
function indexeerschakelaar(indexeerbaar: boolean): Plugin {
  return {
    name: 'indexeerschakelaar',
    transformIndexHtml(html) {
      const regel = /[ \t]*<meta name="robots"[^>]*data-indexeerschakelaar[^>]*\/>\r?\n?/;
      return indexeerbaar ? html.replace(regel, '') : html.replace(' data-indexeerschakelaar', '');
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), 'VITE_'), ...Object.fromEntries(Object.entries(process.env).filter(([k]) => k.startsWith('VITE_'))) };
  return {
    plugins: [react(), indexeerschakelaar(env.VITE_INDEXEERBAAR === 'true')],
    define: { __FOTO_NIELS__: JSON.stringify(fotoNiels) },
    test: { environment: 'node', include: ['src/**/*.test.ts'] },
  };
});
