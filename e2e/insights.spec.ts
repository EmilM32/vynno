import { expect, test, type Locator, type Page } from '@playwright/test';
import {
	createProject,
	firstProjectId,
	localCivilDay,
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
		await page
			.getByRole('group', { name: 'Period' })
			.getByRole('button', { name: 'Month' })
			.click();

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

	test('tagged sub-second sessions do not appear as 0s · 0% rows', async ({ page }) => {
		const span = pastSpansOnCurrentDay(1)[0]!;
		const typeName = uniqueNote('QA-Focus');
		const created = await page.request.post('/v1/activity-types', {
			data: { name: typeName, color: 'secondary' }
		});
		expect(created.ok(), await created.text()).toBeTruthy();
		const { id } = (await created.json()) as { id: string };

		await seedManualSession(page, {
			note: uniqueNote('untagged'),
			startedAt: span.startedAt.toISOString(),
			endedAt: span.endedAt.toISOString(),
			activityTypeId: null
		});
		const tinyEnd = span.endedAt;
		await seedManualSession(page, {
			note: uniqueNote('tiny'),
			startedAt: new Date(tinyEnd.getTime() - 500).toISOString(),
			endedAt: tinyEnd.toISOString(),
			activityTypeId: id
		});

		await page.goto('/insights');
		await waitForClient(page);
		await page
			.getByRole('group', { name: 'Period' })
			.getByRole('button', { name: 'Month' })
			.click();

		const activity = page.getByRole('region', { name: 'Time by activity', exact: true });
		await expect(activity.getByText('Unassigned')).toBeVisible();
		await expect(activity.getByText(typeName)).toHaveCount(0);
		await expect(activity.getByText(/0s · 0%/)).toHaveCount(0);

		const breakdown = page.getByRole('region', { name: 'Activity breakdown', exact: true });
		await expect(breakdown.getByText('Unassigned')).toHaveCount(1);
		await expect(breakdown.getByText(typeName)).toHaveCount(0);
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
		await page
			.getByRole('group', { name: 'Period' })
			.getByRole('button', { name: 'Month' })
			.click();
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

	test('project donut keeps six projects plus Other inside its card (EMI-61)', async ({ page }) => {
		const spans = pastSpansOnCurrentDay(8, 10 * 60_000);
		for (let i = 0; i < spans.length; i++) {
			const project = await createProject(page, { name: `Donut ${i} ${Date.now().toString(36)}` });
			await seedManualSession(page, {
				projectId: project.id,
				note: uniqueNote(`donut-${i}`),
				startedAt: spans[i]!.startedAt.toISOString(),
				endedAt: spans[i]!.endedAt.toISOString()
			});
		}
		await page.goto('/insights');
		await waitForClient(page);

		const donut = page.getByRole('region', { name: 'Time by project', exact: true });
		await expect(donut.getByRole('link', { name: /^Open Donut/ })).toHaveCount(6);
		const other = donut.getByText('Other', { exact: true });
		await expect(other).toBeVisible();
		await expectRingHolds(donut);

		const card = (await donut.boundingBox())!;
		for (const item of [...(await donut.getByRole('link').all()), other]) {
			const box = (await item.boundingBox())!;
			expect(box.x + box.width).toBeLessThanOrEqual(card.x + card.width + 0.5);
			expect(box.y + box.height).toBeLessThanOrEqual(card.y + card.height + 0.5);
		}
	});

	test('project donut ring holds 140px with four projects (EMI-61)', async ({ page }) => {
		const spans = pastSpansOnCurrentDay(4, 10 * 60_000);
		for (let i = 0; i < spans.length; i++) {
			const project = await createProject(page, { name: `Ring ${i} ${Date.now().toString(36)}` });
			await seedManualSession(page, {
				projectId: project.id,
				note: uniqueNote(`ring-${i}`),
				startedAt: spans[i]!.startedAt.toISOString(),
				endedAt: spans[i]!.endedAt.toISOString()
			});
		}
		await page.goto('/insights');
		await waitForClient(page);

		const donut = page.getByRole('region', { name: 'Time by project', exact: true });
		await expect(donut.getByRole('link', { name: /^Open Ring/ })).toHaveCount(4);
		await expectRingHolds(donut);
	});

	test('breakdown shows 20 rows plus the rest, and a keyboard toggle for all (EMI-88 N2-05)', async ({
		page
	}) => {
		const typeIds: string[] = [];
		for (let t = 0; t < 6; t++) {
			const created = await page.request.post('/v1/activity-types', {
				data: { name: uniqueNote(`Cap${t}`), color: 'secondary' }
			});
			expect(created.ok(), await created.text()).toBeTruthy();
			typeIds.push(((await created.json()) as { id: string }).id);
		}
		const spans = pastSpansOnCurrentDay(30, 60_000);
		for (let p = 0; p < 5; p++) {
			const project = await createProject(page, { name: `Cap ${p} ${Date.now().toString(36)}` });
			for (let t = 0; t < 6; t++) {
				const span = spans[p * 6 + t]!;
				await seedManualSession(page, {
					projectId: project.id,
					activityTypeId: typeIds[t]!,
					note: uniqueNote(`cap-${p}-${t}`),
					startedAt: span.startedAt.toISOString(),
					endedAt: span.endedAt.toISOString()
				});
			}
		}
		await page.goto('/insights');
		await waitForClient(page);

		const breakdown = page.getByRole('region', { name: 'Activity breakdown', exact: true });
		const rows = breakdown.locator('tbody tr');
		await expect(rows).toHaveCount(21);
		await expect(breakdown.getByTestId('breakdown-rest')).toContainText('+10 more');

		const showAll = breakdown.getByRole('button', { name: 'Show all (30)' });
		await expect(showAll).toHaveAttribute('aria-expanded', 'false');
		await showAll.focus();
		await page.keyboard.press('Enter');
		await expect(rows).toHaveCount(30);
		await expect(breakdown.getByTestId('breakdown-rest')).toHaveCount(0);

		const showFewer = breakdown.getByRole('button', { name: 'Show fewer' });
		await expect(showFewer).toHaveAttribute('aria-expanded', 'true');
		await expect(showFewer).toBeFocused();
		await page.keyboard.press('Enter');
		await expect(rows).toHaveCount(21);
	});

	test('a long range pages history at the bulk size without repeats (EMI-59)', async ({
		page
	}, testInfo) => {
		test.skip(testInfo.project.name === 'mobile', 'network shape, not layout');
		const projectId = await firstProjectId(page);
		// 240 stopped sessions over ~60 days: the SSR page holds 15, the rest must drain.
		await seedSpread(page, projectId, 240, 6 * 60 * 60 * 1000);

		const insights = watchHistoryPages(page);
		await page.goto('/insights');
		await waitForClient(page);
		await page.getByRole('button', { name: 'Custom' }).click();
		const dialog = page.getByRole('dialog', { name: 'Custom range' });
		await dialog.getByLabel('From').fill(localCivilDay(new Date(Date.now() - 70 * 86_400_000)));
		await dialog.getByLabel('To').fill(localCivilDay(new Date()));
		await dialog.getByRole('button', { name: 'Apply' }).click();
		await insights.settled();

		const dossier = watchHistoryPages(page);
		await page.goto(`/projects/${projectId}`);
		await waitForClient(page);
		await page.getByRole('group', { name: 'Period' }).getByRole('button', { name: 'All' }).click();
		await dossier.settled();
	});

	test('compares the week so far with the same span last week', async ({ page }) => {
		const span = pastSpansOnCurrentDay(1)[0]!;
		const weekEarlier = (d: Date) => new Date(d.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
		const hours = ((span.endedAt.getTime() - span.startedAt.getTime()) / 3_600_000).toFixed(1);
		const delta = page.getByTestId('insights-vs-previous');

		await seedManualSession(page, {
			note: uniqueNote('last-week'),
			startedAt: weekEarlier(span.startedAt),
			endedAt: weekEarlier(span.endedAt)
		});
		await page.reload();
		await waitForClient(page);
		await expect(delta).toContainText(
			`${hours === '0.0' ? '' : '\u2212'}${hours}h vs previous period`
		);

		await seedManualSession(page, {
			note: uniqueNote('this-week'),
			startedAt: span.startedAt.toISOString(),
			endedAt: span.endedAt.toISOString()
		});
		await page.reload();
		await waitForClient(page);
		await expect(delta).toHaveText('0.0h vs previous period');
		await expect(page.getByText('Total Time')).toHaveCount(0);
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

/**
 * The ring is at least 140px across and the centre total sits above the legend. Layerchart
 * sizes the arcs from a measured container a frame after the SVG mounts, so poll the geometry
 * instead of reading it once (this used to be a Vite + Chromium unit test that flaked under
 * load: EMI-87 N-16, EMI-88 N2-01).
 */
async function expectRingHolds(donut: Locator) {
	const measure = () =>
		donut.evaluate((region) => {
			const svg = region.querySelector('svg.lc-layout-svg');
			if (!(svg instanceof SVGSVGElement)) return null;
			const box = svg.querySelector('g')?.getBBox();
			const total = region.querySelector('[role="img"] .tabular-nums')?.getBoundingClientRect();
			const legend = region.querySelector('.border-t')?.getBoundingClientRect();
			if (!box || !total || !legend) return null;
			return {
				svgHeight: svg.getBoundingClientRect().height,
				diameter: Math.max(box.width, box.height),
				totalBottom: total.bottom,
				legendTop: legend.top
			};
		});

	await expect.poll(async () => (await measure())?.diameter ?? 0).toBeGreaterThanOrEqual(140);
	const ring = (await measure())!;
	expect(ring.svgHeight).toBeGreaterThanOrEqual(140);
	expect(ring.totalBottom).toBeLessThanOrEqual(ring.legendTop);
}

/** Stopped sessions packed backwards from 2 days ago, `gapMs` apart, 30 min each. */
async function seedSpread(page: Page, projectId: string, count: number, gapMs: number) {
	const newest = Date.now() - 2 * 86_400_000;
	for (let batch = 0; batch < count; batch += 20) {
		await Promise.all(
			Array.from({ length: Math.min(20, count - batch) }, (_, j) => {
				const startedAt = newest - (batch + j) * gapMs;
				return seedManualSession(page, {
					projectId,
					note: uniqueNote(`spread-${batch + j}`),
					startedAt: new Date(startedAt).toISOString(),
					endedAt: new Date(startedAt + 30 * 60_000).toISOString()
				});
			})
		);
	}
}

/**
 * Record `GET /v1/sessions?cursor=…` from now on. `settled()` waits for the drain to finish,
 * then checks every page used the bulk size and no cursor was requested twice (EMI-81).
 */
function watchHistoryPages(page: Page) {
	const cursors: string[] = [];
	const limits = new Set<string>();
	const onRequest = (r: { url(): string; method(): string }) => {
		const url = new URL(r.url());
		if (r.method() !== 'GET' || url.pathname !== '/v1/sessions') return;
		const cursor = url.searchParams.get('cursor');
		if (!cursor) return;
		cursors.push(cursor);
		limits.add(url.searchParams.get('limit') ?? '');
	};
	page.on('request', onRequest);
	return {
		async settled() {
			await expect.poll(() => cursors.length).toBeGreaterThanOrEqual(2);
			await expect(page.getByText('Loading earlier sessions…')).toHaveCount(0);
			await page.waitForLoadState('networkidle');
			page.off('request', onRequest);
			expect([...limits]).toEqual(['100']);
			expect(new Set(cursors).size).toBe(cursors.length);
		}
	};
}
