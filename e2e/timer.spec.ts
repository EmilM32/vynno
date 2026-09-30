import { expect, test, type Page } from '@playwright/test';
import {
	createProject,
	firstProjectId,
	login,
	pastSpansOnCurrentDay,
	seedManualSession,
	spaGo,
	stopSession,
	uniqueNote,
	waitForClient
} from './helpers';

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

	test('tab title and icon show the running session', async ({ page }) => {
		const icon = page.locator('link[rel="icon"]');
		await expect(page).toHaveTitle('Timer · Vynno');
		const idleIcon = await icon.getAttribute('href');

		const note = uniqueNote('title');
		await page.getByRole('combobox', { name: 'Task description' }).fill(note);
		await page.getByRole('button', { name: 'Start', exact: true }).click();

		await expect(page).toHaveTitle(new RegExp(`^▶ \\d{2}:\\d{2}:\\d{2} · ${note} · Vynno$`));
		await expect(icon).not.toHaveAttribute('href', idleIcon ?? '');

		await stopSession(page);
		await expect(page).toHaveTitle('Timer · Vynno');
		await expect(icon).toHaveAttribute('href', idleIcon ?? '');
	});

	test('start posts to sessions', async ({ page }) => {
		const note = uniqueNote('http-start');
		await page.getByRole('combobox', { name: 'Task description' }).fill(note);
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
		await page.getByRole('combobox', { name: 'Task description' }).fill(note);
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
		await page.getByRole('combobox', { name: 'Task description' }).fill(note);
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
		await page.getByRole('combobox', { name: 'Task description' }).fill(note);
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
		const input = page.getByRole('combobox', { name: 'Task description' });
		await input.fill(note);
		await input.press('Enter');
		await expect(page.getByTestId('timer-status')).toHaveText('ACTIVE');
	});

	test('stop returns to idle (Flow C)', async ({ page }) => {
		const note = uniqueNote('stop');
		await page.getByRole('combobox', { name: 'Task description' }).fill(note);
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
		await expect(page.getByRole('combobox', { name: 'Task description' })).toBeEnabled();
		await expect(page.locator('#project-select')).toBeEnabled();
		await expect(page.locator('#activity-select')).toBeEnabled();
		// Draft keeps last finished note
		await expect(page.getByRole('combobox', { name: 'Task description' })).toHaveValue(note);
	});

	test('inputs stay editable while active', async ({ page }) => {
		await page.getByRole('combobox', { name: 'Task description' }).fill(uniqueNote('live-edit'));
		await page.getByRole('button', { name: 'Start', exact: true }).click();
		await expect(page.getByRole('combobox', { name: 'Task description' })).toBeEnabled();
		await expect(page.locator('#project-select')).toBeEnabled();
		await expect(page.locator('#activity-select')).toBeEnabled();
		await expect(page.getByTestId('timer-started-at')).toBeVisible();
	});

	// The UI swaps Start for Stop, so a second Start is only reachable when the store is stale.
	// Seeding the live session out of band reproduces exactly that race.
	// Since EMI-57 the 409 is not an error for the user: the app loads the live session and
	// offers Stop for it.
	test('a second start while a session is live surfaces the live session', async ({ page }) => {
		await waitForClient(page);
		await expect(page.getByTestId('timer-status')).toHaveText('IDLE');

		const projectId = await firstProjectId(page);
		const outOfBand = uniqueNote('out-of-band');
		const seeded = await page.request.post('/v1/sessions', {
			data: { projectId, note: outOfBand }
		});
		expect(seeded.status()).toBe(201);

		await page.getByRole('combobox', { name: 'Task description' }).fill(uniqueNote('second'));
		const [res] = await Promise.all([
			page.waitForResponse(
				(r) => r.request().method() === 'POST' && /\/v1\/sessions$/.test(new URL(r.url()).pathname)
			),
			page.getByRole('button', { name: 'Start', exact: true }).click()
		]);
		expect(res.status()).toBe(409);
		expect(await res.json()).toMatchObject({ error: { code: 'session_already_active' } });
		await expect(page.getByTestId('timer-status')).toHaveText('ACTIVE');
		await expect(page.getByRole('combobox', { name: 'Task description' })).toHaveValue(outOfBand);
		await expect(page.getByRole('button', { name: 'Stop', exact: true })).toBeVisible();
		await expect(page.getByRole('alert')).toHaveCount(0);
	});

	// Contract: UpdateSessionDto must not carry `status` or `id` — stopping is the /stop verb.
	test('editing a field while live patches the session without status', async ({ page }) => {
		await page.getByRole('combobox', { name: 'Task description' }).fill(uniqueNote('live-patch'));
		await page.getByRole('button', { name: 'Start', exact: true }).click();
		await expect(page.getByTestId('timer-status')).toHaveText('ACTIVE');

		const patched = uniqueNote('live-patched');
		const note = page.getByRole('combobox', { name: 'Task description' });
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
		await page.getByRole('combobox', { name: 'Task description' }).fill(uniqueNote('prior'));
		await page.getByRole('button', { name: 'Start', exact: true }).click();
		await expect(page.getByTestId('timer-status')).toHaveText('ACTIVE');
		// Held past 1 s so Stop keeps it as a recent task (EMI-73).
		await stopSession(page);

		await page.getByRole('combobox', { name: 'Task description' }).fill(uniqueNote('busy'));
		await page.getByRole('button', { name: 'Start', exact: true }).click();
		await expect(page.getByTestId('timer-status')).toHaveText('ACTIVE');
		const play = page.getByTestId('recent-task-restart').first();
		await expect(play).toBeDisabled();
		await expect(play).toHaveAttribute('aria-label', 'Stop the current session first');
	});
});

