import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL: 'http://localhost:5199', trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  // Test the built library (dist/) through a production build, not the dev alias to src/.
  webServer: {
    command: 'pnpm -F datespan build && vite build && vite preview',
    url: 'http://localhost:5199',
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
