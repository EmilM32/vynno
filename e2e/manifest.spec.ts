import { expect, test } from '@playwright/test';

test.describe('web app manifest', () => {
	test('is linked, served, and every icon loads', async ({ page, request }) => {
		await page.goto('/login');
		const href = await page.locator('link[rel="manifest"]').getAttribute('href');
		expect(href).toBeTruthy();

		const res = await request.get(new URL(href!, page.url()).toString());
		expect(res.status()).toBe(200);
		const manifest = (await res.json()) as {
			name: string;
			display: string;
			start_url: string;
			icons: { src: string; sizes: string; purpose: string }[];
		};
		expect(manifest).toMatchObject({
			name: 'Vynno',
			display: 'standalone',
			start_url: '/dashboard'
		});
		expect(manifest.icons.map((i) => i.sizes)).toEqual(
			expect.arrayContaining(['192x192', '512x512'])
		);
		expect(manifest.icons.some((i) => i.purpose === 'maskable')).toBe(true);

		for (const icon of manifest.icons) {
			const png = await request.get(icon.src);
			expect(png.status(), icon.src).toBe(200);
			expect(png.headers()['content-type']).toContain('image/png');
		}

		const touch = await page.locator('link[rel="apple-touch-icon"]').getAttribute('href');
		expect((await request.get(new URL(touch!, page.url()).toString())).status()).toBe(200);
	});
});
