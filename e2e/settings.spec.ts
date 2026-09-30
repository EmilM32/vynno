import { expect, test, type Page } from '@playwright/test';
import pkg from '../package.json' with { type: 'json' };
import { e2eOrigin } from './env';
import { PNG_1X1, login, loginWith, uniqueNote, waitForClient, type E2EAccount } from './helpers';

async function expectTheme(page: Page, id: string) {
	await expect(page.locator('#ui-theme')).toHaveValue(id);
	await expect(page.locator('html')).toHaveAttribute('data-theme', id);
}

test.describe('settings', () => {
	let account: E2EAccount;

	test.beforeEach(async ({ page }) => {
		account = await login(page);
		await page.goto('/settings');
		await waitForClient(page);
	});

	test('shows profile', async ({ page }) => {
		await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
		const profile = page.getByRole('region', { name: 'Profile' });
		await expect(profile.getByText(account.displayName)).toBeVisible();
		await expect(profile.getByText(account.email)).toBeVisible();
	});

	test('display name saves and persists across reload', async ({ page }) => {
		const name = `E2E Name ${Date.now().toString(36)}`;
		const save = page.getByRole('button', { name: 'Save name' });
		await expect(save).toHaveCount(0);

		await page.getByLabel('Display name').fill(name);
		await expect(save).toBeVisible();
		await expect(save).toBeEnabled();

		const [req] = await Promise.all([
			page.waitForRequest(
				(r) => r.method() === 'PATCH' && /\/v1\/me$/.test(new URL(r.url()).pathname)
			),
			save.click()
		]);
		expect(req.postDataJSON()).toMatchObject({ displayName: name });
		await expect(save).toHaveCount(0);

		await page.reload();
		await waitForClient(page);
		await expect(page.getByLabel('Display name')).toHaveValue(name);
		await expect(page.getByRole('region', { name: 'Profile' })).toContainText(name);
		await expect(save).toHaveCount(0);
	});

	test('avatar uploads, serves publicly, and is removed', async ({ page, request }) => {
		// The file input is sr-only and unlabelled; drive it directly rather than the visible button.
		const [putRes] = await Promise.all([
			page.waitForResponse(
				(r) => r.request().method() === 'PUT' && /\/v1\/me\/avatar$/.test(new URL(r.url()).pathname)
			),
			page
				.locator('input[type="file"]')
				.setInputFiles({ name: 'avatar.png', mimeType: 'image/png', buffer: PNG_1X1 })
		]);
		expect(putRes.status()).toBe(200);
		const { avatarUrl } = (await putRes.json()) as { avatarUrl: string | null };
		expect(avatarUrl).toBeTruthy();

		// GET /v1/avatars/:id is public — the `request` fixture carries no session cookie.
		const assetId = new URL(avatarUrl!).pathname.split('/').pop();
		const publicRes = await request.get(`/v1/avatars/${assetId}`);
		expect(publicRes.status()).toBe(200);
		expect(publicRes.headers()['content-type']).toMatch(/^image\//);

		// Remove photo only renders while an avatar is set.
		const remove = page.getByRole('button', { name: 'Remove photo' });
		await expect(remove).toBeVisible();
		const [delRes] = await Promise.all([
			page.waitForResponse(
				(r) =>
					r.request().method() === 'DELETE' && /\/v1\/me\/avatar$/.test(new URL(r.url()).pathname)
			),
			remove.click()
		]);
		expect(delRes.status()).toBe(200);
		expect(await delRes.json()).toMatchObject({ avatarUrl: null });
		await expect(remove).toHaveCount(0);
	});

	test('daily target saves to the account and follows it to another browser', async ({
		page,
		browser
	}) => {
		const input = page.locator('#daily-target');
		await expect(input).toBeVisible();
		await expect(
			page.getByRole('region', { name: 'Preferences' }).getByText('h', { exact: true })
		).toBeVisible();
		await input.fill('6');
		const [req] = await Promise.all([
			page.waitForResponse(
				(r) =>
					r.request().method() === 'PATCH' && /\/v1\/me\/prefs$/.test(new URL(r.url()).pathname)
			),
			input.press('Tab')
		]);
		expect(req.status()).toBe(200);
		expect(req.request().postDataJSON()).toEqual({ dailyTargetMs: 6 * 3_600_000 });

		// A fresh browser has no device state: the value can only come from the account.
		const other = await browser.newContext({ baseURL: e2eOrigin, locale: 'en-US' });
		try {
			const otherPage = await other.newPage();
			await loginWith(otherPage, account.email, account.password);
			await otherPage.goto('/settings');
			await waitForClient(otherPage);
			await expect(otherPage.locator('#daily-target')).toHaveValue('6');
		} finally {
			await other.close();
		}
	});

	test('copies an old device prefs cookie to the account once', async ({ page, context }) => {
		const legacy = { email: account.email, defaultProjectId: '', dailyTargetHours: 5 };
		await context.addCookies([
			{
				name: 'vynno_prefs',
				value: encodeURIComponent(JSON.stringify(legacy)),
				url: e2eOrigin
			}
		]);
		const [saved] = await Promise.all([
			page.waitForResponse(
				(r) =>
					r.request().method() === 'PATCH' && /\/v1\/me\/prefs$/.test(new URL(r.url()).pathname)
			),
			page.reload()
		]);
		expect(saved.request().postDataJSON()).toEqual({ dailyTargetMs: 5 * 3_600_000 });
		await expect(page.locator('#daily-target')).toHaveValue('5');
		await expect
			.poll(async () => (await context.cookies()).some((c) => c.name === 'vynno_prefs'))
			.toBe(false);
	});

	test('theme select switches and persists', async ({ page }) => {
		const select = page.locator('#ui-theme');
		await expect(select).toBeVisible();
		await expectTheme(page, 'dark');
		await expect(select.locator('option')).toHaveText([
			'Dark',
			'Light',
			'Deep Dark',
			'Ember',
			'Newsprint',
			'Zen'
		]);

		await select.selectOption('light');
		await expectTheme(page, 'light');

		await page.reload();
		await waitForClient(page);
		await expectTheme(page, 'light');

		await select.selectOption('deep-dark');
		await expectTheme(page, 'deep-dark');

		await page.reload();
		await waitForClient(page);
		await expectTheme(page, 'deep-dark');

		await select.selectOption('dark');
		await expectTheme(page, 'dark');
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

	test('default project persists across reload', async ({ page }) => {
		const created = await page.request.post('/v1/projects', {
			data: { name: `Default ${Date.now().toString(36)}`, color: '#22c55e' }
		});
		if (!created.ok()) {
			throw new Error(`POST /projects failed (${created.status()} ${await created.text()})`);
		}
		const { id: secondId } = (await created.json()) as { id: string };

		await page.reload();
		const select = page.locator('#default-project');
		await expect(select).toBeVisible();
		const current = await select.inputValue();
		expect(current.length).toBeGreaterThan(0);
		const otherId = (
			await select
				.locator('option')
				.evaluateAll((opts) => opts.map((o) => (o as HTMLOptionElement).value))
		).find((id) => id && id !== current);
		expect(otherId ?? secondId).toBeTruthy();
		const nextId = otherId ?? secondId;

		const hydrationErrors: string[] = [];
		page.on('console', (msg) => {
			if (msg.type() === 'error' && /hydrat/i.test(msg.text())) {
				hydrationErrors.push(msg.text());
			}
		});

		const [saved] = await Promise.all([
			page.waitForResponse(
				(r) =>
					r.request().method() === 'PATCH' && /\/v1\/me\/prefs$/.test(new URL(r.url()).pathname)
			),
			select.selectOption(nextId)
		]);
		expect(await saved.json()).toMatchObject({ defaultProjectId: nextId });
		await expect(select).toHaveValue(nextId);

		await page.reload();
		await expect(page.locator('#default-project')).toHaveValue(nextId);
		expect(hydrationErrors).toEqual([]);
	});

	test('deletes an unused activity type after confirm', async ({ page }) => {
		const name = `unused_${Date.now().toString(36)}`;
		const section = page.getByRole('region', { name: 'Activity types' });
		await section.getByRole('button', { name: 'Add', exact: true }).click();
		const formDialog = page.getByRole('dialog', { name: 'New activity type' });
		await formDialog.locator('#activity-type-name').fill(name);
		await Promise.all([
			page.waitForRequest(
				(r) => r.method() === 'POST' && /\/v1\/activity-types$/.test(new URL(r.url()).pathname)
			),
			formDialog.getByRole('button', { name: 'Add', exact: true }).click()
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
		// The session count loads when the row is hovered (EMI-70); the reason follows it.
		await row.hover();
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

/** 80 code points, no spaces: the longest name the API accepts (EMI-66). */
function longTypeName(tag: string): string {
	return `${tag}_${Date.now().toString(36)}_`.padEnd(80, 'x');
}

async function addActivityType(page: Page, name: string) {
	const section = page.getByRole('region', { name: 'Activity types' });
	await section.getByRole('button', { name: 'Add', exact: true }).click();
	const dialog = page.getByRole('dialog', { name: 'New activity type' });
	await dialog.locator('#activity-type-name').fill(name);
	await dialog.getByRole('button', { name: 'Add', exact: true }).click();
	await expect(dialog).toBeHidden();
}

test.describe('settings activity type length', () => {
	test.beforeEach(async ({ page }) => {
		await login(page);
		await page.goto('/settings');
		await waitForClient(page);
	});

	test('an 80-char type saves and edits; 81 fails inline (EMI-66)', async ({ page }) => {
		const name = longTypeName('long');
		await addActivityType(page, name);
		const row = page.getByTestId('activity-type-row').filter({ hasText: name });
		await expect(row).toBeVisible();

		await row.getByRole('button', { name: 'Edit' }).click();
		const dialog = page.getByRole('dialog', { name: 'Edit activity type' });
		await dialog.locator('#activity-type-name').fill(`${name}y`);
		await dialog.getByRole('button', { name: 'Save' }).click();
		await expect(dialog.getByText('Name must be at most 80 characters.')).toBeVisible();

		const renamed = longTypeName('renamed');
		await dialog.locator('#activity-type-name').fill(renamed);
		await dialog.getByRole('button', { name: 'Save' }).click();
		await expect(dialog).toBeHidden();
		await expect(page.getByTestId('activity-type-row').filter({ hasText: renamed })).toBeVisible();
	});

	test.describe('mobile', () => {
		test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

		test('Edit and Delete stay on screen next to an 80-char type (EMI-77)', async ({ page }) => {
			const name = longTypeName('mobile');
			await addActivityType(page, name);
			const row = page.getByTestId('activity-type-row').filter({ hasText: name });
			for (const label of ['Edit', 'Delete']) {
				const button = row.getByRole('button', { name: label });
				await button.scrollIntoViewIfNeeded();
				await expect(button).toBeInViewport({ ratio: 1 });
			}
			expect(
				await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
			).toBe(true);
		});
	});
});
