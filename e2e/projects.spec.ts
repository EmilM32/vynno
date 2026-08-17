import { expect, test } from '@playwright/test';
import { login, spaGo } from './helpers';

test.describe('projects', () => {
	test.beforeEach(async ({ page }) => {
		await login(page);
		await page.goto('/projects');
	});

	test('shows management heading and seeded projects', async ({ page }) => {
		await expect(page.getByRole('heading', { name: 'Projects' })).toBeVisible();
		await expect(page.getByTestId('project-list')).toBeVisible();
		await expect(page.getByText('Identity')).toBeVisible();
	});

	test('creates a project and lists it as active', async ({ page }) => {
		const name = `E2E Project ${Date.now()}`;
		await page.getByTestId('new-project').click();
		await page.getByLabel('Name').fill(name);
		const [request] = await Promise.all([
			page.waitForRequest(
				(r) => r.method() === 'POST' && /\/v1\/projects$/.test(new URL(r.url()).pathname)
			),
			page.getByRole('button', { name: 'Create project' }).click()
		]);
		expect(request.postDataJSON()).toMatchObject({ name });

		await expect(page.getByTestId('project-list').getByText(name)).toBeVisible();
		await expect(page.getByRole('alert')).toHaveCount(0); // no validation / store errors
	});

	test('new project appears in Timer picker', async ({ page }) => {
		const name = `Timer Pick ${Date.now()}`;
		await page.getByTestId('new-project').click();
		await page.getByLabel('Name').fill(name);
		await page.getByRole('button', { name: 'Create project' }).click();
		await expect(page.getByTestId('project-list').getByText(name)).toBeVisible();

		await spaGo(page, 'Timer', '/timer');
		await expect(page.locator('#project-select').locator('option', { hasText: name })).toHaveCount(
			1
		);
	});
});
