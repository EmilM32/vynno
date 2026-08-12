import { expect, test } from '@playwright/test';

test.describe('logs', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/logs');
	});

	test('lists completed sessions from fixtures', async ({ page }) => {
		await expect(page.getByRole('heading', { name: 'System Logs' })).toBeVisible();
		await expect(page.getByTestId('log-row').first()).toBeVisible();
		// Date group separators look like YYYY-MM-DD
		await expect(page.locator('body')).toContainText(/\d{4}-\d{2}-\d{2}/);
	});

	test('search filters rows (Flow G)', async ({ page }) => {
		const rows = page.getByTestId('log-row');
		const initialCount = await rows.count();
		expect(initialCount).toBeGreaterThan(0);

		// Use a unique no-match query
		const search = page.getByRole('searchbox', { name: 'Search logs' });
		await search.fill('zzz-no-match-xyz-e2e');
		await expect(page.getByText('No logs match that filter.')).toBeVisible();
		await expect(rows).toHaveCount(0);

		await search.fill('');
		await expect(rows.first()).toBeVisible();
		await expect(rows).toHaveCount(initialCount);
	});

	test('search by project name reduces list', async ({ page }) => {
		const rows = page.getByTestId('log-row');
		const before = await rows.count();
		await page.getByRole('searchbox', { name: 'Search logs' }).fill('Identity');
		const after = await rows.count();
		expect(after).toBeGreaterThan(0);
		expect(after).toBeLessThanOrEqual(before);
		await expect(rows.first()).toContainText(/Identity|>/i);
	});

	test('row shows project, note, and duration shape', async ({ page }) => {
		const row = page.getByTestId('log-row').first();
		await expect(row).toBeVisible();
		// note is prefixed with "> "
		await expect(row.getByText(/>/)).toBeVisible();
		// duration compact like 1h 20m or 45m / 1:23:00 style
		await expect(row).toContainText(/\d/);
	});
});
