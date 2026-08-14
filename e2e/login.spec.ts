import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { desktopNav } from './helpers';

const themes = ['dark', 'light', 'deep-dark'] as const;

async function expectNoViolations(page: Page) {
	const results = await new AxeBuilder({ page })
		.withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
		.analyze();
	expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
}

test.describe('login', () => {
	test('root redirects to login when signed out', async ({ page }) => {
		await page.goto('/');
		await expect(page).toHaveURL(/\/login$/);
		await expect(page.getByRole('heading', { name: 'Vynno' })).toBeVisible();
		await expect(page.getByRole('button', { name: 'Log in' })).toBeVisible();
	});

	test('login has no app shell chrome', async ({ page }) => {
		await page.goto('/login');
		await expect(desktopNav(page)).toHaveCount(0);
		await expect(page.getByRole('link', { name: 'Skip to content' })).toHaveCount(0);
		await expect(page.getByRole('button', { name: 'Open command palette' })).toHaveCount(0);
	});

	test('empty submit stays and shows field errors', async ({ page }) => {
		await page.goto('/login');
		await page.getByRole('button', { name: 'Log in' }).click();
		await expect(page).toHaveURL(/\/login$/);
		await expect(page.getByRole('alert')).toHaveCount(2);
		await expect(page.getByText('Username is required.')).toBeVisible();
		await expect(page.getByText('Password is required.')).toBeVisible();
	});

	test('any credentials proceed to the dashboard', async ({ page }) => {
		await page.goto('/login');
		await page.getByLabel('Username').fill('emil');
		await page.getByLabel('Password').fill('secret');
		await page.getByRole('button', { name: 'Log in' }).click();
		await expect(page).toHaveURL(/\/dashboard$/);
		await expect(page.getByTestId('page-view')).toBeVisible();
		await expect(desktopNav(page).getByText('Vynno', { exact: true })).toBeVisible();
	});

	test('root goes to dashboard after stub login', async ({ page }) => {
		await page.goto('/login');
		await page.getByLabel('Username').fill('emil');
		await page.getByLabel('Password').fill('secret');
		await page.getByRole('button', { name: 'Log in' }).click();
		await expect(page).toHaveURL(/\/dashboard$/);

		await page.goto('/');
		await expect(page).toHaveURL(/\/dashboard$/);
	});
});

test.describe('login a11y', () => {
	for (const theme of themes) {
		test(`axe ${theme}`, async ({ page }) => {
			await page.addInitScript((id) => {
				localStorage.setItem('vynno-theme', id);
			}, theme);
			await page.goto('/login');
			await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
			await expectNoViolations(page);
		});
	}
});
