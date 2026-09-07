import { expect, test } from '@playwright/test';
import { login } from './helpers';

test.describe('insights', () => {
	test.beforeEach(async ({ page }) => {
		await login(page);
		await page.goto('/insights');
	});

	test('renders range chrome and chart regions (Flow F)', async ({ page }) => {
		await expect(page.getByRole('heading', { name: 'Insights' })).toBeVisible();
		await expect(page.getByTestId('insight-range-label')).toBeVisible();
		await expect(page.getByTestId('insight-range-label')).not.toHaveText('');
		await expect(page.getByText('Total Time')).toHaveCount(0);
		await expect(page.getByText('Most Productive Day')).toHaveCount(0);

		await expect(page.getByRole('region', { name: 'Time by project', exact: true })).toBeVisible();
		await expect(page.getByRole('region', { name: 'Time by activity', exact: true })).toBeVisible();
		await expect(
			page.getByRole('region', { name: 'Activity breakdown', exact: true })
		).toBeVisible();
	});

	test('week / 2 weeks / month grains and prev/next', async ({ page }) => {
		const period = page.getByRole('group', { name: 'Period' });
		const week = period.getByRole('button', { name: 'Week', exact: true });
		const twoWeeks = period.getByRole('button', { name: '2 weeks' });
		const month = period.getByRole('button', { name: 'Month' });
		const label = page.getByTestId('insight-range-label');
		const next = page.getByRole('button', { name: 'Next period' });
		const prev = page.getByRole('button', { name: 'Previous period' });

		await expect(week).toHaveAttribute('aria-pressed', 'true');
		await expect(month).toHaveAttribute('aria-pressed', 'false');
		await expect(next).toBeDisabled();

		const weekLabel = await label.textContent();
		expect(weekLabel).toBeTruthy();

		await month.click();
		await expect(month).toHaveAttribute('aria-pressed', 'true');
		await expect(week).toHaveAttribute('aria-pressed', 'false');
		await expect(label).toHaveText(/\d{4}/);

		await twoWeeks.click();
		await expect(twoWeeks).toHaveAttribute('aria-pressed', 'true');
		await expect(label).not.toHaveText('');

		await prev.click();
		await expect(next).toBeEnabled();
		await next.click();
		await expect(next).toBeDisabled();
	});

	test('custom range dialog validates inverted dates', async ({ page }) => {
		await page.getByRole('button', { name: 'Custom' }).click();
		const dialog = page.getByRole('dialog', { name: 'Custom range' });
		await expect(dialog).toBeVisible();

		const from = dialog.getByLabel('From');
		const to = dialog.getByLabel('To');
		await from.fill('2026-03-11');
		await to.fill('2026-03-01');
		await expect(dialog.getByText('From must be on or before To.')).toBeVisible();
		await expect(dialog.getByRole('button', { name: 'Apply' })).toBeDisabled();

		await dialog.getByRole('button', { name: 'Cancel' }).click();
		await expect(dialog).toBeHidden();
	});
});
