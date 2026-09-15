import { expect, test } from '@playwright/test';
import { login, spaGo, startSession, stopSession, uniqueNote } from './helpers';

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

	test('weekly overview empty state lists the week', async ({ page }) => {
		await login(page);
		await page.goto('/dashboard');
		const week = page.getByRole('region', { name: 'Weekly overview' });
		await expect(week.getByText('Weekly Overview')).toBeVisible();
		await expect(week.getByText('Not enough data yet')).toBeVisible();
		const days = week.getByRole('listitem');
		await expect(days).toHaveCount(7);
		const labels = await days.allTextContents();
		expect(labels[0]?.trim()).toMatch(/^Mon: 0s/);
		expect(labels[6]?.trim()).toMatch(/^Sun: 0s/);
	});

	test('current focus empty when idle', async ({ page }) => {
		await login(page);
		await page.goto('/dashboard');
		await expect(page.getByText('No active session.')).toBeVisible();
		await expect(page.getByRole('link', { name: 'Go to Timer' })).toBeVisible();
	});
});

test.describe('dashboard active focus (SPA)', () => {
	test.use({ viewport: { width: 1280, height: 720 } });

	test('shows task after start via sidebar nav', async ({ page }) => {
		const note = uniqueNote('focus-spa');
		await startSession(page, note);
		await spaGo(page, 'Dashboard', '/dashboard');
		const view = page.getByTestId('page-view');
		await expect(view.getByText(note, { exact: true })).toBeVisible();
		await expect(view.getByText('No active session')).toHaveCount(0);
	});

	test('stop from current focus', async ({ page }) => {
		const note = uniqueNote('focus-controls');
		await startSession(page, note);
		await spaGo(page, 'Dashboard', '/dashboard');
		const view = page.getByTestId('page-view');
		await expect(view.getByText(note, { exact: true })).toBeVisible();
		await expect(page.getByRole('button', { name: 'Pause' })).toHaveCount(0);

		await page.getByRole('button', { name: 'Stop' }).click();
		await expect(view.getByText('No active session.')).toBeVisible();
		await expect(page.getByRole('link', { name: 'Go to Timer' })).toBeVisible();
	});

	test('recent log play is disabled while live', async ({ page }) => {
		await startSession(page, uniqueNote('prior-log'));
		await stopSession(page);
		await startSession(page, uniqueNote('live-now'));
		await spaGo(page, 'Dashboard', '/dashboard');
		const play = page.getByRole('button', { name: 'Stop the current session first' });
		await expect(play.first()).toBeDisabled();
	});
});
