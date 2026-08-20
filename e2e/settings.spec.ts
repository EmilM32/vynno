import { expect, test } from '@playwright/test';
import pkg from '../package.json' with { type: 'json' };
import { login, uniqueNote, type E2EAccount } from './helpers';

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
		await expect(about.getByText(`v${pkg.version}`)).toBeVisible();
	});

	test('default project select is populated', async ({ page }) => {
		const select = page.locator('#default-project');
		await expect(select).toBeVisible();
		await expect(select.locator('option').first()).not.toHaveCount(0);
		const value = await select.inputValue();
		expect(value.length).toBeGreaterThan(0);
	});

	test('deletes an unused activity type after confirm', async ({ page }) => {
		const name = `unused_${Date.now().toString(36)}`;
		const section = page.getByRole('region', { name: 'Activity types' });
		await section.locator('#activity-type-name').fill(name);
		await Promise.all([
			page.waitForRequest(
				(r) => r.method() === 'POST' && /\/v1\/activity-types$/.test(new URL(r.url()).pathname)
			),
			section.getByRole('button', { name: 'Add' }).click()
		]);

		const row = page.getByTestId('activity-type-row').filter({ hasText: name });
		await expect(row).toBeVisible();
		const deleteBtn = row.getByRole('button', { name: 'Delete' });
		await expect(deleteBtn).toBeEnabled();

		await deleteBtn.click();
		const dialog = page.getByRole('dialog', { name: 'Delete activity type?' });
		await expect(dialog).toBeVisible();

		const [request] = await Promise.all([
			page.waitForRequest(
				(r) =>
					r.method() === 'DELETE' && /\/v1\/activity-types\/[^/]+$/.test(new URL(r.url()).pathname)
			),
			dialog.getByRole('button', { name: 'Confirm' }).click()
		]);
		expect(request.method()).toBe('DELETE');
		await expect(row).toHaveCount(0);
		await expect(page.getByRole('alert')).toHaveCount(0);
	});

	test('cannot delete an activity type that has sessions', async ({ page }) => {
		const name = `used_${Date.now().toString(36)}`;
		const created = await page.request.post('/v1/activity-types', {
			data: { name, color: 'secondary' }
		});
		if (!created.ok()) {
			throw new Error(`POST /activity-types failed (${created.status()} ${await created.text()})`);
		}
		const { id } = (await created.json()) as { id: string };

		const projects = await page.request.get('/v1/projects');
		if (!projects.ok()) {
			throw new Error(`GET /projects failed (${projects.status()} ${await projects.text()})`);
		}
		const projectId = ((await projects.json()) as { items: { id: string }[] }).items[0]?.id;
		expect(projectId).toBeTruthy();

		const started = await page.request.post('/v1/sessions', {
			data: { projectId, note: uniqueNote('used-type'), activityTypeId: id }
		});
		if (!started.ok()) {
			throw new Error(`POST /sessions failed (${started.status()} ${await started.text()})`);
		}
		const session = (await started.json()) as { id: string };
		const stopped = await page.request.post(`/v1/sessions/${session.id}/stop`);
		if (!stopped.ok()) {
			throw new Error(`POST /stop failed (${stopped.status()} ${await stopped.text()})`);
		}

		await page.reload();

		const row = page.getByTestId('activity-type-row').filter({ hasText: name });
		await expect(row).toBeVisible();
		const deleteBtn = row.getByRole('button', { name: 'Delete' });
		await expect(deleteBtn).toBeDisabled();
		await expect(deleteBtn).toHaveAttribute(
			'title',
			'Cannot delete an activity type that has sessions.'
		);

		const deletes: string[] = [];
		page.on('request', (r) => {
			if (r.method() === 'DELETE' && r.url().includes('/activity-types/')) {
				deletes.push(r.url());
			}
		});
		await deleteBtn.click({ force: true });
		await expect(page.getByRole('dialog')).toHaveCount(0);
		expect(deletes).toEqual([]);
	});
});
