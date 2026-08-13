import { expect, test } from '@playwright/test';
import { spaGo, startSession, stopSession, uniqueNote } from './helpers';

/**
 * Cross-screen flows must use SPA navigation after mutations —
 * full reloads re-seed the mock repository and drop the session.
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
		await page.goto('/timer');
		const firstTask = page.getByTestId('recent-task-restart').first();
		await expect(firstTask).toBeEnabled();

		await firstTask.click();
		await expect(page.getByTestId('timer-status')).toHaveText('ACTIVE');
		await expect(page.getByTestId('recent-task-restart').first()).toBeDisabled();
	});

	test('session survives SPA navigation', async ({ page }) => {
		const note = uniqueNote('spa');
		await startSession(page, note);

		await spaGo(page, 'Dashboard', '/dashboard');
		await expect(page.getByRole('heading', { name: 'Current Focus' })).toBeVisible();
		await expect(page.getByText(note, { exact: true })).toBeVisible();

		await spaGo(page, 'Timer', '/timer');
		await expect(page.getByTestId('timer-status')).toHaveText('ACTIVE');
	});

	test('restart from dashboard recent log while idle', async ({ page }) => {
		await page.goto('/dashboard');
		const restart = page.getByRole('button', { name: /^Restart / }).first();
		// Button is opacity-0 until hover; force click still runs the handler
		await restart.click({ force: true });
		await expect(page).toHaveURL(/\/timer$/);
		await expect(page.getByTestId('timer-status')).toHaveText('ACTIVE');
	});
});
