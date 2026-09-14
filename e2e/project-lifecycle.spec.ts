import { expect, test } from '@playwright/test';
import {
	archiveProject,
	createProject,
	expectApiError,
	keepOnlyActiveProject,
	listProjects,
	localDayAt,
	login,
	seedManualSession,
	uniqueNote,
	waitForClient
} from './helpers';

/**
 * Project lifecycle: archive / restore / delete guards and code uniqueness.
 *
 * Deliberately not `projects.spec.ts` — that filename is in the `mobile` project's `testMatch`,
 * and the Edit / Archive / Delete action row wraps at 390px. These run on chromium only.
 *
 * A freshly registered account owns exactly one project ("Personal") and zero sessions
 * (vynno-api `internal/service/auth.go`), which is what makes the guard cases deterministic.
 */

function projectName(prefix: string): string {
	return `${prefix} ${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

/** Project ids are UUIDs, so `#<id>` is not a valid CSS selector — match the attribute. */
function byId(id: string) {
	return `[id="${id}"]`;
}

test.describe('project archive and restore', () => {
	test('archives a project off the active tab and restores it', async ({ page }) => {
		await login(page);
		const name = projectName('Arch');
		await createProject(page, { name });

		await page.goto('/projects');
		await waitForClient(page);
		const row = page.getByTestId('project-row').filter({ hasText: name });
		await expect(row).toBeVisible();

		const [res] = await Promise.all([
			page.waitForResponse(
				(r) =>
					r.request().method() === 'POST' &&
					/\/v1\/projects\/[^/]+\/archive$/.test(new URL(r.url()).pathname)
			),
			row.getByRole('button', { name: 'Archive' }).click()
		]);
		expect(res.status()).toBe(200);
		expect(await res.json()).toMatchObject({ archived: true });

		await expect(page.getByTestId('project-list').getByText(name)).toHaveCount(0);
		await page.getByRole('tab', { name: /Archived/ }).click();
		const archivedRow = page.getByTestId('project-row').filter({ hasText: name });
		await expect(archivedRow).toBeVisible();

		const [restored] = await Promise.all([
			page.waitForResponse(
				(r) =>
					r.request().method() === 'POST' &&
					/\/v1\/projects\/[^/]+\/restore$/.test(new URL(r.url()).pathname)
			),
			archivedRow.getByRole('button', { name: 'Restore' }).click()
		]);
		expect(restored.status()).toBe(200);
		expect(await restored.json()).toMatchObject({ archived: false });

		await page.getByRole('tab', { name: /Active/ }).click();
		await expect(page.getByTestId('project-row').filter({ hasText: name })).toBeVisible();
	});

	test('starting a session on an archived project is rejected', async ({ page }) => {
		await login(page);
		const project = await createProject(page, { name: projectName('Arch start') });
		await archiveProject(page, project.id);

		const res = await page.request.post('/v1/sessions', {
			data: { projectId: project.id, note: uniqueNote('archived') },
			failOnStatusCode: false
		});
		await expectApiError(res, 409, 'project_archived');

		// The Timer picker is fed by the non-archived list, so the project is not even offered.
		await page.goto('/timer');
		await waitForClient(page);
		await expect(
			page.locator('#project-select').locator('option', { hasText: project.name })
		).toHaveCount(0);
	});
});

test.describe('project delete guards', () => {
	test('a project with sessions cannot be deleted', async ({ page }) => {
		await login(page);
		const project = await createProject(page, { name: projectName('Has sessions') });
		await seedManualSession(page, {
			projectId: project.id,
			note: uniqueNote('delete-blocker'),
			startedAt: localDayAt(1, 10).toISOString(),
			endedAt: localDayAt(1, 11).toISOString()
		});

		await expectApiError(
			await page.request.delete(`/v1/projects/${project.id}`, { failOnStatusCode: false }),
			409,
			'project_has_sessions'
		);

		await page.goto('/projects');
		await waitForClient(page);
		const row = page.getByTestId('project-row').filter({ hasText: project.name });
		await expect(row.getByRole('button', { name: 'Delete' })).toBeDisabled();
		// Reason text settles once the per-project session-count fan-out lands.
		await expect(page.locator(byId(`${project.id}-delete-reason`))).toHaveText(
			'Projects with sessions cannot be deleted — archive instead'
		);
	});

	test('the last active project cannot be archived or deleted', async ({ page }) => {
		await login(page);
		const [personal] = await listProjects(page);
		expect(personal).toBeTruthy();
		await keepOnlyActiveProject(page, personal!.id);

		await expectApiError(
			await page.request.delete(`/v1/projects/${personal!.id}`, { failOnStatusCode: false }),
			409,
			'last_active_project'
		);
		await expectApiError(
			await page.request.post(`/v1/projects/${personal!.id}/archive`, { failOnStatusCode: false }),
			409,
			'last_active_project'
		);

		await page.goto('/projects');
		await waitForClient(page);
		const row = page.getByTestId('project-row').filter({ hasText: personal!.name });
		await expect(row.getByRole('button', { name: 'Archive' })).toBeDisabled();
		await expect(page.locator(byId(`${personal!.id}-archive-reason`))).toHaveText(
			'Cannot archive the last active project'
		);
	});

	test('a project with no sessions is deleted through the confirm dialog', async ({ page }) => {
		await login(page);
		const name = projectName('Disposable');
		await createProject(page, { name });

		await page.goto('/projects');
		await waitForClient(page);
		const row = page.getByTestId('project-row').filter({ hasText: name });
		const deleteButton = row.getByRole('button', { name: 'Delete' });
		// Enables only after the session count for this project comes back as 0.
		await expect(deleteButton).toBeEnabled();
		await deleteButton.click();

		const dialog = page.getByRole('dialog', { name: 'Delete project?' });
		await expect(dialog).toBeVisible();
		const [res] = await Promise.all([
			page.waitForResponse(
				(r) =>
					r.request().method() === 'DELETE' &&
					/\/v1\/projects\/[^/]+$/.test(new URL(r.url()).pathname)
			),
			dialog.getByRole('button', { name: 'Delete' }).click()
		]);
		expect(res.status()).toBe(204);
		await expect(page.getByTestId('project-row').filter({ hasText: name })).toHaveCount(0);
	});
});

test.describe('project listing and codes', () => {
	test('the default list omits archived; includeArchived returns them', async ({ page }) => {
		await login(page);
		const name = projectName('Hidden');
		const project = await createProject(page, { name });
		await archiveProject(page, project.id);

		const byDefault = await listProjects(page);
		expect(byDefault.some((p) => p.id === project.id)).toBe(false);

		const withArchived = await listProjects(page, { includeArchived: true });
		expect(withArchived.find((p) => p.id === project.id)).toMatchObject({ archived: true });

		// Archived projects must still resolve by id so logs keep their label.
		const single = await page.request.get(`/v1/projects/${project.id}`);
		expect(single.status()).toBe(200);

		// The SPA fetches everything once and splits it across the two tabs. The seed request
		// itself is issued during SSR, so it is deliberately not asserted from the browser here.
		await page.goto('/projects');
		await waitForClient(page);
		await expect(page.getByTestId('project-list').getByText(name)).toHaveCount(0);
		await page.getByRole('tab', { name: /Archived/ }).click();
		await expect(page.getByTestId('project-row').filter({ hasText: name })).toBeVisible();
	});

	test('renaming works and a duplicate code is rejected', async ({ page }) => {
		await login(page);
		const code = `E2E${Date.now().toString(36).slice(-4)}`.toUpperCase().slice(0, 8);
		await createProject(page, { name: projectName('Code owner'), code });
		const other = await createProject(page, { name: projectName('Rename me') });

		await page.goto('/projects');
		await waitForClient(page);
		await page
			.getByTestId('project-row')
			.filter({ hasText: other.name })
			.getByRole('button', { name: 'Edit' })
			.click();
		const dialog = page.getByRole('dialog', { name: 'Edit project' });
		await expect(dialog).toBeVisible();

		const renamed = `${other.name} renamed`;
		await dialog.getByLabel('Name').fill(renamed);
		const [patch] = await Promise.all([
			page.waitForRequest(
				(r) => r.method() === 'PATCH' && /\/v1\/projects\/[^/]+$/.test(new URL(r.url()).pathname)
			),
			dialog.getByRole('button', { name: 'Save changes' }).click()
		]);
		expect(patch.postDataJSON()).toMatchObject({ name: renamed });
		await expect(page.getByTestId('project-list').getByText(renamed)).toBeVisible();

		// Code uniqueness is case-insensitive among non-deleted projects.
		await page
			.getByTestId('project-row')
			.filter({ hasText: renamed })
			.getByRole('button', { name: 'Edit' })
			.click();
		await expect(dialog).toBeVisible();
		await dialog.locator('#project-code').fill(code.toLowerCase());
		const [res] = await Promise.all([
			page.waitForResponse(
				(r) =>
					r.request().method() === 'PATCH' &&
					/\/v1\/projects\/[^/]+$/.test(new URL(r.url()).pathname)
			),
			dialog.getByRole('button', { name: 'Save changes' }).click()
		]);
		expect(res.status()).toBe(409);
		expect(await res.json()).toMatchObject({ error: { code: 'code_in_use' } });
		await expect(dialog.getByRole('alert')).toContainText('That project code is already in use.');
	});
});
