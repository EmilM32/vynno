import { expect, test } from '@playwright/test';
import {
	firstProjectId,
	localCivilDay,
	localDayAt,
	login,
	seedManualSession,
	seedStoppedSessions,
	spaGo,
	startSession,
	stopSession,
	uniqueNote
} from './helpers';

test.describe('logs', () => {
	test.beforeEach(async ({ page }) => {
		await login(page);
		await startSession(page, uniqueNote('log'));
		await stopSession(page);
		await page.goto('/logs');
	});

	test('shows the logs heading', async ({ page }) => {
		await expect(page.getByRole('heading', { name: 'System Logs' })).toBeVisible();
		// Date group separators look like YYYY-MM-DD
		await expect(page.locator('body')).toContainText(/\d{4}-\d{2}-\d{2}/);
	});

	test('search filters rows (Flow G)', async ({ page }) => {
		const rows = page.getByTestId('log-row');
		const initialCount = await rows.count();
		expect(initialCount).toBeGreaterThan(0);

		// Use a unique no-match query
		const search = page.getByRole('searchbox', { name: 'Search logs' });
		await search.fill('zzz-no-match-xyz-e2e');
		await expect(page.getByText('No logs match that filter.')).toBeVisible();
		await expect(rows).toHaveCount(0);

		await search.fill('');
		await expect(rows.first()).toBeVisible();
		await expect(rows).toHaveCount(initialCount);
	});

	test('search by project name reduces list', async ({ page }) => {
		const rows = page.getByTestId('log-row');
		const before = await rows.count();
		await page.getByRole('searchbox', { name: 'Search logs' }).fill('Personal');
		const after = await rows.count();
		expect(after).toBeGreaterThan(0);
		expect(after).toBeLessThanOrEqual(before);
		await expect(rows.first()).toContainText(/Personal|>/i);
	});

	test('row shows project, note, and duration shape', async ({ page }) => {
		const row = page.getByTestId('log-row').first();
		await expect(row).toBeVisible();
		// note is prefixed with "> "
		await expect(row.getByText(/>/)).toBeVisible();
		// duration compact like 1h 20m or 45m / 1:23:00 style
		await expect(row).toContainText(/\d/);
	});

	test('can add, edit, and delete a log entry', async ({ page }) => {
		const note = uniqueNote('manual');
		await page.getByRole('button', { name: 'Add entry' }).click();
		const dialog = page.getByRole('dialog', { name: 'Manual time entry' });
		const form = dialog.getByTestId('session-form');
		await expect(form).toBeVisible();
		await form.getByLabel('Task').fill(note);
		await form.getByLabel('Ticket').fill('DEV-1');
		await form.getByRole('button', { name: 'Add', exact: true }).click();
		const row = page.getByTestId('log-row').filter({ hasText: note });
		await expect(row).toBeVisible();
		await expect(row.getByText('DEV-1')).toBeVisible();

		await row.getByRole('button', { name: 'Edit' }).click();
		const edited = `${note}-renamed`;
		const editDialog = page.getByRole('dialog', { name: 'Edit session' });
		await editDialog.getByLabel('Task').fill(edited);
		await editDialog.getByRole('button', { name: 'Save' }).click();
		await expect(page.getByTestId('log-row').filter({ hasText: edited })).toBeVisible();

		await page
			.getByTestId('log-row')
			.filter({ hasText: edited })
			.getByRole('button', { name: 'Delete' })
			.click();
		await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click();
		await expect(page.getByTestId('log-row').filter({ hasText: edited })).toHaveCount(0);
	});

	test('loads the next page when the list is scrolled', async ({ page }) => {
		await seedStoppedSessions(page, 20);
		const cursorRequests: string[] = [];
		page.on('request', (req) => {
			if (
				req.method() === 'GET' &&
				/\/v1\/sessions\?/.test(req.url()) &&
				req.url().includes('cursor=')
			) {
				cursorRequests.push(req.url());
			}
		});
		await page.goto('/logs');
		const rows = page.getByTestId('log-row');
		await expect(rows.first()).toBeVisible();
		const initial = await rows.count();
		expect(initial).toBeGreaterThan(0);
		expect(initial).toBeLessThan(21);
		await page.getByTestId('logs-sentinel').scrollIntoViewIfNeeded();
		await expect.poll(() => rows.count()).toBeGreaterThan(initial);
		expect(cursorRequests.length).toBeGreaterThan(0);
	});
});