test.describe('timer sub-second stop', () => {
	async function sessionsWithNote(page: Page, note: string) {
		const res = await page.request.get('/v1/sessions?limit=20');
		expect(res.ok()).toBe(true);
		const body = (await res.json()) as { items: { note: string }[] };
		return body.items.filter((s) => s.note === note).length;
	}

	async function startFromTimer(page: Page, note: string) {
		await page.getByRole('combobox', { name: 'Task description' }).fill(note);
		await page.getByRole('button', { name: 'Start', exact: true }).click();
		await expect(page.getByTestId('timer-status')).toHaveText('ACTIVE');
	}

	test('a tap under 1 s is discarded; a second or more is kept (EMI-73)', async ({ page }) => {
		await login(page);
		await page.goto('/timer');
		await waitForClient(page);

		const tap = uniqueNote('tap');
		await startFromTimer(page, tap);
		await stopSession(page, { discard: true });
		await expect(page.getByTestId('recent-tasks').getByText(tap)).toHaveCount(0);
		expect(await sessionsWithNote(page, tap)).toBe(0);

		const kept = uniqueNote('kept');
		await startFromTimer(page, kept);
		await stopSession(page);
		await expect(page.getByTestId('recent-tasks').getByText(kept)).toBeVisible();
		expect(await sessionsWithNote(page, kept)).toBe(1);
	});

	for (const skewMin of [-10, 10]) {
		test(`a 2 s session survives a client clock ${skewMin > 0 ? 'ahead' : 'behind'} by 10 min (EMI-74)`, async ({
			page
		}) => {
			await page.clock.install({ time: new Date(Date.now() + skewMin * 60_000) });
			await login(page);
			await page.goto('/timer');
			await waitForClient(page);

			const note = uniqueNote(`skew${skewMin}`);
			await startFromTimer(page, note);
			await expect(page.getByTestId('timer-elapsed')).toHaveText(/^00:00:0[2-9]$/);
			await stopSession(page);
			await expect(page.getByTestId('recent-tasks').getByText(note)).toBeVisible();
			expect(await sessionsWithNote(page, note)).toBe(1);
		});
	}
});

