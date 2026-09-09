import { expect, test } from '@playwright/test';
import {
	firstProjectId,
	localDayAt,
	login,
	seedManualSession,
	spaGo,
	startSession,
	stopSession,
	uniqueNote,
	waitForClient
} from './helpers';

test.describe('projects', () => {
	test.beforeEach(async ({ page }) => {
		await login(page);
		await page.goto('/projects');
		await waitForClient(page);
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
		await page.locator('#project-progress').fill('60');
		const [request] = await Promise.all([
			page.waitForRequest(
				(r) => r.method() === 'POST' && /\/v1\/projects$/.test(new URL(r.url()).pathname)
			),
			page.getByRole('button', { name: 'Create project' }).click()
		]);
		expect(request.postDataJSON()).toMatchObject({ name, progressPercent: 60 });

		await expect(page.getByTestId('project-list').getByText(name)).toBeVisible();
		await expect(page.getByRole('alert')).toHaveCount(0); // no validation / store errors

		await page.goto('/dashboard');
		const card = page.getByTestId('active-project-card').filter({ hasText: name });
		await expect(card).toBeVisible();
		await expect(card.getByText('60%')).toBeVisible();
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
		await expect(page.getByTestId('error-page')).toHaveCount(0);
	});

	test('can edit and delete a project entry', async ({ page }) => {
		const note = uniqueNote('proj-entry');
		await page.goto('/timer');
		await startSession(page, note);
		const projectName = await page.locator('#project-select').evaluate((el: HTMLSelectElement) => {
			return el.selectedOptions[0]?.textContent?.trim() ?? '';
		});
		await stopSession(page);

		await page.goto('/projects');
		await page.getByTestId('project-open').filter({ hasText: projectName }).click();
		await expect(page).toHaveURL(/\/projects\/[^/]+$/);

		const row = page.getByTestId('log-row').filter({ hasText: note });
		await expect(row).toBeVisible();
		await expect(row.getByRole('button', { name: 'Edit' })).toBeVisible();
		await expect(row.getByRole('button', { name: 'Delete' })).toBeVisible();

		await row.getByRole('button', { name: 'Edit' }).click();
		const edited = `${note}-renamed`;
		const editDialog = page.getByRole('dialog', { name: 'Edit session' });
		await editDialog.getByLabel('Task').fill(edited);
		const startVal = await editDialog.getByLabel('Start').inputValue();
		const [datePart, timePart] = startVal.split('T');
		const [hh, mm] = timePart.split(':').map(Number);
		const laterMin = mm + 5;
		const endTime = `${String(hh + Math.floor(laterMin / 60)).padStart(2, '0')}:${String(laterMin % 60).padStart(2, '0')}`;
		await editDialog.getByLabel('End').fill(`${datePart}T${endTime}`);
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

test.describe('project entries filters', () => {
	test('default chrome is All dates / activities, no project picker', async ({ page }) => {
		await login(page);
		await page.goto(`/projects/${await firstProjectId(page)}`);
		const entries = page.getByTestId('project-entries');
		await expect(entries.getByTestId('logs-filter-dates')).toHaveText(/All dates/);
		await expect(entries.getByTestId('logs-filter-activities')).toHaveText(/All activities/);
		await expect(entries.getByTestId('logs-filter-projects')).toHaveCount(0);
		await expect(entries.getByRole('button', { name: 'Entries' })).toHaveAttribute(
			'aria-pressed',
			'true'
		);
	});

	test('Today hides a yesterday entry and Clear restores it', async ({ page }) => {
		await login(page);
		const yesterdayNote = uniqueNote('proj-yest');
		const todayNote = uniqueNote('proj-today');
		await seedManualSession(page, {
			note: yesterdayNote,
			startedAt: localDayAt(1, 10, 0).toISOString(),
			endedAt: localDayAt(1, 11, 0).toISOString()
		});
		await seedManualSession(page, {
			note: todayNote,
			startedAt: localDayAt(0, 9, 0).toISOString(),
			endedAt: localDayAt(0, 10, 0).toISOString()
		});
		await page.goto(`/projects/${await firstProjectId(page)}`);
		await page.getByRole('button', { name: 'All', exact: true }).click();
		const entries = page.getByTestId('project-entries');
		const rows = entries.getByTestId('log-row');
		await expect(rows.filter({ hasText: yesterdayNote })).toBeVisible();
		await expect(rows.filter({ hasText: todayNote })).toBeVisible();

		await entries.getByTestId('logs-filter-dates').click();
		await page
			.getByRole('dialog', { name: 'Date range' })
			.getByRole('button', { name: 'Today' })
			.click();
		await expect(entries.getByTestId('logs-filter-dates')).toContainText('Today');
		await expect(rows.filter({ hasText: todayNote })).toBeVisible();
		await expect(rows.filter({ hasText: yesterdayNote })).toHaveCount(0);

		await entries.getByTestId('logs-filter-clear').click();
		await expect(entries.getByTestId('logs-filter-dates')).toHaveText(/All dates/);
		await expect(rows.filter({ hasText: yesterdayNote })).toBeVisible();
	});

	test('grouped layout rolls up same-ticket sessions', async ({ page }) => {
		await login(page);
		const ticket = `DEV-${Date.now().toString(36)}`;
		const notes = [uniqueNote('pgrp-a'), uniqueNote('pgrp-b'), uniqueNote('pgrp-c')];
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
		await page.goto(`/projects/${await firstProjectId(page)}`);
		const entries = page.getByTestId('project-entries');
		for (const note of notes) {
			await expect(entries.getByTestId('log-row').filter({ hasText: note })).toBeVisible();
		}

		await entries.getByRole('button', { name: 'Grouped' }).click();
		const group = entries.getByTestId('log-group').filter({ hasText: ticket });
		await expect(group).toBeVisible();
		await expect(group.getByText('3×')).toBeVisible();
		await expect(group.getByText('3h', { exact: true })).toBeVisible();
		for (const note of notes) {
			await expect(entries.getByTestId('log-row').filter({ hasText: note })).toHaveCount(0);
		}

		await group.getByTestId('log-group-expand').click();
		await expect(entries.getByTestId('log-group-sessions').getByTestId('log-row')).toHaveCount(3);
	});
});