test.describe('logs activity chip', () => {
	test('shows a chip when the session was started with an activity type', async ({ page }) => {
		await login(page);
		const note = uniqueNote('coding-chip');
		await startSession(page, note, undefined, 'coding');
		await stopSession(page);
		await page.goto('/logs');
		const row = page.getByTestId('log-row').filter({ hasText: note });
		await expect(row.getByTestId('activity-chip')).toHaveText(/coding/i);

		await spaGo(page, 'Insights', '/insights');
		await expect(page.getByRole('region', { name: 'Time by activity', exact: true })).toContainText(
			/coding/i
		);
	});
});

test.describe('logs filters', () => {
	test('default chrome is All dates / projects / activities', async ({ page }) => {
		await login(page);
		await page.goto('/logs');
		const filters = page.getByTestId('logs-filters');
		await expect(filters).toBeVisible();
		await expect(page.getByTestId('logs-filter-dates')).toHaveText(/All dates/);
		await expect(page.getByTestId('logs-filter-projects')).toHaveText(/All projects/);
		await expect(page.getByTestId('logs-filter-activities')).toHaveText(/All activities/);
		await expect(page.getByTestId('logs-filter-clear')).toHaveCount(0);
	});

	test('Today hides a yesterday entry and Clear restores it', async ({ page }) => {
		await login(page);
		const yesterdayNote = uniqueNote('yest');
		const todayNote = uniqueNote('today');
		const yest = localDayAt(1, 10, 0);
		const yestEnd = localDayAt(1, 11, 0);
		await seedManualSession(page, {
			note: yesterdayNote,
			startedAt: yest.toISOString(),
			endedAt: yestEnd.toISOString()
		});
		await startSession(page, todayNote);
		await stopSession(page);
		await page.goto('/logs');

		const rows = page.getByTestId('log-row');
		await expect(rows.filter({ hasText: yesterdayNote })).toBeVisible();
		await expect(rows.filter({ hasText: todayNote })).toBeVisible();

		await page.getByTestId('logs-filter-dates').click();
		await page
			.getByRole('dialog', { name: 'Date range' })
			.getByRole('button', { name: 'Today' })
			.click();
		await expect(page.getByTestId('logs-filter-dates')).toContainText('Today');
		await expect(rows.filter({ hasText: todayNote })).toBeVisible();
		await expect(rows.filter({ hasText: yesterdayNote })).toHaveCount(0);

		await page.getByTestId('logs-filter-clear').click();
		await expect(page.getByTestId('logs-filter-dates')).toHaveText(/All dates/);
		await expect(rows.filter({ hasText: yesterdayNote })).toBeVisible();
	});

	test('custom range includes only days in the span', async ({ page }) => {
		await login(page);
		const inNote = uniqueNote('in-span');
		const outNote = uniqueNote('out-span');
		const inStart = localDayAt(18, 10, 0);
		const inEnd = localDayAt(18, 11, 0);
		const outStart = localDayAt(5, 10, 0);
		const outEnd = localDayAt(5, 11, 0);
		await seedManualSession(page, {
			note: inNote,
			startedAt: inStart.toISOString(),
			endedAt: inEnd.toISOString()
		});
		await seedManualSession(page, {
			note: outNote,
			startedAt: outStart.toISOString(),
			endedAt: outEnd.toISOString()
		});
		await page.goto('/logs');

		await page.getByTestId('logs-filter-dates').click();
		const dialog = page.getByRole('dialog', { name: 'Date range' });
		await dialog.getByRole('button', { name: 'Custom' }).click();
		await dialog.getByLabel('From').fill(localCivilDay(localDayAt(20)));
		await dialog.getByLabel('To').fill(localCivilDay(localDayAt(17)));
		await dialog.getByRole('button', { name: 'Apply' }).click();

		const rows = page.getByTestId('log-row');
		await expect(rows.filter({ hasText: inNote })).toBeVisible();
		await expect(rows.filter({ hasText: outNote })).toHaveCount(0);
	});

	test('project multi-select keeps only chosen projects', async ({ page }) => {
		await login(page);
		const personalId = await firstProjectId(page);
		const otherName = `FilterProj ${Date.now().toString(36)}`;
		const created = await page.request.post('/v1/projects', {
			data: { name: otherName, color: '#10b981' }
		});
		if (!created.ok()) {
			throw new Error(`POST /projects failed (${created.status()} ${await created.text()})`);
		}
		const { id: otherId } = (await created.json()) as { id: string };
		const personalNote = uniqueNote('personal');
		const otherNote = uniqueNote('other');
		const start = localDayAt(0, 9, 0);
		const end = localDayAt(0, 10, 0);
		await seedManualSession(page, {
			note: personalNote,
			projectId: personalId,
			startedAt: start.toISOString(),
			endedAt: end.toISOString()
		});
		await seedManualSession(page, {
			note: otherNote,
			projectId: otherId,
			startedAt: start.toISOString(),
			endedAt: end.toISOString()
		});
		await page.goto('/logs');

		const rows = page.getByTestId('log-row');
		await page.getByTestId('logs-filter-projects').click();
		const dialog = page.getByRole('dialog', { name: 'Filter by project' });
		await dialog.getByRole('button', { name: otherName }).click();
		await dialog.getByRole('button', { name: 'Apply' }).click();
		await expect(rows.filter({ hasText: otherNote })).toBeVisible();
		await expect(rows.filter({ hasText: personalNote })).toHaveCount(0);

		await page.getByTestId('logs-filter-projects').click();
		const again = page.getByRole('dialog', { name: 'Filter by project' });
		await again.getByRole('button', { name: 'Personal' }).click();
		await again.getByRole('button', { name: 'Apply' }).click();
		await expect(rows.filter({ hasText: otherNote })).toBeVisible();
		await expect(rows.filter({ hasText: personalNote })).toBeVisible();
	});

	test('activity filter distinguishes a type from None', async ({ page }) => {
		await login(page);
		const coded = uniqueNote('coded');
		const bare = uniqueNote('bare');
		await startSession(page, coded, undefined, 'coding');
		await stopSession(page);
		const start = localDayAt(0, 12, 0);
		const end = localDayAt(0, 13, 0);
		await seedManualSession(page, {
			note: bare,
			startedAt: start.toISOString(),
			endedAt: end.toISOString()
		});
		await page.goto('/logs');

		const rows = page.getByTestId('log-row');
		await page.getByTestId('logs-filter-activities').click();
		const dialog = page.getByRole('dialog', { name: 'Filter by activity' });
		await dialog.getByRole('button', { name: 'coding' }).click();
		await dialog.getByRole('button', { name: 'Apply' }).click();
		await expect(rows.filter({ hasText: coded })).toBeVisible();
		await expect(rows.filter({ hasText: bare })).toHaveCount(0);

		await page.getByTestId('logs-filter-activities').click();
		const noneDialog = page.getByRole('dialog', { name: 'Filter by activity' });
		await noneDialog.getByRole('button', { name: 'Any' }).click();
		await noneDialog.getByRole('button', { name: 'None', exact: true }).click();
		await noneDialog.getByRole('button', { name: 'Apply' }).click();
		await expect(rows.filter({ hasText: bare })).toBeVisible();
		await expect(rows.filter({ hasText: coded })).toHaveCount(0);
	});

	test('a date range hides the infinite-scroll sentinel', async ({ page }) => {
		await login(page);
		await seedStoppedSessions(page, 20);
		await page.goto('/logs');
		await expect(page.getByTestId('logs-sentinel')).toBeVisible();

		await page.getByTestId('logs-filter-dates').click();
		await page
			.getByRole('dialog', { name: 'Date range' })
			.getByRole('button', { name: 'Today' })
			.click();
		await expect(page.getByTestId('logs-sentinel')).toHaveCount(0);
		await expect(page.getByTestId('log-row').first()).toBeVisible();
	});
});

