import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { login } from './helpers';

const routes = ['/timer', '/dashboard', '/logs', '/insights', '/projects', '/settings'] as const;

const themes = ['dark', 'light', 'deep-dark'] as const;

async function expectNoViolations(page: Page) {
	const results = await new AxeBuilder({ page })
		.withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
		.analyze();
	expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
}

test.describe('WCAG 2.2 AA (axe)', () => {
	for (const theme of themes) {
		test.describe(`theme ${theme}`, () => {
			for (const route of routes) {
				test(route, async ({ page }) => {
					await page.addInitScript((id) => {
						localStorage.setItem('vynno-theme', id);
					}, theme);
					await login(page);
					await page.goto(route);
					await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
					await expect(page.getByTestId('page-view')).toBeVisible();
					await expect(page).toHaveTitle(/· Vynno$/);
					await expectNoViolations(page);
				});
			}
		});
	}

	test('command palette open', async ({ page }) => {
		await page.setViewportSize({ width: 390, height: 844 });
		await login(page);
		await page.goto('/dashboard');
		await page.getByRole('button', { name: 'Open command palette' }).click();
		await expect(page.getByRole('dialog', { name: 'Command palette' })).toBeVisible();
		await expectNoViolations(page);
	});

	test('projects form open', async ({ page }) => {
		await login(page);
		await page.goto('/projects');
		await page.getByTestId('new-project').click();
		await expect(page.getByRole('dialog', { name: 'New project' })).toBeVisible();
		await expectNoViolations(page);
	});

	test('activity type form open', async ({ page }) => {
		await login(page);
		await page.goto('/settings');
		await page
			.getByRole('region', { name: 'Activity types' })
			.getByRole('button', { name: 'Add', exact: true })
			.click();
		await expect(page.getByRole('dialog', { name: 'New activity type' })).toBeVisible();
		await expectNoViolations(page);
	});

	test('project dossier', async ({ page }) => {
		await login(page);
		await page.goto('/projects');
		await page.getByTestId('project-open').first().click();
		await expect(page).toHaveURL(/\/projects\/[^/]+$/);
		await expect(page.getByTestId('page-view')).toBeVisible();
		await expect(page).toHaveTitle(/· Vynno$/);
		await expectNoViolations(page);
	});

	test('insights month period', async ({ page }) => {
		await login(page);
		await page.goto('/insights');
		await page.getByRole('button', { name: 'Month' }).click();
		await expectNoViolations(page);
	});
});

test.describe('WCAG 2.2 AA (axe) — 404', () => {
	for (const theme of themes) {
		test(`theme ${theme}`, async ({ page }) => {
			await page.addInitScript((id) => {
				localStorage.setItem('vynno-theme', id);
			}, theme);
			await page.goto('/this-route-does-not-exist');
			await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
			await expect(page.getByTestId('error-page')).toBeVisible();
			await expect(page).toHaveTitle(/Page not found · Vynno$/);
			await expectNoViolations(page);
		});
	}
});

test.describe('keyboard', () => {
	test('skip link moves focus to main', async ({ page }) => {
		await login(page);
		await page.goto('/dashboard');
		const skip = page.getByRole('link', { name: 'Skip to content' });
		await skip.focus();
		await expect(skip).toBeFocused();
		await skip.press('Enter');
		await expect(page.locator('#main-content')).toBeFocused();
	});

	test('palette traps focus and restores on Escape', async ({ page }) => {
		await page.setViewportSize({ width: 390, height: 844 });
		await login(page);
		await page.goto('/dashboard');
		const opener = page.getByRole('button', { name: 'Open command palette' });
		await opener.click();
		const filter = page.getByRole('combobox', { name: 'Filter commands' });
		await expect(filter).toBeFocused();
		await page.keyboard.press('Tab');
		await expect(filter).toBeFocused();
		await page.keyboard.press('Escape');
		await expect(page.getByRole('dialog', { name: 'Command palette' })).toHaveCount(0);
		await expect.poll(() => page.locator('[inert]').count()).toBe(0);
	});
});
