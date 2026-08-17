import { expect, test } from '@playwright/test';
import { login, spaGo, startSession, uniqueNote } from './helpers';

test.describe('dashboard', () => {
	test('renders core regions', async ({ page }) => {
		await login(page);
		await page.goto('/dashboard');

		await expect(page.getByText("Today's Total")).toBeVisible();
		await expect(page.getByTestId('today-total')).toBeVisible();
		await expect(page.getByRole('heading', { name: 'Current Focus' })).toBeVisible();
		await expect(page.getByRole('region', { name: 'Active projects' })).toBeVisible();
		await expect(page.getByRole('region', { name: 'Weekly overview' })).toBeVisible();
		await expect(page.getByText('Recent Logs')).toBeVisible();
	});

	test('weekly overview has day bars', async ({ page }) => {
		await login(page);
		await page.goto('/dashboard');
		const week = page.getByRole('region', { name: 'Weekly overview' });
		await expect(week.getByText('Weekly Overview')).toBeVisible();
		// Day labels Mon–Sun (bars are focusable buttons)
		await expect(week.getByText('Mon', { exact: true })).toBeVisible();
		await expect(week.getByText('Sun', { exact: true })).toBeVisible();
		await expect(week.getByRole('button', { name: /Mon:/ })).toBeVisible();
	});

	test('current focus empty when idle', async ({ page }) => {
		await login(page);
		await page.goto('/dashboard');
		await expect(page.getByText('No active session. Start tracking from the Timer.')).toBeVisible();
		await expect(page.getByRole('link', { name: /Start session/i })).toBeVisible();
	});
});

test.describe('dashboard active focus (SPA)', () => {
	test.use({ viewport: { width: 1280, height: 720 } });

	test('shows task after start via sidebar nav', async ({ page }) => {
		const note = uniqueNote('focus-spa');
		await startSession(page, note);
		await spaGo(page, 'Dashboard', '/dashboard');
		await expect(page.getByText(note, { exact: true })).toBeVisible();
		await expect(page.getByText('No active session')).toHaveCount(0);
	});

	test('pause, resume, and stop from current focus', async ({ page }) => {
		const note = uniqueNote('focus-controls');
		await startSession(page, note);
		await spaGo(page, 'Dashboard', '/dashboard');
		await expect(page.getByText(note, { exact: true })).toBeVisible();

		await page.getByRole('button', { name: 'Pause' }).click();
		await expect(page.getByText('PAUSED', { exact: true })).toBeVisible();
		await expect(page.getByRole('button', { name: 'Resume' })).toBeVisible();

		const frozen = await page.getByRole('button', { name: 'Resume' }).textContent();
		await page.waitForTimeout(600);
		await expect(page.getByRole('button', { name: 'Resume' })).toHaveText(frozen!);

		await page.getByRole('button', { name: 'Resume' }).click();
		await expect(page.getByText('PAUSED', { exact: true })).toHaveCount(0);
		await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible();

		await page.getByRole('button', { name: 'Stop' }).click();
		await expect(page.getByText('No active session. Start tracking from the Timer.')).toBeVisible();
		await expect(page.getByRole('link', { name: /Start session/i })).toBeVisible();
	});
});
