import { expect, test, type Page } from '@playwright/test';

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

test.describe('desktop layout', () => {
	test.use({ viewport: { width: 1280, height: 720 } });

	for (const route of ['/settings', '/projects', '/timer'] as const) {
		test(`${route} fills the main column`, async ({ page }) => {
			await page.goto(route);
			const { mainInner, viewWidth } = await contentBox(page);
			expect(mainInner).toBeGreaterThan(800);
			expect(viewWidth).toBeGreaterThan(800);
			expect(Math.abs(viewWidth - mainInner)).toBeLessThan(2);
		});
	}

	test('header stays pinned and hides the description when scrolled', async ({ page }) => {
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

	test('timer session is a full-width instrument with a today rail', async ({ page }) => {
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
