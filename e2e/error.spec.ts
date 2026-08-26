import { expect, test, type Page } from '@playwright/test';
import { desktopNav, login } from './helpers';

const MISSING = '/this-route-does-not-exist';

async function expectNoShell(page: Page) {
	await expect(desktopNav(page)).toHaveCount(0);
	await expect(page.getByRole('link', { name: 'Skip to content' })).toHaveCount(0);
	await expect(page.getByRole('button', { name: 'Open command palette' })).toHaveCount(0);
	await expect(page.getByRole('button', { name: 'Commands' })).toHaveCount(0);
}

test.describe('error page', () => {
	test('unknown URL is a chrome-less 404 when signed out', async ({ page }) => {
		const response = await page.goto(MISSING);
		expect(response?.status()).toBe(404);
		await expect(page.getByTestId('error-page')).toBeVisible();
		await expect(page).toHaveTitle('Page not found · Vynno');
		await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
		await expect(page.getByText("That path isn't a Vynno screen.")).toBeVisible();
		await expect(page.getByRole('link', { name: 'Log in' })).toBeVisible();
		await expect(page.getByRole('button', { name: 'Retry' })).toHaveCount(0);
		await expect(page.getByRole('alert')).toHaveCount(0);
		await expectNoShell(page);

		await page.getByRole('link', { name: 'Log in' }).click();
		await expect(page).toHaveURL(/\/login$/);
	});

	test('unknown URL is a chrome-less 404 when signed in', async ({ page }) => {
		await login(page);
		const response = await page.goto(MISSING);
		expect(response?.status()).toBe(404);
		await expect(page.getByTestId('error-page')).toBeVisible();
		await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
		await expect(page.getByRole('link', { name: 'Go to Dashboard' })).toBeVisible();
		await expectNoShell(page);

		await page.getByRole('link', { name: 'Go to Dashboard' }).click();
		await expect(page).toHaveURL(/\/dashboard$/);
		await expect(page.getByTestId('page-view')).toBeVisible();
	});
});
