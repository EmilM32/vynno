import { expect, test } from '@playwright/test';
import { version } from '../package.json';
import { login, type E2EAccount } from './helpers';

test.describe('settings', () => {
	let account: E2EAccount;

	test.beforeEach(async ({ page }) => {
		account = await login(page);
		await page.goto('/settings');
	});

	test('shows profile', async ({ page }) => {
		await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
		const profile = page.getByRole('region', { name: 'Profile' });
		await expect(profile.getByText(account.displayName)).toBeVisible();
		await expect(profile.getByText(`@${account.username}`)).toBeVisible();
	});

	test('daily target is editable in-session', async ({ page }) => {
		const input = page.locator('#daily-target');
		await expect(input).toBeVisible();
		await input.fill('6');
		await expect(input).toHaveValue('6');
	});

	test('theme select switches and persists', async ({ page }) => {
		const select = page.locator('#ui-theme');
		await expect(select).toBeVisible();
		await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
		await expect(select.locator('option')).toHaveText(['Dark', 'Light', 'Deep Dark']);

		await select.selectOption('light');
		await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

		await page.reload();
		await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
		await expect(page.locator('#ui-theme')).toHaveValue('light');

		await page.locator('#ui-theme').selectOption('deep-dark');
		await expect(page.locator('html')).toHaveAttribute('data-theme', 'deep-dark');

		await page.reload();
		await expect(page.locator('html')).toHaveAttribute('data-theme', 'deep-dark');
		await expect(page.locator('#ui-theme')).toHaveValue('deep-dark');

		await page.locator('#ui-theme').selectOption('dark');
		await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
	});

	test('language switch reloads into Polish and back', async ({ page }) => {
		const select = page.locator('#ui-locale');
		await expect(select).toBeVisible();
		await expect(select).toHaveValue('en');

		await select.selectOption('pl');
		await expect(page.locator('html')).toHaveAttribute('lang', 'pl');
		await expect(page.getByRole('heading', { name: 'Ustawienia' })).toBeVisible();
		await expect(page.locator('#ui-locale')).toHaveValue('pl');

		await page.locator('#ui-locale').selectOption('en');
		await expect(page.locator('html')).toHaveAttribute('lang', 'en');
		await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
	});

	test('about card shows name, pronunciation, and version', async ({ page }) => {
		const about = page.getByRole('region', { name: 'About Vynno' });
		await expect(about).toBeVisible();
		await expect(about.getByText('VIN-oh')).toBeVisible();
		await expect(about.getByText('/ˈvɪn.oʊ/')).toBeVisible();
		await expect(about.getByText(/double n/i)).toBeVisible();
		await expect(about.getByText(`v${version}`)).toBeVisible();
	});

	test('default project select is populated', async ({ page }) => {
		const select = page.locator('#default-project');
		await expect(select).toBeVisible();
		await expect(select.locator('option').first()).not.toHaveCount(0);
		const value = await select.inputValue();
		expect(value.length).toBeGreaterThan(0);
	});
});
