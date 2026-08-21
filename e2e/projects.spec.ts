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
		await expect(page.getByText('Personal')).toBeVisible();
	});

	test('creates a project and lists it as active', async ({ page }) => {
		const name = `E2E Project ${Date.now()}`;
		await page.getByTestId('new-project').click();
		await expect(page.getByRole('dialog', { name: 'New project' })).toBeVisible();
		await page.getByLabel('Name').fill(name);
		await page.locator('#project-code').fill('');
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

	test('opens the project dossier from the list', async ({ page }) => {
		await page.getByTestId('project-open').first().click();
		await expect(page).toHaveURL(/\/projects\/[^/]+$/);
		await expect(page.getByRole('heading', { level: 1 })).not.toHaveText('Projects');
		await expect(page.getByTestId('project-kpi-total')).toBeVisible();
		await page.getByTestId('project-start').click();
		await expect(page).toHaveURL(/\/timer$/);
	});

	test('project hours chart follows the period toggle', async ({ page }) => {
		await page.getByTestId('project-open').first().click();
		await expect(page.getByRole('region', { name: 'Hours this week' })).toBeVisible();
		await expect(page.getByRole('heading', { name: 'Weekly Overview' })).toBeVisible();

		await page.getByRole('button', { name: 'Month' }).click();
		await expect(page.getByRole('region', { name: 'Hours this month' })).toBeVisible();
		await expect(page.getByRole('heading', { name: 'Monthly Overview' })).toBeVisible();

		await page.getByRole('button', { name: 'All' }).click();
		await expect(page.getByRole('region', { name: 'Hours all time' })).toBeVisible();
		await expect(page.getByRole('heading', { name: 'All time' })).toBeVisible();
	});

	test('dashboard active project card opens the dossier', async ({ page }) => {
		await page.goto('/dashboard');
		const card = page.getByTestId('active-project-card').first();
		await expect(card).toBeVisible();
		await card.click();
		await expect(page).toHaveURL(/\/projects\/[^/]+$/);
		await expect(page.getByTestId('project-kpi-total')).toBeVisible();
		await expect(page.getByRole('button', { name: 'All' })).toBeVisible();
	});

	test('unknown project id shows not-found copy', async ({ page }) => {
		await page.goto('/projects/does-not-exist');
		await expect(page.getByTestId('page-header-description')).toHaveText(
			'That project could not be found.'
		);
		await expect(page.getByTestId('page-header-description')).toBeVisible();
		await expect(page.getByRole('link', { name: 'Projects' }).first()).toBeVisible();
	});

	test('new project appears in Timer picker', async ({ page }) => {
		const name = `Timer Pick ${Date.now()}`;
		await page.getByTestId('new-project').click();
		await expect(page.getByRole('dialog', { name: 'New project' })).toBeVisible();
		await page.getByLabel('Name').fill(name);
		await page.locator('#project-code').fill('');
		await page.getByRole('button', { name: 'Create project' }).click();
		await expect(page.getByTestId('project-list').getByText(name)).toBeVisible();

		await spaGo(page, 'Timer', '/timer');
		await expect(page.locator('#project-select').locator('option', { hasText: name })).toHaveCount(
			1
		);
	});
});