/** Stopped sessions today, newest first, so a hard load only sees the first 15 (EMI-57/58). */
async function seedToday(page: Page, projectId: string, count: number): Promise<number> {
	const spans = pastSpansOnCurrentDay(count, 60_000);
	for (const span of spans) {
		await seedManualSession(page, {
			projectId,
			note: uniqueNote('today'),
			startedAt: span.startedAt.toISOString(),
			endedAt: span.endedAt.toISOString()
		});
	}
	return spans.reduce((sum, s) => sum + (s.endedAt.getTime() - s.startedAt.getTime()), 0);
}

for (const viewport of [
	{ name: 'desktop', size: { width: 1280, height: 800 } },
	{ name: 'mobile', size: { width: 390, height: 844 } }
]) {
	test.describe(`timer history beyond the first page (${viewport.name})`, () => {
		test.use({ viewport: viewport.size });

		test('a live session older than 16 newer logs still shows Stop (EMI-57)', async ({ page }) => {
			await login(page);
			const projectId = await firstProjectId(page);
			const live = uniqueNote('old-live');
			const started = await page.request.post('/v1/sessions', { data: { projectId, note: live } });
			expect(started.status()).toBe(201);
			const { id } = (await started.json()) as { id: string };
			const moved = await page.request.patch(`/v1/sessions/${id}`, {
				data: { startedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString() }
			});
			expect(moved.status()).toBe(200);
			await seedToday(page, projectId, 16);

			await page.goto('/timer');
			await waitForClient(page);
			await expect(page.getByTestId('timer-status')).toHaveText('ACTIVE');
			await expect(page.getByRole('combobox', { name: 'Task description' })).toHaveValue(live);
			await expect(page.getByRole('button', { name: 'Stop', exact: true })).toBeVisible();
		});
	});
}

test.describe('timer today total', () => {
	test('TODAY counts all 20 sessions on a hard load and after SPA nav (EMI-58)', async ({
		page
	}) => {
		await login(page);
		const totalMs = await seedToday(page, await firstProjectId(page), 20);

		await page.goto('/timer');
		await waitForClient(page);
		const today = page.getByTestId('timer-today-total');
		// 20 one-minute spans unless the run starts within 20 min of midnight.
		if (totalMs === 20 * 60_000) await expect(today).toHaveText(/\b20m\b/);
		const hardLoad = await today.textContent();

		await page.goto('/dashboard');
		await waitForClient(page);
		await spaGo(page, 'Timer', '/timer');
		await expect(today).toHaveText(hardLoad!);
	});
});

