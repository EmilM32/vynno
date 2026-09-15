import { expect, test } from '@playwright/test';
import { firstProjectId, login, uniqueNote, waitForClient } from './helpers';

test.describe('timer lifecycle', () => {
	test.beforeEach(async ({ page }) => {
		await login(page);
		await page.goto('/timer');
		await waitForClient(page);
	});

	test('idle state on load', async ({ page }) => {
		const timer = page.getByRole('region', { name: 'Session timer' });
		await expect(timer).toBeVisible();
		await expect(page.getByTestId('timer-status')).toHaveText('IDLE');
		await expect(page.getByTestId('timer-elapsed')).toHaveText('00:00:00');
		await expect(page.getByRole('button', { name: 'Start', exact: true })).toBeVisible();
		await expect(page.getByLabel('Task description')).toBeVisible();
		await expect(page.getByLabel('Project')).toBeVisible();
		await expect(page.getByLabel('Activity')).toBeVisible();
		await expect(page.getByLabel('Ticket')).toBeVisible();
		await expect(page.getByLabel('Activity')).toHaveValue('');
		await expect(page.getByTestId('page-header-description')).toHaveCount(0);
	});

	test('start posts to sessions', async ({ page }) => {
		const note = uniqueNote('http-start');
		await page.getByRole('textbox', { name: 'Task description' }).fill(note);
		const [request] = await Promise.all([
			page.waitForRequest(
				(r) => r.method() === 'POST' && /\/v1\/sessions$/.test(new URL(r.url()).pathname)
			),
			page.getByRole('button', { name: 'Start', exact: true }).click()
		]);
		expect(request.postDataJSON()).toMatchObject({ note, activityTypeId: null });
		await expect(page.getByTestId('timer-status')).toHaveText('ACTIVE');
	});

	test('start posts ticket', async ({ page }) => {
		const note = uniqueNote('ticket');
		await page.getByRole('textbox', { name: 'Task description' }).fill(note);
		await page.getByLabel('Ticket').fill('DEV-9');
		const [request] = await Promise.all([
			page.waitForRequest(
				(r) => r.method() === 'POST' && /\/v1\/sessions$/.test(new URL(r.url()).pathname)
			),
			page.getByRole('button', { name: 'Start', exact: true }).click()
		]);
		expect(request.postDataJSON()).toMatchObject({
			note,
			ticketId: 'DEV-9'
		});
		await expect(page.getByTestId('timer-status')).toHaveText('ACTIVE');
		await page.goto('/dashboard');
		await expect(page.getByText('DEV-9')).toBeVisible();
	});

	test('start posts selected activity type', async ({ page }) => {
		const created = await page.request.post('/v1/activity-types', {
			data: { name: 'coding', color: 'secondary' }
		});
		if (!created.ok()) {
			throw new Error(`POST /activity-types failed (${created.status()} ${await created.text()})`);
		}
		const body = (await created.json()) as { id: string };
		await page.reload();
		const note = uniqueNote('activity');
		await page.getByRole('textbox', { name: 'Task description' }).fill(note);
		await page.locator('#activity-select').selectOption({ label: 'coding' });
		const [request] = await Promise.all([
			page.waitForRequest(
				(r) => r.method() === 'POST' && /\/v1\/sessions$/.test(new URL(r.url()).pathname)
			),
			page.getByRole('button', { name: 'Start', exact: true }).click()
		]);
		expect(request.postDataJSON()).toMatchObject({ note, activityTypeId: body.id });
		await expect(page.getByTestId('timer-status')).toHaveText('ACTIVE');
	});

	test('start with note and project (Flow A)', async ({ page }) => {
		const note = uniqueNote('start');
		await page.getByRole('textbox', { name: 'Task description' }).fill(note);
		await page.locator('#project-select').selectOption({ label: 'Personal' });
		await page.getByRole('button', { name: 'Start', exact: true }).click();

		await expect(page.getByTestId('timer-status')).toHaveText('ACTIVE');
		await expect(page.getByTestId('timer-project')).toContainText('Personal');
		await expect(page.getByRole('button', { name: 'Pause' })).toHaveCount(0);
		await expect(page.getByRole('button', { name: 'Stop' })).toBeVisible();
		await expect(page.getByTestId('timer-elapsed')).toHaveText(/\d{2}:\d{2}:\d{2}/);

		// Clock should advance at least once while active
		const first = await page.getByTestId('timer-elapsed').textContent();
		await expect
			.poll(async () => page.getByTestId('timer-elapsed').textContent(), { timeout: 3000 })
			.not.toBe(first);
	});

	test('start via Enter key', async ({ page }) => {
		const note = uniqueNote('enter');
		const input = page.getByRole('textbox', { name: 'Task description' });
		await input.fill(note);
		await input.press('Enter');
		await expect(page.getByTestId('timer-status')).toHaveText('ACTIVE');
	});

	test('stop returns to idle (Flow C)', async ({ page }) => {
		const note = uniqueNote('stop');
		await page.getByRole('textbox', { name: 'Task description' }).fill(note);
		await page.getByRole('button', { name: 'Start', exact: true }).click();
		await expect(page.getByTestId('timer-status')).toHaveText('ACTIVE');
		const [stopReq] = await Promise.all([
			page.waitForRequest(
				(r) => r.method() === 'POST' && r.url().includes('/sessions/') && r.url().includes('/stop')
			),
			page.getByRole('button', { name: 'Stop' }).click()
		]);
		expect(stopReq.method()).toBe('POST');

		await expect(page.getByTestId('timer-status')).toHaveText('IDLE');
		await expect(page.getByRole('button', { name: 'Start', exact: true })).toBeVisible();
		await expect(page.getByRole('textbox', { name: 'Task description' })).toBeEnabled();
		await expect(page.locator('#project-select')).toBeEnabled();
		await expect(page.locator('#activity-select')).toBeEnabled();
		// Draft keeps last finished note
		await expect(page.getByRole('textbox', { name: 'Task description' })).toHaveValue(note);
	});

	test('inputs stay editable while active', async ({ page }) => {
		await page.getByRole('textbox', { name: 'Task description' }).fill(uniqueNote('live-edit'));
		await page.getByRole('button', { name: 'Start', exact: true }).click();
		await expect(page.getByRole('textbox', { name: 'Task description' })).toBeEnabled();
		await expect(page.locator('#project-select')).toBeEnabled();
		await expect(page.locator('#activity-select')).toBeEnabled();
		await expect(page.getByTestId('timer-started-at')).toBeVisible();
	});

	// The UI swaps Start for Stop, so a second Start is only reachable when the store is stale.
	// Seeding the live session out of band reproduces exactly that race.
	test('a second start while a session is live surfaces the 409 conflict', async ({ page }) => {
		await waitForClient(page);
		await expect(page.getByTestId('timer-status')).toHaveText('IDLE');

		const projectId = await firstProjectId(page);
		const seeded = await page.request.post('/v1/sessions', {
			data: { projectId, note: uniqueNote('out-of-band') }
		});
		expect(seeded.status()).toBe(201);

		await page.getByRole('textbox', { name: 'Task description' }).fill(uniqueNote('second'));
		const [res] = await Promise.all([
			page.waitForResponse(
				(r) => r.request().method() === 'POST' && /\/v1\/sessions$/.test(new URL(r.url()).pathname)
			),
			page.getByRole('button', { name: 'Start', exact: true }).click()
		]);
		expect(res.status()).toBe(409);
		expect(await res.json()).toMatchObject({ error: { code: 'session_already_active' } });
		// The banner also carries its dismiss control, so match on the message, not the whole node.
		await expect(page.getByRole('alert')).toContainText(
			'Stop the current session before starting a new one.'
		);
	});

	// Contract: UpdateSessionDto must not carry `status` or `id` — stopping is the /stop verb.
	test('editing a field while live patches the session without status', async ({ page }) => {
		await page.getByRole('textbox', { name: 'Task description' }).fill(uniqueNote('live-patch'));
		await page.getByRole('button', { name: 'Start', exact: true }).click();
		await expect(page.getByTestId('timer-status')).toHaveText('ACTIVE');

		const patched = uniqueNote('live-patched');
		const note = page.getByRole('textbox', { name: 'Task description' });
		const patchReq = page.waitForRequest(
			(r) => r.method() === 'PATCH' && /\/v1\/sessions\/[^/]+$/.test(new URL(r.url()).pathname)
		);
		await note.fill(patched);
		await note.blur();
		const body = (await patchReq).postDataJSON();

		expect(body).toMatchObject({ note: patched });
		expect(body).not.toHaveProperty('status');
		expect(body).not.toHaveProperty('id');
		await expect(page.getByTestId('timer-status')).toHaveText('ACTIVE');
	});

	test('restart from recent task blocked while busy', async ({ page }) => {
		await page.getByRole('textbox', { name: 'Task description' }).fill(uniqueNote('prior'));
		await page.getByRole('button', { name: 'Start', exact: true }).click();
		await expect(page.getByTestId('timer-status')).toHaveText('ACTIVE');
		await page.getByRole('button', { name: 'Stop' }).click();
		await expect(page.getByRole('button', { name: 'Start', exact: true })).toBeVisible();

		await page.getByRole('textbox', { name: 'Task description' }).fill(uniqueNote('busy'));
		await page.getByRole('button', { name: 'Start', exact: true }).click();
		await expect(page.getByTestId('timer-status')).toHaveText('ACTIVE');
		const play = page.getByTestId('recent-task-restart').first();
		await expect(play).toBeDisabled();
		await expect(play).toHaveAttribute('aria-label', 'Stop the current session first');
	});
});
