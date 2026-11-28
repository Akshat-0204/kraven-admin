import { defineConfig, devices } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const configDir = dirname(fileURLToPath(import.meta.url));

loadEnvFile(resolve(configDir, '../api/.env'));
loadEnvFile(resolve(configDir, '.env'));

const configuredApiBaseUrl = process.env.VITE_API_BASE_URL ?? 'http://localhost:4000';
const apiPort = new URL(configuredApiBaseUrl).port || '4000';
const apiBaseUrl = `http://127.0.0.1:${apiPort}`;

process.env.VITE_API_BASE_URL = apiBaseUrl;

export default defineConfig({
  testDir: './e2e',
  webServer: [
    {
      command: `PORT=${apiPort} pnpm --filter @kraven/api seed:users && PORT=${apiPort} pnpm --filter @kraven/api dev`,
      url: `${apiBaseUrl}/health`,
      reuseExistingServer: true
    },
    {
      command: `VITE_API_BASE_URL=${apiBaseUrl} pnpm --filter @kraven/web dev`,
      url: 'http://127.0.0.1:5173',
      reuseExistingServer: true
    }
  ],
  use: {
    baseURL: 'http://127.0.0.1:5173',
    trace: 'on-first-retry'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ]
});

function loadEnvFile(path: string) {
  if (!existsSync(path)) {
    return;
  }

  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');

    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, '');
    process.env[key] ??= value;
  }
}
