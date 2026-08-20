import { expect, test } from '@playwright/test';
import { login, uniqueNote } from './helpers';

test.describe('timer lifecycle', () => {
	test.beforeEach(async ({ page }) => {
		await login(page);
		await page.goto('/timer');
	});

	test('idle state on load', async ({ page }) => {
		const timer = page.getByRole('region', { name: 'Session timer' });
		await expect(timer).toBeVisible();
		await expect(page.getByTestId('timer-status')).toHaveText('IDLE');
		await expect(page.getByTestId('timer-elapsed')).toHaveText('00:00:00');
		await expect(page.getByRole('button', { name: 'Start', exact: true })).toBeVisible();
		await expect(page.getByLabel('Activity')).toBeVisible();
		await expect(page.getByLabel('Activity')).toHaveValue('');
	});

	test('start posts to sessions', async ({ page }) => {
		const note = uniqueNote('http-start');
		await page.getByRole('textbox', { name: 'Task description' }).fill(note);
		const [request] = await Promise.all([
			page.waitForRequest(
				(r) => r.method() === 'POST' && /\/v1\/sessions$/.test(new URL(r.url()).pathname)
			),
			page.getByRole('button', { name: 'Start', exact: true }).click()
		]);
		expect(request.postDataJSON()).toMatchObject({ note, activityType: null });
		await expect(page.getByTestId('timer-status')).toHaveText('ACTIVE');
	});

	test('start posts selected activity type', async ({ page }) => {
		const note = uniqueNote('activity');
		await page.getByRole('textbox', { name: 'Task description' }).fill(note);
		await page.locator('#activity-select').selectOption('coding');
		const [request] = await Promise.all([
			page.waitForRequest(
				(r) => r.method() === 'POST' && /\/v1\/sessions$/.test(new URL(r.url()).pathname)
			),
			page.getByRole('button', { name: 'Start', exact: true }).click()
		]);
		expect(request.postDataJSON()).toMatchObject({ note, activityType: 'coding' });
		await expect(page.getByTestId('timer-status')).toHaveText('ACTIVE');
	});

	test('start with note and project (Flow A)', async ({ page }) => {
		const note = uniqueNote('start');
		await page.getByRole('textbox', { name: 'Task description' }).fill(note);
		await page.locator('#project-select').selectOption({ label: 'Personal' });
		await page.getByRole('button', { name: 'Start', exact: true }).click();

		await expect(page.getByTestId('timer-status')).toHaveText('ACTIVE');
		await expect(page.getByTestId('timer-project')).toContainText('PERS');
		await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible();
		await expect(page.getByRole('button', { name: 'Stop' })).toBeVisible();
		await expect(page.getByTestId('timer-elapsed')).toHaveText(/\d{2}:\d{2}:\d{2}/);

		// Clock should advance at least once while active
		const first = await page.getByTestId('timer-elapsed').textContent();
		await expect
			.poll(async () => page.getByTestId('timer-elapsed').textContent(), { timeout: 3000 })
			.not.toBe(first);
	});

	test('start via Enter key', async ({ page }) => {
		const note = uniqueNote('enter');
		const input = page.getByRole('textbox', { name: 'Task description' });
		await input.fill(note);
		await input.press('Enter');
		await expect(page.getByTestId('timer-status')).toHaveText('ACTIVE');
	});

	test('pause and resume (Flow B)', async ({ page }) => {
		await page.getByRole('textbox', { name: 'Task description' }).fill(uniqueNote('pause'));
		await page.getByRole('button', { name: 'Start', exact: true }).click();
		await expect(page.getByTestId('timer-status')).toHaveText('ACTIVE');

		await page.getByRole('button', { name: 'Pause' }).click();
		await expect(page.getByTestId('timer-status')).toHaveText('PAUSED');
		await expect(page.getByRole('button', { name: 'Resume' })).toBeVisible();
		await expect(page.getByRole('button', { name: 'Stop' })).toBeVisible();

		const frozen = await page.getByTestId('timer-elapsed').textContent();
		await page.waitForTimeout(600);
		await expect(page.getByTestId('timer-elapsed')).toHaveText(frozen!);

		await page.getByRole('button', { name: 'Resume' }).click();
		await expect(page.getByTestId('timer-status')).toHaveText('ACTIVE');
	});

	test('stop returns to idle (Flow C)', async ({ page }) => {
		const note = uniqueNote('stop');
		await page.getByRole('textbox', { name: 'Task description' }).fill(note);
		await page.getByRole('button', { name: 'Start', exact: true }).click();
		await expect(page.getByTestId('timer-status')).toHaveText('ACTIVE');
		const [stopReq] = await Promise.all([
			page.waitForRequest(
				(r) => r.method() === 'POST' && r.url().includes('/sessions/') && r.url().includes('/stop')
			),
			page.getByRole('button', { name: 'Stop' }).click()
		]);
		expect(stopReq.method()).toBe('POST');

		await expect(page.getByTestId('timer-status')).toHaveText('IDLE');
		await expect(page.getByRole('button', { name: 'Start', exact: true })).toBeVisible();
		await expect(page.getByRole('textbox', { name: 'Task description' })).toBeEnabled();
		await expect(page.locator('#project-select')).toBeEnabled();
		await expect(page.locator('#activity-select')).toBeEnabled();
		// Draft keeps last finished note
		await expect(page.getByRole('textbox', { name: 'Task description' })).toHaveValue(note);
	});

	test('inputs locked while active', async ({ page }) => {
		await page.getByRole('textbox', { name: 'Task description' }).fill(uniqueNote('lock'));
		await page.getByRole('button', { name: 'Start', exact: true }).click();
		await expect(page.getByRole('textbox', { name: 'Task description' })).toBeDisabled();
		await expect(page.locator('#project-select')).toBeDisabled();
		await expect(page.locator('#activity-select')).toBeDisabled();
	});

	test('restart from recent task blocked while busy', async ({ page }) => {
		await page.getByRole('textbox', { name: 'Task description' }).fill(uniqueNote('prior'));
		await page.getByRole('button', { name: 'Start', exact: true }).click();
		await expect(page.getByTestId('timer-status')).toHaveText('ACTIVE');
		await page.getByRole('button', { name: 'Stop' }).click();
		await expect(page.getByRole('button', { name: 'Start', exact: true })).toBeVisible();

		await page.getByRole('textbox', { name: 'Task description' }).fill(uniqueNote('busy'));
		await page.getByRole('button', { name: 'Start', exact: true }).click();
		await expect(page.getByTestId('timer-status')).toHaveText('ACTIVE');
		await expect(page.getByTestId('recent-task-restart').first()).toBeDisabled();
	});
});
