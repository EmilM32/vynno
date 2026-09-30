import { expect, test, type Page } from '@playwright/test';
import { firstProjectId, login, uniqueNote, waitForClient } from './helpers';

const HOUR = 3_600_000;

/** A live session that started `hoursAgo` ago: start it, then move its start back. */
async function startLongSession(page: Page, hoursAgo: number) {
	const note = uniqueNote('long');
	const started = await page.request.post('/v1/sessions', {
		data: {
			projectId: await firstProjectId(page),
			note,
			ticketId: null,
			activityTypeId: null,
			targetDurationMs: null
		}
	});
	expect(started.ok()).toBe(true);
	const { id } = (await started.json()) as { id: string };
	const startedAt = new Date(Date.now() - hoursAgo * HOUR);
	startedAt.setSeconds(0, 0);
	const moved = await page.request.patch(`/v1/sessions/${id}`, {
		data: { startedAt: startedAt.toISOString() }
	});
	expect(moved.ok()).toBe(true);
	return { id, note, startedAt };
}

test.describe('long session reminder', () => {
	test.beforeEach(async ({ page }) => {
		await login(page);
	});

	test('asks after four hours and stays away once told to keep going', async ({ page }) => {
		const { note } = await startLongSession(page, 5);
		await page.goto('/dashboard');
		await waitForClient(page);

		const notice = page.getByTestId('long-session-notice');
		await expect(notice).toContainText(/Session running for 5h/);
		await expect(notice).toContainText(note);

		await notice.getByRole('button', { name: 'Keep going' }).click();
		await expect(notice).toHaveCount(0);
		await page.reload();
		await waitForClient(page);
		await expect(page.getByText(note).first()).toBeVisible();
		await expect(notice).toHaveCount(0);
	});

	test('Stop at… ends the session when the reminder was due', async ({ page }) => {
		const { id, startedAt } = await startLongSession(page, 5);
		await page.goto('/timer');
		await waitForClient(page);

		await page.getByTestId('long-session-notice').getByRole('button', { name: 'Stop at…' }).click();
		const dialog = page.getByRole('dialog', { name: 'Stop the session at' });
		const finished = dialog.getByLabel('Finished at');
		const expected = new Date(startedAt.getTime() + 4 * HOUR);
		const local = new Date(expected.getTime() - expected.getTimezoneOffset() * 60_000)
			.toISOString()
			.slice(0, 16);
		await expect(finished).toHaveValue(local);

		await dialog.getByRole('button', { name: 'Stop session' }).click();
		await expect(page.getByTestId('timer-status')).toHaveText('IDLE');
		await expect(page.getByTestId('long-session-notice')).toHaveCount(0);

		const row = (await (await page.request.get(`/v1/sessions/${id}`)).json()) as {
			status: string;
			endedAt: string;
		};
		expect(row.status).toBe('stopped');
		expect(Date.parse(row.endedAt)).toBe(expected.getTime());
	});

	test('rejects a finish time before the start', async ({ page }) => {
		const { startedAt } = await startLongSession(page, 5);
		await page.goto('/timer');
		await waitForClient(page);
		await page.getByTestId('long-session-notice').getByRole('button', { name: 'Stop at…' }).click();
		const dialog = page.getByRole('dialog', { name: 'Stop the session at' });
		const before = new Date(startedAt.getTime() - HOUR);
		await dialog
			.getByLabel('Finished at')
			.fill(
				new Date(before.getTime() - before.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
			);
		await expect(dialog.getByRole('button', { name: 'Stop session' })).toBeDisabled();
		await expect(page.getByTestId('timer-status')).toHaveText('ACTIVE');
	});

	test('can be turned off in Settings', async ({ page }) => {
		await startLongSession(page, 5);
		await page.goto('/settings');
		await waitForClient(page);
		await page.getByLabel(/Long session reminder/).selectOption('off');
		await page.goto('/timer');
		await waitForClient(page);
		await expect(page.getByTestId('timer-status')).toHaveText('ACTIVE');
		await expect(page.getByTestId('long-session-notice')).toHaveCount(0);
	});
});
