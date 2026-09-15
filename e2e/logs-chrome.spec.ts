import { expect, test } from '@playwright/test';
import {
	localDayAt,
	login,
	seedManualSession,
	startSession,
	stopSession,
	uniqueNote
} from './helpers';

test.describe('logs chrome', () => {
	test.beforeEach(async ({ page }) => {
		await login(page);
		await startSession(page, uniqueNote('chrome'));
		await stopSession(page);
		await page.goto('/logs');
	});

	test('heading is Logs and search sits beside Add entry', async ({ page }) => {
		await expect(page.getByRole('heading', { name: 'Logs', level: 1 })).toBeVisible();
		const search = page.getByRole('searchbox', { name: 'Search logs' });
		const add = page.getByRole('button', { name: 'Add entry' });
		const sb = await search.boundingBox();
		const ab = await add.boundingBox();
		expect(sb && ab).toBeTruthy();
		expect(Math.abs(sb!.y - ab!.y)).toBeLessThan(12);
		expect(ab!.width).toBeLessThan(page.viewportSize()!.width * 0.5);
	});

	test('first log is above the fold', async ({ page }) => {
		await expect(page.getByTestId('log-row').first()).toBeInViewport();
	});

	test('desktop keeps the three chips', async ({ page }, testInfo) => {
		test.skip(testInfo.project.name === 'mobile', 'mobile collapses chips');
		await expect(page.getByTestId('logs-filter-open')).toBeHidden();
		await expect(page.getByTestId('logs-filter-dates')).toBeVisible();
		await expect(page.getByTestId('logs-filter-projects')).toBeVisible();
		await expect(page.getByTestId('logs-filter-activities')).toBeVisible();
	});

	test('mobile collapses chips into Filters', async ({ page }, testInfo) => {
		test.skip(testInfo.project.name !== 'mobile', 'desktop keeps the three chips');
		await expect(page.getByTestId('logs-filter-open')).toBeVisible();
		await expect(page.getByTestId('logs-filter-dates')).toBeHidden();
		await expect(page.getByTestId('logs-filter-projects')).toBeHidden();
		await expect(page.getByTestId('logs-filter-activities')).toBeHidden();
	});

	test('Filters dialog applies Today', async ({ page }, testInfo) => {
		test.skip(testInfo.project.name !== 'mobile', 'combined dialog is mobile-only');
		const yesterdayNote = uniqueNote('yest-chrome');
		await seedManualSession(page, {
			note: yesterdayNote,
			startedAt: localDayAt(1, 10, 0).toISOString(),
			endedAt: localDayAt(1, 11, 0).toISOString()
		});
		await page.goto('/logs');
		await expect(page.getByTestId('log-row').filter({ hasText: yesterdayNote })).toBeVisible();

		await page.getByTestId('logs-filter-open').click();
		const dialog = page.getByRole('dialog', { name: 'Filters' });
		await dialog.getByRole('button', { name: 'Today' }).click();
		await dialog.getByRole('button', { name: 'Apply' }).click();
		await expect(dialog).toHaveCount(0);
		await expect(page.getByTestId('logs-filter-open')).toHaveText(/1 filters/);
		await expect(page.getByTestId('log-row').filter({ hasText: yesterdayNote })).toHaveCount(0);
	});
});
