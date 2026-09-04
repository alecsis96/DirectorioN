import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e', testMatch: 'ownership-claim.spec.ts', workers: 1,
  timeout: 90_000, expect: { timeout: 30_000 },
  use: { baseURL: 'http://localhost:3100', headless: true },
  webServer: {
    command: 'node e2e/claim-server.mjs', url: 'http://localhost:3100/reclamar-negocio',
    timeout: 120_000, reuseExistingServer: false,
  },
});
