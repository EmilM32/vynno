import { expect, test, type Page, type Response } from '@playwright/test';
import { login } from './helpers';

/**
 * SEC-11 regression cover (ADR-0025).
 *
 * These run against `vite preview`, which serves the built SSR server, so `kit.csp` applies exactly
 * as it does under the daily Node. `npm run dev` deliberately relaxes the policy to 'unsafe-inline'
 * (Kit strips nonces and hashes in dev), so never assert these against the Vite dev server.
 */

function headerOf(response: Response | null, name: string): string {
	expect(response, 'navigation produced no response').not.toBeNull();
	return response?.headers()[name] ?? '';
}

function expectStaticHeaders(response: Response | null) {
	expect(headerOf(response, 'referrer-policy')).toBe('strict-origin-when-cross-origin');
	expect(headerOf(response, 'x-content-type-options')).toBe('nosniff');
	expect(headerOf(response, 'x-frame-options')).toBe('DENY');
}

function expectCsp(response: Response | null) {
	const csp = headerOf(response, 'content-security-policy');
	expect(csp, 'no Content-Security-Policy header').not.toBe('');
	expect(csp).toContain("frame-ancestors 'none'");
	expect(csp).toContain("object-src 'none'");
	expect(csp).toContain("base-uri 'self'");
	expect(csp).toContain("default-src 'self'");
	// Nonce mode: the script source is a per-render nonce, never 'unsafe-inline'.
	expect(csp).toMatch(/script-src [^;]*'nonce-[\w+/=-]+'/);
	expect(csp).not.toMatch(/script-src [^;]*'unsafe-inline'/);
}

async function expectNoCspViolations(page: Page, run: () => Promise<void>) {
	const violations: string[] = [];
	page.on('console', (message) => {
		const text = message.text();
		if (text.includes('Content Security Policy') || text.includes('Refused to')) {
			violations.push(text);
		}
	});
	await run();
	expect(violations, `CSP violations in the console:\n${violations.join('\n')}`).toEqual([]);
}

test.describe('security headers', () => {
	test('login page carries the hardening baseline and a nonce CSP', async ({ page }) => {
		const response = await page.goto('/login');
		expectStaticHeaders(response);
		expectCsp(response);
	});

	test('app route carries the same headers', async ({ page }) => {
		await login(page);
		const response = await page.goto('/timer');
		expectStaticHeaders(response);
		expectCsp(response);
	});

	test('proxied /v1 responses are nosniff', async ({ page }) => {
		await login(page);
		const response = await page.request.get('/v1/projects');
		expect(response.status()).toBe(200);
		expect(response.headers()['x-content-type-options']).toBe('nosniff');
	});

	test('the nonce lets the theme bootstrap run, with no CSP violations', async ({ page }) => {
		await expectNoCspViolations(page, async () => {
			await page.addInitScript(() => {
				try {
					localStorage.setItem('vynno-theme', 'light');
				} catch {
					/* ignore */
				}
			});
			await page.goto('/login');
			// app.html's inline script applies the stored theme before Kit hydrates. If the nonce
			// were missing, CSP would block it and this attribute would still be the default.
			await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
		});
	});

	test('charts still render under the policy', async ({ page }) => {
		await expectNoCspViolations(page, async () => {
			await login(page);
			await page.goto('/dashboard');
			await expect(page.locator('svg').first()).toBeVisible();
		});
	});
});
