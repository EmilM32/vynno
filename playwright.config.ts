import { defineConfig, devices } from '@playwright/test';
import { e2eOrigin, e2ePreview } from './e2e/env';

/**
 * E2E against a production preview build (stable, no HMR flakes).
 * Locally: reuse an already-running preview if present.
 * Origins come from `.env` (`E2E_ORIGIN`) and `.env.development` (`API_ORIGIN`).
 */
export default defineConfig({
	testDir: 'e2e',
	globalSetup: './e2e/global-setup.ts',
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 1 : undefined,
	reporter: process.env.CI ? 'github' : 'list',
	use: {
		baseURL: e2eOrigin,
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
			testMatch: /(?:navigation|projects|error)\.spec\.ts/
		}
	],
	webServer: {
		command: `npm run build && npm run preview -- --host ${e2ePreview.host} --port ${e2ePreview.port}`,
		url: e2eOrigin,
		reuseExistingServer: !process.env.CI,
		timeout: 120_000
	}
});
