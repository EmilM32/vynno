import { expect, test } from '@playwright/test';
import { desktopNav, login, spaGo, startSession, uniqueNote } from './helpers';

test.describe('desktop session chip', () => {
	test.use({ viewport: { width: 1280, height: 720 } });

	test('idle chip is a start link to the timer', async ({ page }) => {
		await login(page);
		await page.goto('/dashboard');
		const chip = desktopNav(page).getByTestId('shell-session-chip');
		await expect(chip).toBeVisible();
		await expect(chip).toHaveText(/Start New Session/);
		await chip.click();
		await expect(page).toHaveURL(/\/timer$/);
	});

	test('live chip shows status, elapsed, and the note', async ({ page }) => {
		const note = uniqueNote('chip-live');
		await startSession(page, note);

		const chip = desktopNav(page).getByTestId('shell-session-chip');
		await expect(chip).toBeVisible();
		await expect(page.getByTestId('shell-session-status')).toHaveText('ACTIVE');
		await expect(page.getByTestId('shell-session-elapsed')).toHaveText(/\d{2}:\d{2}:\d{2}/);
		await expect(chip).toContainText(note);

		const routes = [
			['Dashboard', '/dashboard'],
			['Logs', '/logs'],
			['Insights', '/insights'],
			['Projects', '/projects'],
			['Settings', '/settings']
		] as const;
		for (const [label, href] of routes) {
			await spaGo(page, label, href);
			await expect(page.getByTestId('shell-session-status')).toHaveText('ACTIVE');
			await expect(chip).toContainText(note);
		}
	});

	test('chip is desktop-only', async ({ page }) => {
		await login(page);
		await page.goto('/dashboard');
		await expect(desktopNav(page).getByTestId('shell-session-chip')).toBeVisible();
		await page.setViewportSize({ width: 390, height: 844 });
		await expect(page.getByTestId('shell-session-chip')).toBeHidden();
		await expect(page.getByRole('status', { name: 'No active session' })).toBeVisible();
	});

	test('paused chip freezes elapsed and still opens the timer', async ({ page }) => {
		const note = uniqueNote('chip-pause');
		await startSession(page, note);
		await page.getByRole('button', { name: 'Pause' }).click();
		await expect(page.getByTestId('timer-status')).toHaveText('PAUSED');

		await spaGo(page, 'Insights', '/insights');
		await expect(page.getByTestId('shell-session-status')).toHaveText('PAUSED');
		const frozen = await page.getByTestId('shell-session-elapsed').textContent();
		await page.waitForTimeout(600);
		await expect(page.getByTestId('shell-session-elapsed')).toHaveText(frozen!);

		await desktopNav(page).getByTestId('shell-session-chip').click();
		await expect(page).toHaveURL(/\/timer$/);
		await expect(page.getByTestId('timer-status')).toHaveText('PAUSED');
		await expect(page.getByRole('textbox', { name: 'Task description' })).toHaveValue(note);
	});
});