test.describe('timer sync across tabs and devices', () => {
	test.beforeEach(async ({ page }) => {
		await login(page);
		await page.goto('/timer');
		await waitForClient(page);
	});

	/** Stop the live session straight through the API, as a phone would. */
	async function stopFromAnotherDevice(page: Page) {
		const active = await page.request.get('/v1/sessions/active');
		expect(active.ok()).toBe(true);
		const { id } = (await active.json()) as { id: string };
		const res = await page.request.post(`/v1/sessions/${id}/stop`);
		expect(res.ok()).toBe(true);
	}

	test('a second tab follows start and stop', async ({ page, context }) => {
		const other = await context.newPage();
		await other.goto('/timer');
		await waitForClient(other);
		await expect(other.getByTestId('timer-status')).toHaveText('IDLE');

		const note = uniqueNote('sync-tab');
		await page.getByRole('combobox', { name: 'Task description' }).fill(note);
		await page.getByRole('button', { name: 'Start', exact: true }).click();

		await expect(other.getByTestId('timer-status')).toHaveText('ACTIVE');
		await expect(other.getByRole('combobox', { name: 'Task description' })).toHaveValue(note);

		await stopSession(page);
		await expect(other.getByTestId('timer-status')).toHaveText('IDLE');
		await expect(other.getByRole('button', { name: 'Start', exact: true })).toBeVisible();
	});

	test('returning to the tab picks up a stop from another device', async ({ page }) => {
		await page.getByRole('combobox', { name: 'Task description' }).fill(uniqueNote('sync-dev'));
		await page.getByRole('button', { name: 'Start', exact: true }).click();
		await expect(page.getByTestId('timer-status')).toHaveText('ACTIVE');
		await expect(page.getByTestId('timer-elapsed')).not.toHaveText('00:00:00');

		await stopFromAnotherDevice(page);
		await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));

		await expect(page.getByTestId('timer-status')).toHaveText('IDLE');
	});

	test('Stop after another device stopped shows idle, not an error', async ({ page }) => {
		await page.getByRole('combobox', { name: 'Task description' }).fill(uniqueNote('sync-race'));
		await page.getByRole('button', { name: 'Start', exact: true }).click();
		await expect(page.getByTestId('timer-status')).toHaveText('ACTIVE');
		await expect(page.getByTestId('timer-elapsed')).not.toHaveText('00:00:00');

		await stopFromAnotherDevice(page);
		await page.getByRole('button', { name: 'Stop', exact: true }).click();

		await expect(page.getByTestId('timer-status')).toHaveText('IDLE');
		await expect(page.getByText('Failed to stop')).toHaveCount(0);
	});
});

test.describe('timer note suggestions', () => {
	test.beforeEach(async ({ page }) => {
		await login(page);
	});

	test('suggests an earlier task and restores its project, ticket and note', async ({ page }) => {
		const project = await createProject(page, { name: uniqueNote('Billing'), code: 'BIL' });
		const note = `Review billing ${uniqueNote('pr')}`;
		await seedManualSession(page, {
			note,
			projectId: project.id,
			ticketId: 'BIL-7',
			startedAt: new Date(Date.now() - 3 * 3_600_000).toISOString(),
			endedAt: new Date(Date.now() - 2 * 3_600_000).toISOString()
		});
		await page.goto('/timer');
		await waitForClient(page);

		const task = page.getByRole('combobox', { name: 'Task description' });
		const list = page.getByRole('listbox', { name: 'Earlier tasks' });
		await task.fill('review bil');
		await expect(list.getByRole('option', { name: note })).toBeVisible();

		await task.press('ArrowDown');
		await expect(task).toHaveAttribute('aria-activedescendant', /task-note-suggestions-0/);
		await task.press('Enter');
		await expect(list).toHaveCount(0);
		await expect(task).toHaveValue(note);
		await expect(page.locator('#project-select')).toHaveValue(project.id);
		await expect(page.getByLabel('Ticket')).toHaveValue('BIL-7');
		await expect(page.getByTestId('timer-status')).toHaveText('IDLE');

		await expect(page.locator('#task-ticket-suggestions option[value="BIL-7"]')).toHaveCount(1);

		await task.fill('review');
		await expect(list).toBeVisible();
		await task.press('Escape');
		await expect(list).toHaveCount(0);
	});

	test('does not suggest while a session is live', async ({ page }) => {
		const note = `Earlier ${uniqueNote('task')}`;
		await seedManualSession(page, {
			note,
			startedAt: new Date(Date.now() - 3 * 3_600_000).toISOString(),
			endedAt: new Date(Date.now() - 2 * 3_600_000).toISOString()
		});
		await page.goto('/timer');
		await waitForClient(page);
		const task = page.getByRole('combobox', { name: 'Task description' });
		await task.fill('Something new');
		await page.getByRole('button', { name: 'Start', exact: true }).click();
		await expect(page.getByTestId('timer-status')).toHaveText('ACTIVE');

		await task.fill('Earlier');
		await expect(page.getByRole('listbox', { name: 'Earlier tasks' })).toHaveCount(0);
	});
});
