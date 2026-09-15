import { expect, test } from '@playwright/test';
import {
	login,
	pastSpansOnCurrentDay,
	seedManualSession,
	uniqueNote,
	waitForClient
} from './helpers';

test.describe('insights', () => {
	test.beforeEach(async ({ page }) => {
		await login(page);
		await page.goto('/insights');
		// The period buttons are SSR'd; clicking one before Kit mounts drops the event.
		await waitForClient(page);
	});

	test('renders range chrome and chart regions (Flow F)', async ({ page }) => {
		await expect(page.getByRole('heading', { name: 'Insights' })).toBeVisible();
		await expect(page.getByTestId('insight-range-label')).toBeVisible();
		await expect(page.getByTestId('insight-range-label')).not.toHaveText('');
		await expect(page.getByText('Total Time')).toHaveCount(0);
		await expect(page.getByText('Most Productive Day')).toHaveCount(0);

		await expect(page.getByRole('region', { name: 'Time by project', exact: true })).toBeVisible();
		await expect(page.getByRole('region', { name: 'Time by activity', exact: true })).toBeVisible();
		await expect(
			page.getByRole('region', { name: 'Activity breakdown', exact: true })
		).toBeVisible();
	});

	test('week / 2 weeks / month grains and prev/next', async ({ page }) => {
		const period = page.getByRole('group', { name: 'Period' });
		const week = period.getByRole('button', { name: 'Week', exact: true });
		const twoWeeks = period.getByRole('button', { name: '2 weeks' });
		const month = period.getByRole('button', { name: 'Month' });
		const label = page.getByTestId('insight-range-label');
		const next = page.getByRole('button', { name: 'Next period' });
		const prev = page.getByRole('button', { name: 'Previous period' });

		await expect(week).toHaveAttribute('aria-pressed', 'true');
		await expect(month).toHaveAttribute('aria-pressed', 'false');
		await expect(next).toBeDisabled();

		const weekLabel = await label.textContent();
		expect(weekLabel).toBeTruthy();

		await month.click();
		await expect(month).toHaveAttribute('aria-pressed', 'true');
		await expect(week).toHaveAttribute('aria-pressed', 'false');
		await expect(label).toHaveText(/\d{4}/);

		await twoWeeks.click();
		await expect(twoWeeks).toHaveAttribute('aria-pressed', 'true');
		await expect(label).not.toHaveText('');

		await prev.click();
		await expect(next).toBeEnabled();
		await next.click();
		await expect(next).toBeDisabled();
	});

	test('untagged sessions show as Unassigned, not zero bars', async ({ page }) => {
		const span = pastSpansOnCurrentDay(1)[0]!;
		await seedManualSession(page, {
			note: uniqueNote('untagged'),
			startedAt: span.startedAt.toISOString(),
			endedAt: span.endedAt.toISOString(),
			activityTypeId: null
		});
		await page.goto('/insights');
		await waitForClient(page);
		await page.getByRole('group', { name: 'Period' }).getByRole('button', { name: 'Month' }).click();

		const activity = page.getByRole('region', { name: 'Time by activity', exact: true });
		await expect(activity.getByText('Unassigned')).toBeVisible();
		await expect(activity.getByText(/0s · 0%/)).toHaveCount(0);

		const breakdown = page.getByRole('region', { name: 'Activity breakdown', exact: true });
		// Activity column is `hidden md:table-cell`; the row still exists in the table.
		await expect(breakdown.getByText('Unassigned')).toHaveCount(1);
		await expect(breakdown.locator('tbody tr')).toHaveCount(1);
		await expect(breakdown.getByText('0s', { exact: true })).toHaveCount(0);
		await expect(breakdown.getByText('0%', { exact: true })).toHaveCount(0);
	});

	test('desktop activity card matches donut height', async ({ page }, testInfo) => {
		test.skip(testInfo.project.name === 'mobile', 'desktop shared row');
		await expect(page.getByRole('region', { name: 'Time by project', exact: true })).toBeVisible();
		const donut = page.getByRole('region', { name: 'Time by project', exact: true });
		const activity = page.getByRole('region', { name: 'Time by activity', exact: true });
		const donutBox = await donut.boundingBox();
		const activityBox = await activity.boundingBox();
		expect(donutBox).toBeTruthy();
		expect(activityBox).toBeTruthy();
		expect(Math.abs(donutBox!.height - activityBox!.height)).toBeLessThan(2);
	});

	test('activity heading peeks above the fold on mobile', async ({ page }, testInfo) => {
		test.skip(testInfo.project.name !== 'mobile', 'mobile fold');
		await page.getByRole('group', { name: 'Period' }).getByRole('button', { name: 'Month' }).click();
		const heading = page.getByRole('heading', { name: 'Time by Activity' });
		await expect(heading).toBeVisible();
		const box = await heading.boundingBox();
		const viewport = page.viewportSize();
		expect(box).toBeTruthy();
		expect(viewport).toBeTruthy();
		expect(box!.y).toBeGreaterThan(0);
		expect(box!.y).toBeLessThan(viewport!.height);
	});

	test('grain and civil label sit on one line', async ({ page }) => {
		const period = page.getByRole('group', { name: 'Period' });
		const label = page.getByTestId('insight-range-label');
		await expect(period).toBeVisible();
		const periodBox = await period.boundingBox();
		const labelBox = await label.boundingBox();
		expect(periodBox).toBeTruthy();
		expect(labelBox).toBeTruthy();
		expect(
			Math.abs(periodBox!.y + periodBox!.height / 2 - (labelBox!.y + labelBox!.height / 2))
		).toBeLessThan(16);
	});

	test('custom range dialog validates inverted dates', async ({ page }) => {
		await page.getByRole('button', { name: 'Custom' }).click();
		const dialog = page.getByRole('dialog', { name: 'Custom range' });
		await expect(dialog).toBeVisible();

		const from = dialog.getByLabel('From');
		const to = dialog.getByLabel('To');
		await from.fill('2026-03-11');
		await to.fill('2026-03-01');
		await expect(dialog.getByText('From must be on or before To.')).toBeVisible();
		await expect(dialog.getByRole('button', { name: 'Apply' })).toBeDisabled();

		await dialog.getByRole('button', { name: 'Cancel' }).click();
		await expect(dialog).toBeHidden();
	});
});

test.describe('insights SSR seed', () => {
	test('renders from the SSR seed without refetching the first page', async ({ page }) => {
		await login(page);
		const span = pastSpansOnCurrentDay(1)[0]!;
		await seedManualSession(page, {
			note: uniqueNote('insights-seed'),
			startedAt: span.startedAt.toISOString(),
			endedAt: span.endedAt.toISOString()
		});

		// The seed page is fetched server-side in +layout.server.ts, so the browser should never
		// ask for it again. Paging backwards through `ensureThrough` carries a cursor and is fine.
		const seedRefetches: string[] = [];
		page.on('request', (r) => {
			if (r.method() !== 'GET') return;
			const url = new URL(r.url());
			if (url.pathname === '/v1/sessions' && !url.searchParams.has('cursor')) {
				seedRefetches.push(r.url());
			}
		});

		const response = await page.goto('/insights');
		expect(await response!.text()).toContain('Time by project');

		await waitForClient(page);
		await expect(page.getByRole('region', { name: 'Time by project' })).toBeVisible();
		await expect(page.getByTestId('insight-range-label')).not.toHaveText('');
		expect(seedRefetches).toEqual([]);
	});
});
