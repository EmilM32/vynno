import { defineConfig, devices } from '@playwright/test';

/**
 * E2E against a production preview build (stable, no HMR flakes).
 * Locally: reuse an already-running preview if present.
 */
export default defineConfig({
	testDir: 'e2e',
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 1 : undefined,
	reporter: process.env.CI ? 'github' : 'list',
	use: {
		baseURL: 'http://localhost:4173',
		locale: 'en-US',
		trace: 'on-first-retry',
		screenshot: 'only-on-failure'
	},
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] }
		},
		{
			// Chromium + phone viewport (avoids requiring WebKit install for bottom-nav)
			name: 'mobile',
			use: {
				...devices['Desktop Chrome'],
				viewport: { width: 390, height: 844 },
				isMobile: true,
				hasTouch: true
			},
			testMatch: /navigation\.spec\.ts/
		}
	],
	webServer: {
		command: 'npm run build && npm run preview -- --host localhost --port 4173',
		url: 'http://localhost:4173',
		reuseExistingServer: !process.env.CI,
		timeout: 120_000
	}
});
