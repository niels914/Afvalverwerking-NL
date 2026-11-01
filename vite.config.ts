/// <reference types="vitest" />
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Transparante portretfoto voor het 'Meer weten?'-blok (src/components/contact/MeerWeten.tsx).
// Staat public/foto-niels-transparant.png er, dan toont het fotoblok de foto; anders de initialen.
const fotoNiels = existsSync(fileURLToPath(new URL('./public/foto-niels-transparant.png', import.meta.url))) ? '/foto-niels-transparant.png' : '';

export default defineConfig({
  plugins: [react()],
  define: { __FOTO_NIELS__: JSON.stringify(fotoNiels) },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
});
