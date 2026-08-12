import { expect, test } from '@playwright/test';

test.describe('settings', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/settings');
	});

	test('shows mock profile', async ({ page }) => {
		await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
		const profile = page.getByRole('region', { name: 'Profile' });
		await expect(profile.getByText('Alex Dev')).toBeVisible();
		await expect(profile.getByText('@alexdev')).toBeVisible();
	});

	test('daily target is editable in-session', async ({ page }) => {
		const input = page.locator('#daily-target');
		await expect(input).toBeVisible();
		await input.fill('6');
		await expect(input).toHaveValue('6');
	});

	test('default project select changes', async ({ page }) => {
		const select = page.locator('#default-project');
		await expect(select).toBeVisible();
		await select.selectOption({ label: 'UI Design System' });
		await expect(select).toHaveValue(/proj-ui|ui/i);
		// Value is project id
		const value = await select.inputValue();
		expect(value.length).toBeGreaterThan(0);
		await expect(select.locator('option:checked')).toHaveText('UI Design System');
	});
});
