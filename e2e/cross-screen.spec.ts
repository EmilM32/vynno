import { expect, test, type Page } from '@playwright/test';
import { spaGo, startSession, stopSession, uniqueNote } from './helpers';

async function selectedProjectLabel(page: Page): Promise<string> {
	return page.locator('#project-select').evaluate((el: HTMLSelectElement) => {
		return el.selectedOptions[0]?.textContent?.trim() ?? '';
	});
}

async function otherProjectLabel(page: Page, current: string): Promise<string | undefined> {
	const labels = await page.locator('#project-select option').allTextContents();
	return labels.map((t) => t.trim()).find((t) => t && t !== current);
}

/**
 * Cross-screen flows must use SPA navigation after mutations —
 * full reloads re-fetch from the API.
 */
test.describe('cross-screen data', () => {
	test.use({ viewport: { width: 1280, height: 720 } });

	test('stopped session appears in Logs (Flow C)', async ({ page }) => {
		const note = uniqueNote('xlog');
		await startSession(page, note);
		await stopSession(page);

		await spaGo(page, 'Logs', '/logs');
		await page.getByRole('searchbox', { name: 'Search logs' }).fill(note);
		await expect(page.getByTestId('log-row').filter({ hasText: note })).toBeVisible();
	});

	test('stopped session appears in Dashboard recent logs', async ({ page }) => {
		const note = uniqueNote('xdash');
		await startSession(page, note);
		await stopSession(page);

		await spaGo(page, 'Dashboard', '/dashboard');
		await expect(page.getByText(note)).toBeVisible();
	});

	test('restart from recent tasks (Flow D)', async ({ page }) => {
		const noteA = uniqueNote('recent-a');
		const noteB = uniqueNote('recent-b');

		await startSession(page, noteA);
		const projectA = await selectedProjectLabel(page);
		await stopSession(page);

		const otherProject = await otherProjectLabel(page, projectA);
		await startSession(page, noteB, otherProject);
		await stopSession(page);

		const older = page.getByTestId('recent-task-restart').filter({ hasText: noteA });
		await expect(older).toBeEnabled();
		const started = page.waitForRequest(
			(r) => r.method() === 'POST' && /\/v1\/sessions$/.test(new URL(r.url()).pathname)
		);
		await older.click();
		await started;

		await expect(page.getByTestId('timer-status')).toHaveText('ACTIVE');
		await expect(page.getByRole('textbox', { name: 'Task description' })).toHaveValue(noteA);
		await expect(page.locator('#project-select option:checked')).toHaveText(projectA);
		await expect(page.getByTestId('recent-task-restart').first()).toBeDisabled();
	});

	test('session survives SPA navigation', async ({ page }) => {
		const note = uniqueNote('spa');
		await startSession(page, note);

		await spaGo(page, 'Dashboard', '/dashboard');
		await expect(page.getByRole('heading', { name: 'Current Focus' })).toBeVisible();
		await expect(page.getByTestId('page-view').getByText(note, { exact: true })).toBeVisible();
		await expect(page.getByTestId('shell-session-status')).toHaveText('ACTIVE');

		await spaGo(page, 'Timer', '/timer');
		await expect(page.getByTestId('timer-status')).toHaveText('ACTIVE');
	});

	test('restart from dashboard recent log while idle', async ({ page }) => {
		await startSession(page, uniqueNote('restart-dash'));
		await stopSession(page);
		await spaGo(page, 'Dashboard', '/dashboard');
		const restart = page.getByRole('button', { name: /^Restart / }).first();
		// Button is opacity-0 until hover; force click still runs the handler
		await restart.click({ force: true });
		await expect(page).toHaveURL(/\/timer$/);
		await expect(page.getByTestId('timer-status')).toHaveText('ACTIVE');
	});
});
