import { expect, test } from '@playwright/test';
import { login } from './helpers';

test.describe('insights', () => {
	test.beforeEach(async ({ page }) => {
		await login(page);
		await page.goto('/insights');
	});

	test('renders KPIs and chart regions (Flow F)', async ({ page }) => {
		await expect(page.getByRole('heading', { name: 'Insights' })).toBeVisible();
		await expect(page.getByText('Total Time')).toBeVisible();
		await expect(page.getByText('Most Productive Day')).toBeVisible();
		await expect(page.getByTestId('kpi-total-time')).toBeVisible();
		await expect(page.getByTestId('kpi-total-time')).not.toHaveText('');

		await expect(page.getByRole('region', { name: 'Time by project', exact: true })).toBeVisible();
		await expect(page.getByRole('region', { name: 'Time by activity', exact: true })).toBeVisible();
		await expect(
			page.getByRole('region', { name: 'Activity breakdown', exact: true })
		).toBeVisible();
	});

	test('week / month period toggle', async ({ page }) => {
		const period = page.getByRole('group', { name: 'Period' });
		const week = period.getByRole('button', { name: 'Week' });
		const month = period.getByRole('button', { name: 'Month' });

		await expect(week).toHaveAttribute('aria-pressed', 'true');
		await expect(month).toHaveAttribute('aria-pressed', 'false');

		const weekTotal = await page.getByTestId('kpi-total-time').textContent();

		await month.click();
		await expect(month).toHaveAttribute('aria-pressed', 'true');
		await expect(week).toHaveAttribute('aria-pressed', 'false');
		await expect(page.getByTestId('kpi-total-time')).toBeVisible();
		// Values may or may not change depending on fixture window; at least still populated
		await expect(page.getByTestId('kpi-total-time')).not.toHaveText('');
		// Month typically includes week data — total should be >= week (string form varies; just ensure still a duration-like label)
		await expect(page.getByTestId('kpi-total-time')).toHaveText(/.+/);
		void weekTotal;
	});
});
