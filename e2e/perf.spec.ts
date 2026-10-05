import { expect, test, type Locator, type Page, type Request } from '@playwright/test';
import { createProject, localCivilDay, login, seedManySessions } from './helpers';

/**
 * Long-range history drain (EMI-59). Opt-in: `npm run test:e2e:perf`
 * (`PERF_SESSIONS=30000` for the ticket's heavy account; default 5000).
 * Seeds one throwaway account through the API, then measures a fresh Insights
 * custom 1-year view and a fresh dossier "All" against the ticket's targets.
 * `PERF_CPU_THROTTLE=3` slows Chromium's CPU that many times, to check the margin a
 * slower machine has (EMI-194: the same build was ~2.5x slower on the QA host).
 */
const SESSIONS = Number(process.env.PERF_SESSIONS ?? 5_000);
const CPU_THROTTLE = Number(process.env.PERF_CPU_THROTTLE ?? 1);
const DAY_MS = 24 * 60 * 60 * 1000;
const YEAR_MS = 365 * DAY_MS;
const BULK_LIMIT = 100;

type Drain = {
	settleMs: number;
	requests: number;
	duplicateCursors: number;
	limits: string[];
	longestTaskMs: number;
	blockingMs: number;
};

test.describe('history drain', { tag: '@perf' }, () => {
	test.describe.configure({ timeout: 30 * 60_000 });

	test('Insights 1 year and dossier All settle within the EMI-59 targets', async ({ page }) => {
		await login(page);
		const projects = [];
		for (let i = 0; i < 20; i++) projects.push(await createProject(page, { name: `Perf ${i}` }));
		await seedManySessions(page, {
			count: SESSIONS,
			projectIds: projects.map((p) => p.id),
			spanMs: YEAR_MS - 2 * 24 * 60 * 60 * 1000
		});
		await page.addInitScript(() => {
			const w = window as Window & { __longTasks?: { start: number; duration: number }[] };
			w.__longTasks = [];
			new PerformanceObserver((list) => {
				for (const e of list.getEntries()) {
					w.__longTasks!.push({ start: e.startTime, duration: e.duration });
				}
			}).observe({ type: 'longtask', buffered: true });
		});

		if (CPU_THROTTLE > 1) {
			const cdp = await page.context().newCDPSession(page);
			await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU_THROTTLE });
		}
		await page.goto('/insights');
		await expectLongTaskObserver(page);
		await page.getByRole('button', { name: 'Custom' }).click();
		const dialog = page.getByRole('dialog', { name: 'Custom range' });
		await dialog.getByLabel('From').fill(localCivilDay(new Date(Date.now() - YEAR_MS)));
		await dialog.getByLabel('To').fill(localCivilDay(new Date()));
		const insights = await measureDrain(page, () =>
			dialog.getByRole('button', { name: 'Apply' }).click()
		);

		// The timeline's per-session views (Days, Projects) take ranges up to 62 days (ADR-0028).
		// History is loaded now, so this measures drawing them, not paging.
		await page.getByRole('button', { name: 'Custom' }).click();
		await dialog.getByLabel('From').fill(localCivilDay(new Date(Date.now() - 61 * DAY_MS)));
		await dialog.getByLabel('To').fill(localCivilDay(new Date()));
		const timeline = page.getByTestId('insights-timeline');
		const timelineDays = await measureDraw(page, timeline, 'Days', () =>
			dialog.getByRole('button', { name: 'Apply' }).click()
		);
		const timelineProjects = await measureDraw(page, timeline, 'Projects', () =>
			timeline.getByRole('button', { name: 'Projects', exact: true }).click()
		);

		await page.goto(`/projects/${projects[0]!.id}`);
		const period = page.getByRole('group', { name: 'Period' });
		await expect(period).toBeVisible();
		const dossier = await measureDrain(page, () =>
			period.getByRole('button', { name: 'All' }).click()
		);

		const report = {
			sessions: SESSIONS,
			cpuThrottle: CPU_THROTTLE,
			insights,
			timelineDays,
			timelineProjects,
			dossier
		};
		console.log(JSON.stringify(report, null, 2));
		test.info().annotations.push({ type: 'perf', description: JSON.stringify(report) });

		for (const run of [insights, dossier]) {
			expect(run.duplicateCursors).toBe(0);
			expect(run.limits).toEqual([String(BULK_LIMIT)]);
			expect(run.requests).toBeLessThanOrEqual(Math.ceil(SESSIONS / BULK_LIMIT) + 2);
			expect(run.settleMs).toBeLessThanOrEqual(5_000);
			expect(run.longestTaskMs).toBeLessThanOrEqual(200);
			expect(run.blockingMs).toBeLessThan(2_000);
		}
		for (const run of [timelineDays, timelineProjects]) {
			expect(run.marks).toBeGreaterThan(0);
			expect(run.longestTaskMs).toBeLessThanOrEqual(200);
			expect(run.blockingMs).toBeLessThan(2_000);
		}
	});
});

