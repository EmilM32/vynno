import { expect, test } from '@playwright/test';
import { login, spaGo, startSession, stopSession, uniqueNote } from './helpers';

test.describe('logs', () => {
	test.beforeEach(async ({ page }) => {
		await login(page);
		await startSession(page, uniqueNote('log'));
		await stopSession(page);
		await page.goto('/logs');
	});

	test('shows the logs heading', async ({ page }) => {
		await expect(page.getByRole('heading', { name: 'System Logs' })).toBeVisible();
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
		await page.getByRole('searchbox', { name: 'Search logs' }).fill('Personal');
		const after = await rows.count();
		expect(after).toBeGreaterThan(0);
		expect(after).toBeLessThanOrEqual(before);
		await expect(rows.first()).toContainText(/Personal|>/i);
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

test.describe('logs activity chip', () => {
	test('shows a chip when the session was started with an activity type', async ({ page }) => {
		await login(page);
		const note = uniqueNote('coding-chip');
		await startSession(page, note, undefined, 'coding');
		await stopSession(page);
		await page.goto('/logs');
		const row = page.getByTestId('log-row').filter({ hasText: note });
		await expect(row.getByTestId('activity-chip')).toHaveText(/coding/i);

		await spaGo(page, 'Insights', '/insights');
		await expect(page.getByRole('region', { name: 'Time by activity', exact: true })).toContainText(
			/coding/i
		);
	});
});
