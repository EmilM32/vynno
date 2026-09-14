import { expect, test, type Page } from '@playwright/test';
import { firstProjectId, login, seedStoppedSessions } from './helpers';

async function contentBox(page: Page) {
	return page.locator('#main-content').evaluate((main) => {
		const style = getComputedStyle(main);
		const pad = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
		const view = main.querySelector('[data-testid="page-view"]');
		if (!(view instanceof HTMLElement)) {
			throw new Error('page-view not found');
		}
		return {
			mainInner: main.clientWidth - pad,
			viewWidth: view.getBoundingClientRect().width
		};
	});
}

async function scrollMain(page: Page, top: number) {
	const applied = await page.locator('#main-content').evaluate((el, y) => {
		el.scrollTop = y;
		return el.scrollTop;
	}, top);
	expect(applied, 'main should be a scroll container').toBeGreaterThan(top === 0 ? -1 : 0);
	if (top === 0) expect(applied).toBe(0);
}

/**
 * Activity types that already have sessions render the `sr-only` "cannot delete" spans.
 * Those are `position: absolute`, so they need a positioned ancestor -- see the single
 * scroll container test below.
 */
async function seedUsedActivityTypes(page: Page, count: number) {
	const projectId = await firstProjectId(page);
	for (let i = 0; i < count; i++) {
		const created = await page.request.post('/v1/activity-types', {
			data: { name: `layout_${i}_${Date.now().toString(36)}`, color: 'secondary' }
		});
		if (!created.ok()) {
			throw new Error(`POST /activity-types failed (${created.status()} ${await created.text()})`);
		}
		const { id } = (await created.json()) as { id: string };
		const started = await page.request.post('/v1/sessions', {
			data: { projectId, note: `layout-seed-${id}`, activityTypeId: id }
		});
		if (!started.ok()) {
			throw new Error(`POST /sessions failed (${started.status()} ${await started.text()})`);
		}
		const session = (await started.json()) as { id: string };
		const stopped = await page.request.post(`/v1/sessions/${session.id}/stop`);
		if (!stopped.ok()) {
			throw new Error(`POST /stop failed (${stopped.status()} ${await stopped.text()})`);
		}
	}
}

test.describe('desktop layout', () => {
	test.use({ viewport: { width: 1280, height: 720 } });

	for (const route of ['/settings', '/projects', '/timer'] as const) {
		test(`${route} fills the main column`, async ({ page }) => {
			await login(page);
			await page.goto(route);
			const { mainInner, viewWidth } = await contentBox(page);
			expect(mainInner).toBeGreaterThan(800);
			expect(viewWidth).toBeGreaterThan(800);
			expect(Math.abs(viewWidth - mainInner)).toBeLessThan(2);
		});
	}

	test('header stays pinned and hides the description when scrolled', async ({ page }) => {
		await login(page);
		await seedStoppedSessions(page, 16);
		await page.goto('/logs');
		const header = page.getByTestId('page-header');
		const title = page.getByRole('heading', { name: 'System Logs', level: 1 });
		const description = page.getByTestId('page-header-description');
		const search = page.getByRole('searchbox', { name: 'Search logs' });

		await expect(header).toHaveAttribute('data-compact', 'false');
		await expect(description).toBeVisible();
		await expect(title).toBeInViewport();

		await scrollMain(page, 400);

		await expect(header).toHaveAttribute('data-compact', 'true');
		await expect(title).toBeInViewport();
		await expect(search).toBeInViewport();
		await expect(description).toBeHidden();

		await scrollMain(page, 0);

		await expect(header).toHaveAttribute('data-compact', 'false');
		await expect(description).toBeVisible();
	});

	/**
	 * `#main-content` is the only scroller. An `absolute` descendant without a positioned
	 * ancestor resolves against the initial containing block, escapes main's overflow clip
	 * and stretches the document instead -- which shows up as a second scrollbar.
	 */
	test('settings keeps a single scroll container', async ({ page }) => {
		await login(page);
		await seedUsedActivityTypes(page, 6);
		await page.goto('/settings');
		await expect(page.getByTestId('activity-type-row')).toHaveCount(6);
		// The spans only render once the session counts land, so wait for the real condition.
		await expect(page.locator('[data-testid="activity-type-row"] span.sr-only')).toHaveCount(6);

		const scroll = await page.evaluate(() => {
			const doc = document.documentElement;
			const main = document.querySelector('#main-content')!;
			return {
				doc: doc.scrollHeight - doc.clientHeight,
				body: document.body.scrollHeight - doc.clientHeight,
				main: main.scrollHeight - main.clientHeight
			};
		});
		expect(scroll.doc, 'the document must not scroll').toBe(0);
		expect(scroll.body, 'the body must not scroll').toBeLessThanOrEqual(0);
		expect(scroll.main, 'main must still be the scroller').toBeGreaterThan(0);

		await scrollMain(page, 200);
	});

	test('timer session is a full-width instrument with a today rail', async ({ page }) => {
		await login(page);
		await page.goto('/timer');
		const header = page.getByTestId('page-header');
		const session = page.getByTestId('timer-session');
		const today = page.getByTestId('timer-today-summary');

		await expect(today).toBeVisible();
		await expect(today.getByTestId('timer-today-total')).toBeVisible();

		const headerBox = await header.boundingBox();
		const sessionBox = await session.boundingBox();
		expect(headerBox).toBeTruthy();
		expect(sessionBox).toBeTruthy();
		expect(Math.abs(sessionBox!.x - headerBox!.x)).toBeLessThan(2);
		expect(Math.abs(sessionBox!.width - headerBox!.width)).toBeLessThan(2);
	});
});