/**
 * Run `action`, wait until the timeline card shows `view` and its bars stop changing, and report
 * long tasks. The previous view's bars stay on screen for a moment, so the view is checked first.
 */
async function measureDraw(page: Page, card: Locator, view: string, action: () => Promise<void>) {
	const startedAt = await page.evaluate(() => performance.now());
	await action();
	await expect(
		card
			.getByRole('group', { name: 'Timeline view' })
			.getByRole('button', { name: view, exact: true })
	).toHaveAttribute('aria-pressed', 'true', { timeout: 30_000 });
	// Days and Projects draw one path per colour; the group carries the bar count.
	const bars = card.getByTestId('timeline-bars');
	const count = async () => Number((await bars.getAttribute('data-count')) ?? 0);
	await expect.poll(count, { timeout: 30_000 }).toBeGreaterThan(0);
	let marks = await count();
	await expect
		.poll(
			async () => {
				const now = await count();
				const settled = now === marks;
				marks = now;
				return settled;
			},
			{ timeout: 30_000, intervals: [250] }
		)
		.toBe(true);
	const tasks = await page.evaluate((from) => {
		const w = window as Window & { __longTasks?: { start: number; duration: number }[] };
		return (w.__longTasks ?? []).filter((t) => t.start >= from);
	}, startedAt);
	return {
		marks,
		longestTaskMs: Math.round(Math.max(0, ...tasks.map((t) => t.duration))),
		blockingMs: Math.round(tasks.reduce((sum, t) => sum + Math.max(0, t.duration - 50), 0))
	};
}

/** Run `action`, then wait until "Loading earlier sessions…" is gone and no page is in flight. */
async function measureDrain(page: Page, action: () => Promise<void>): Promise<Drain> {
	await page.waitForLoadState('networkidle');
	const cursors: string[] = [];
	const limits = new Set<string>();
	const inFlight = new Set<Request>();
	const isHistoryPage = (r: Request) => {
		const url = new URL(r.url());
		return (
			r.method() === 'GET' && url.pathname === '/v1/sessions' && url.searchParams.has('cursor')
		);
	};
	const onRequest = (r: Request) => {
		if (!isHistoryPage(r)) return;
		const url = new URL(r.url());
		cursors.push(url.searchParams.get('cursor')!);
		limits.add(url.searchParams.get('limit') ?? '');
		inFlight.add(r);
	};
	const onDone = (r: Request) => void inFlight.delete(r);
	page.on('request', onRequest);
	page.on('requestfinished', onDone);
	page.on('requestfailed', onDone);

	const startedAt = await page.evaluate(() => performance.now());
	const t0 = Date.now();
	await action();
	await expect.poll(() => cursors.length, { timeout: 10_000 }).toBeGreaterThan(0);
	const loading = page.getByText('Loading earlier sessions…');
	await expect
		.poll(async () => inFlight.size === 0 && !(await loading.isVisible()), {
			timeout: 25 * 60_000,
			intervals: [50]
		})
		.toBe(true);
	const settleMs = Date.now() - t0;

	page.off('request', onRequest);
	page.off('requestfinished', onDone);
	page.off('requestfailed', onDone);

	const tasks = await page.evaluate((from) => {
		const w = window as Window & { __longTasks?: { start: number; duration: number }[] };
		return (w.__longTasks ?? []).filter((t) => t.start >= from);
	}, startedAt);
	return {
		settleMs,
		requests: cursors.length,
		duplicateCursors: cursors.length - new Set(cursors).size,
		limits: [...limits],
		longestTaskMs: Math.round(Math.max(0, ...tasks.map((t) => t.duration))),
		blockingMs: Math.round(tasks.reduce((sum, t) => sum + Math.max(0, t.duration - 50), 0))
	};
}

/** Zero long tasks must mean a smooth load, not an observer that never fires. */
async function expectLongTaskObserver(page: Page) {
	// A task of its own: CDP `evaluate` work is not reported as a long task.
	const from = await page.evaluate(() => {
		const at = performance.now();
		setTimeout(() => {
			const start = performance.now();
			while (performance.now() - start < 120) {
				// Block the main thread on purpose.
			}
		}, 0);
		return at;
	});
	await expect
		.poll(() =>
			page.evaluate((since) => {
				const w = window as Window & { __longTasks?: { start: number; duration: number }[] };
				return (w.__longTasks ?? []).some((t) => t.start >= since && t.duration >= 100);
			}, from)
		)
		.toBe(true);
}
