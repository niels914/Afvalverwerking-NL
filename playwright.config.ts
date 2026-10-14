import { defineConfig } from '@playwright/test';

// End-to-end tests tegen de productiebuild (vite preview). Draai met: npm run e2e
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  use: { baseURL: 'http://localhost:4173', locale: 'nl-NL' },
  projects: [
    { name: 'mobiel-400', use: { viewport: { width: 400, height: 860 } } },
    { name: 'desktop', use: { viewport: { width: 1280, height: 900 } } },
  ],
  webServer: { command: 'npm run build && npx vite preview --port 4173 --strictPort', port: 4173, reuseExistingServer: true, timeout: 120_000 },
});