test.describe('logs layout', () => {
	test('grouped layout rolls up same-ticket sessions on a day', async ({ page }) => {
		await login(page);
		const ticket = `DEV-${Date.now().toString(36)}`;
		const notes = [uniqueNote('grp-a'), uniqueNote('grp-b'), uniqueNote('grp-c')];
		const spans: [number, number][] = [
			[9, 10],
			[11, 12],
			[14, 15]
		];
		for (let i = 0; i < notes.length; i++) {
			const [startHour, endHour] = spans[i]!;
			await seedManualSession(page, {
				note: notes[i]!,
				ticketId: ticket,
				startedAt: localDayAt(0, startHour, 0).toISOString(),
				endedAt: localDayAt(0, endHour, 0).toISOString()
			});
		}
		await page.goto('/logs');

		const layout = page.getByRole('group', { name: 'Log list layout' });
		await expect(layout.getByRole('button', { name: 'Entries' })).toHaveAttribute(
			'aria-pressed',
			'true'
		);
		for (const note of notes) {
			await expect(page.getByTestId('log-row').filter({ hasText: note })).toBeVisible();
		}
		await expect(page.getByTestId('log-group')).toHaveCount(0);

		await layout.getByRole('button', { name: 'Grouped' }).click();
		await expect(layout.getByRole('button', { name: 'Grouped' })).toHaveAttribute(
			'aria-pressed',
			'true'
		);
		const group = page.getByTestId('log-group').filter({ hasText: ticket });
		await expect(group).toBeVisible();
		await expect(group.getByText('3×')).toBeVisible();
		await expect(group.getByText('3h', { exact: true })).toBeVisible();
		for (const note of notes) {
			await expect(page.getByTestId('log-row').filter({ hasText: note })).toHaveCount(0);
		}

		await group.getByTestId('log-group-expand').click();
		const nested = page.getByTestId('log-group-sessions');
		await expect(nested.getByTestId('log-row')).toHaveCount(3);
		await expect(nested.getByRole('button', { name: 'Edit' }).first()).toBeVisible();
		await expect(nested.getByTestId('log-row').filter({ hasText: notes[0]! })).toBeVisible();
	});

	test('expands a truncated log description', async ({ page }) => {
		await login(page);
		const note = uniqueNote(
			'long-note ' +
				'hydrate the session store from the seed payload and keep the description visible '
					.repeat(4)
					.trim()
		);
		await seedManualSession(page, {
			note,
			startedAt: localDayAt(0, 8, 0).toISOString(),
			endedAt: localDayAt(0, 8, 30).toISOString()
		});
		await page.setViewportSize({ width: 1280, height: 720 });
		await page.goto('/logs');
		const row = page.getByTestId('log-row').filter({ hasText: note.slice(0, 24) });
		const toggle = row.getByTestId('log-note-expand');
		await expect(toggle).toBeVisible();
		await expect(toggle).toHaveAttribute('aria-expanded', 'false');
		await toggle.click();
		await expect(toggle).toHaveAttribute('aria-expanded', 'true');
		await expect(row.getByText(note)).toBeVisible();
	});
});
