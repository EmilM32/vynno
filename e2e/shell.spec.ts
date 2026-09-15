import { expect, test } from '@playwright/test';
import { desktopNav, login, spaGo, startSession, uniqueNote } from './helpers';

test.describe('desktop session chip', () => {
	test.use({ viewport: { width: 1280, height: 720 } });

	test('idle chip is hidden on the project dossier', async ({ page }) => {
		await login(page);
		await page.goto('/projects');
		await page.getByTestId('project-open').first().click();
		await expect(page).toHaveURL(/\/projects\/[^/]+$/);
		await expect(desktopNav(page).getByTestId('shell-session-chip')).toHaveCount(0);
		await expect(page.getByTestId('project-start')).toBeVisible();
	});

	test('idle chip is a start link to the timer', async ({ page }) => {
		await login(page);
		await page.goto('/dashboard');
		const chip = desktopNav(page).getByTestId('shell-session-chip');
		await expect(chip).toBeVisible();
		await expect(chip).toHaveText(/Start New Session/);
		await chip.click();
		await expect(page).toHaveURL(/\/timer$/);
		await expect(desktopNav(page).getByTestId('shell-session-chip')).toHaveCount(0);
		await expect(page.getByRole('button', { name: 'Start', exact: true })).toBeVisible();
	});

	test('live chip is hidden on timer and shows status off-page', async ({ page }) => {
		const note = uniqueNote('chip-live');
		await startSession(page, note);

		await expect(page.getByTestId('timer-status')).toHaveText('ACTIVE');
		await expect(desktopNav(page).getByTestId('shell-session-chip')).toHaveCount(0);
		await expect(page.getByTestId('timer-elapsed')).toHaveText(/\d{2}:\d{2}:\d{2}/);

		const routes = [
			['Dashboard', '/dashboard'],
			['Logs', '/logs'],
			['Insights', '/insights'],
			['Projects', '/projects'],
			['Settings', '/settings']
		] as const;
		for (const [label, href] of routes) {
			await spaGo(page, label, href);
			const chip = desktopNav(page).getByTestId('shell-session-chip');
			await expect(chip).toBeVisible();
			await expect(page.getByTestId('shell-session-status')).toHaveText('ACTIVE');
			await expect(page.getByTestId('shell-session-elapsed')).toHaveText(/\d{2}:\d{2}:\d{2}/);
			await expect(chip).toContainText(note);
		}

		await spaGo(page, 'Projects', '/projects');
		await page.getByTestId('project-open').first().click();
		await expect(page).toHaveURL(/\/projects\/[^/]+$/);
		const dossierChip = desktopNav(page).getByTestId('shell-session-chip');
		await expect(dossierChip).toBeVisible();
		await expect(page.getByTestId('shell-session-status')).toHaveText('ACTIVE');
		await expect(page.getByTestId('page-header-description')).toHaveCount(0);

		await spaGo(page, 'Timer', '/timer');
		await expect(desktopNav(page).getByTestId('shell-session-chip')).toHaveCount(0);
		await expect(page.getByTestId('timer-status')).toHaveText('ACTIVE');
	});

	test('chip is desktop-only', async ({ page }) => {
		await login(page);
		await page.goto('/dashboard');
		await expect(desktopNav(page).getByTestId('shell-session-chip')).toBeVisible();
		await page.setViewportSize({ width: 390, height: 844 });
		await expect(page.getByTestId('shell-session-chip')).toBeHidden();
		await expect(page.getByRole('status', { name: 'No active session' })).toBeVisible();
	});

	test('active chip ticks elapsed and still opens the timer', async ({ page }) => {
		const note = uniqueNote('chip-active');
		await startSession(page, note);
		await expect(page.getByTestId('timer-status')).toHaveText('ACTIVE');

		await spaGo(page, 'Insights', '/insights');
		await expect(page.getByTestId('shell-session-status')).toHaveText('ACTIVE');
		const first = await page.getByTestId('shell-session-elapsed').textContent();
		await expect
			.poll(async () => page.getByTestId('shell-session-elapsed').textContent(), { timeout: 3000 })
			.not.toBe(first);

		await desktopNav(page).getByTestId('shell-session-chip').click();
		await expect(page).toHaveURL(/\/timer$/);
		await expect(desktopNav(page).getByTestId('shell-session-chip')).toHaveCount(0);
		await expect(page.getByTestId('timer-status')).toHaveText('ACTIVE');
		await expect(page.getByRole('textbox', { name: 'Task description' })).toHaveValue(note);
	});
});
