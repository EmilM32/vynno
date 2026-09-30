import { expect, test } from '@playwright/test';
import {
	firstProjectId,
	localCivilDay,
	localDayAt,
	login,
	pastSpansOnCurrentDay,
	seedManualSession,
	spaGo,
	startSession,
	stopSession,
	uniqueNote,
	waitForClient
} from './helpers';

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

	test('year heatmap shades tracked days and counts the streak', async ({ page }) => {
		await login(page);
		const yesterday = localDayAt(1, 10);
		await seedManualSession(page, {
			note: uniqueNote('heat-yesterday'),
			startedAt: yesterday.toISOString(),
			endedAt: new Date(yesterday.getTime() + 3_600_000).toISOString()
		});
		const today = pastSpansOnCurrentDay(1, 30 * 60_000)[0]!;
		await seedManualSession(page, {
			note: uniqueNote('heat-today'),
			startedAt: today.startedAt.toISOString(),
			endedAt: today.endedAt.toISOString()
		});

		await page.goto('/dashboard');
		const heatmap = page.getByRole('region', { name: 'Last 12 months' });
		await expect(heatmap.getByTestId('heatmap-active')).toHaveText('2');
		await expect(heatmap.getByTestId('heatmap-streak')).toHaveText('2d');
		await expect(heatmap.getByTestId('heatmap-best')).toHaveText('2d');
		// An hour against the default 8h target is the lightest shade.
		await expect(heatmap.locator(`[data-date="${localCivilDay(yesterday)}"]`)).toHaveAttribute(
			'data-level',
			'1'
		);
		await expect(
			heatmap.getByRole('img', { name: /last 12 months: 2 active days/ })
		).toBeAttached();
	});

	test('year heatmap fills the card on a desktop width', async ({ page }) => {
		await page.setViewportSize({ width: 1280, height: 800 });
		await login(page);
		await page.goto('/dashboard');
		const heatmap = page.getByRole('region', { name: 'Last 12 months' });
		const scroller = heatmap.getByRole('region', { name: 'Year grid, newest week on the right' });
		const grid = heatmap.getByRole('img', { name: /last 12 months/ });
		await expect(grid).toBeAttached();

		const outer = (await scroller.boundingBox())!;
		const inner = (await grid.boundingBox())!;
		expect(Math.abs(inner.x - outer.x)).toBeLessThanOrEqual(1);
		expect(Math.abs(inner.x + inner.width - (outer.x + outer.width))).toBeLessThanOrEqual(1);
		expect(await scroller.evaluate((el) => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(0);

		const cell = (await heatmap
			.locator(`[data-date="${localCivilDay(new Date())}"]`)
			.boundingBox())!;
		expect(Math.abs(cell.width - cell.height)).toBeLessThanOrEqual(0.5);
		expect(cell.width).toBeGreaterThanOrEqual(9.5);
		expect(cell.width).toBeLessThanOrEqual(24.5);
	});

	test('year heatmap scrolls inside the card on a phone, newest week first', async ({ page }) => {
		await page.setViewportSize({ width: 390, height: 844 });
		await login(page);
		await page.goto('/dashboard');
		await waitForClient(page);
		const heatmap = page.getByRole('region', { name: 'Last 12 months' });
		const scroller = heatmap.getByRole('region', { name: 'Year grid, newest week on the right' });
		await scroller.scrollIntoViewIfNeeded();
		await expect(scroller).toHaveAttribute('tabindex', '0');

		const { overflow, fromNewest } = await scroller.evaluate((el) => ({
			overflow: el.scrollWidth - el.clientWidth,
			// Row-reversed: 0 is the newest (right) end, older weeks sit at negative offsets.
			fromNewest: Math.abs(el.scrollLeft)
		}));
		expect(overflow).toBeGreaterThan(0);
		expect(fromNewest).toBeLessThanOrEqual(1);
		await expect(heatmap.locator(`[data-date="${localCivilDay(new Date())}"]`)).toBeInViewport();
		await expect(heatmap.locator('[data-date]').first()).not.toBeInViewport();
		expect(
			await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
		).toBeLessThanOrEqual(0);

		// The weekday column sticks to the left edge while the weeks are scrolled.
		const box = (await scroller.boundingBox())!;
		const monday = (await heatmap.getByText('Mon', { exact: true }).boundingBox())!;
		expect(Math.abs(monday.x - box.x)).toBeLessThanOrEqual(1);

		await scroller.evaluate((el) => (el.scrollLeft = -el.scrollWidth));
		await expect(heatmap.locator('[data-date]').first()).toBeInViewport();
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

for (const viewport of [
	{ name: 'desktop', size: { width: 1280, height: 800 } },
	{ name: 'mobile', size: { width: 390, height: 844 } }
]) {
	test.describe(`dashboard long live note (${viewport.name})`, () => {
		test.use({ viewport: viewport.size });

		test('a 500-char live note and long ticket stay inside Current focus (EMI-68)', async ({
			page
		}) => {
			await login(page);
			const note = uniqueNote('live').padEnd(500, 'w');
			const ticket = `TICKET-${'X'.repeat(57)}`;
			const projectId = await firstProjectId(page);
			const started = await page.request.post('/v1/sessions', {
				data: { projectId, note, ticketId: ticket }
			});
			expect(started.status()).toBe(201);
			await page.goto('/dashboard');

			const text = page.getByTitle(note, { exact: true });
			await expect(text).toBeVisible();
			const clamp = await text.evaluate((el) => ({
				clamped: el.scrollHeight > el.clientHeight,
				fits: el.scrollWidth <= el.clientWidth
			}));
			expect(clamp).toEqual({ clamped: true, fits: true });
			const chip = page.getByTitle(ticket, { exact: true }).first();
			const chipFit = await chip.evaluate((el) => el.scrollWidth > el.clientWidth);
			expect(chipFit).toBe(true);
			expect(
				await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
			).toBe(true);
		});
	});
}
