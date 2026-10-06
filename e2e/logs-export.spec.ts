import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { localDayAt, login, seedManualSession, uniqueNote, waitForClient } from './helpers';

/** Built from the code point so the BOM stays visible in source. */
const BOM_START = new RegExp(`^${String.fromCharCode(0xfeff)}`);

async function save(page: Page, name: string) {
	const dialog = page.getByRole('dialog', { name: 'Export logs' });
	const [download] = await Promise.all([
		page.waitForEvent('download'),
		dialog.getByRole('button', { name }).click()
	]);
	const text = await readFile((await download.path())!, 'utf8');
	return { name: download.suggestedFilename(), text };
}

test.describe('logs export', () => {
	const tag = uniqueNote('exp');

	test.beforeEach(async ({ page }) => {
		await login(page);
		await seedManualSession(page, {
			note: `=HYPERLINK("x") ${tag}`,
			ticketId: 'DEV-1',
			startedAt: localDayAt(1, 9).toISOString(),
			endedAt: localDayAt(1, 10, 30).toISOString()
		});
		await seedManualSession(page, {
			note: `Review, then merge ${tag}`,
			startedAt: localDayAt(1, 13).toISOString(),
			endedAt: localDayAt(1, 14).toISOString()
		});
		await page.goto('/logs');
		await waitForClient(page);
	});

	test('downloads the filtered entries as CSV and JSON', async ({ page }) => {
		await page.getByRole('searchbox', { name: 'Search logs' }).fill(tag);
		await page.getByRole('button', { name: 'Export' }).click();
		const dialog = page.getByRole('dialog', { name: 'Export logs' });
		await expect(dialog.getByTestId('logs-export-count')).toHaveText('2');

		const csv = await save(page, 'Entries CSV');
		expect(csv.name).toMatch(/^vynno-entries-all-\d{4}-\d{2}-\d{2}\.csv$/);
		const lines = csv.text.replace(BOM_START, '').trimEnd().split('\r\n');
		expect(lines[0]).toBe(
			'date,start,end,duration_minutes,duration_hours,project,project_code,activity,ticket,note,started_at,ended_at'
		);
		expect(lines).toHaveLength(3);
		expect(lines[1]).toContain(`,09:00,10:30,90,1.5,`);
		expect(lines[1]).toContain(`"'=HYPERLINK(""x"") ${tag}"`);
		expect(lines[2]).toContain(`"Review, then merge ${tag}"`);

		const json = await save(page, 'Entries JSON');
		expect(JSON.parse(json.text)).toMatchObject([
			{ ticket: 'DEV-1', duration_minutes: 90 },
			{ note: `Review, then merge ${tag}` }
		]);

		await expect(dialog.getByRole('button', { name: 'Timesheet CSV' })).toBeDisabled();
		await expect(dialog).toContainText('Timesheet needs a date range of up to 62 days.');
	});

	test('downloads a timesheet for a date range', async ({ page }, testInfo) => {
		test.skip(testInfo.project.name === 'mobile', 'desktop date chip');
		await page.getByTestId('logs-filter-dates').click();
		await page
			.getByRole('dialog', { name: 'Date range' })
			.getByRole('button', { name: 'Yesterday' })
			.click();
		await page.getByRole('button', { name: 'Export' }).click();
		const dialog = page.getByRole('dialog', { name: 'Export logs' });
		await expect(dialog.getByTestId('logs-export-count')).toHaveText('2');

		const sheet = await save(page, 'Timesheet CSV');
		const day = localDayAt(1);
		const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
		expect(sheet.name).toBe(`vynno-timesheet-${key}_${key}.csv`);
		const lines = sheet.text.replace(BOM_START, '').trimEnd().split('\r\n');
		expect(lines[0]).toBe(`project,project_code,${key},total`);
		expect(lines.at(-1)).toBe('total,,2.5,2.5');
	});

	test('typing right after Esc on the dialog lands in the search box (EMI-144)', async ({
		page
	}) => {
		const search = page.getByRole('searchbox', { name: 'Search logs' });
		const exportButton = page.getByRole('button', { name: 'Export' });
		await exportButton.click();
		await expect(page.getByRole('dialog', { name: 'Export logs' })).toBeVisible();
		await page.keyboard.press('Escape');
		// The page is handed back as soon as the exit starts, not after it.
		await expect(exportButton).toBeFocused({ timeout: 100 });
		await search.fill(tag);
		await expect(search).toHaveValue(tag);
		await exportButton.click();
		await expect(page.getByTestId('logs-export-count')).toHaveText('2');
	});
});
