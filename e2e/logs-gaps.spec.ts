import { expect, test } from '@playwright/test';
import { localDayAt, login, seedManualSession, uniqueNote, waitForClient } from './helpers';

/** `datetime-local` value for a local Date. */
function localInput(d: Date): string {
	return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

test.describe('logs untracked gaps', () => {
	test.beforeEach(async ({ page }) => {
		await login(page);
		// Yesterday, so the three rows share one day whatever the time now:
		// 09:00–10:00, a 2h gap, 12:00–13:00, a 30 min break, 13:30–14:00.
		for (const [from, to] of [
			[9, 10],
			[12, 13],
			[13.5, 14]
		] as const) {
			await seedManualSession(page, {
				note: uniqueNote('gap'),
				startedAt: localDayAt(1, Math.floor(from), (from % 1) * 60).toISOString(),
				endedAt: localDayAt(1, Math.floor(to), (to % 1) * 60).toISOString()
			});
		}
		await page.goto('/logs');
		await waitForClient(page);
	});

	test('marks only the long gap and prefills an entry for it', async ({ page }) => {
		const gaps = page.getByTestId('log-gap');
		await expect(gaps).toHaveCount(1);
		await expect(gaps.first()).toContainText('2h untracked · 10:00 - 12:00');

		await gaps.first().getByRole('button', { name: 'Add entry for 10:00 - 12:00' }).click();
		const dialog = page.getByRole('dialog', { name: 'Manual time entry' });
		await expect(dialog.getByLabel('Start', { exact: true })).toHaveValue(
			localInput(localDayAt(1, 10))
		);
		await expect(dialog.getByLabel('End', { exact: true })).toHaveValue(
			localInput(localDayAt(1, 12))
		);

		await dialog.getByLabel('Task').fill(uniqueNote('filled'));
		await dialog.getByRole('button', { name: 'Add' }).click();
		await expect(dialog).toHaveCount(0);
		await expect(gaps).toHaveCount(0);
	});

	test('hides gaps while rows are filtered or grouped', async ({ page }) => {
		await expect(page.getByTestId('log-gap')).toHaveCount(1);
		await page.getByRole('searchbox', { name: /search/i }).fill('gap');
		await expect(page.getByTestId('log-gap')).toHaveCount(0);
		await page.getByRole('searchbox', { name: /search/i }).fill('');
		await expect(page.getByTestId('log-gap')).toHaveCount(1);
		await page
			.getByRole('group', { name: /layout/i })
			.getByRole('button', { name: 'Grouped' })
			.click();
		await expect(page.getByTestId('log-gap')).toHaveCount(0);
	});
});
