import { expect, test } from '@playwright/test';
import { desktopNav, login, mobileNav } from './helpers';

const tabRoutes = [
	{ href: '/timer', label: 'Timer' },
	{ href: '/dashboard', label: 'Dashboard' },
	{ href: '/logs', label: 'Logs' },
	{ href: '/insights', label: 'Insights' },
	{ href: '/projects', label: 'Projects' }
] as const;

test.describe('navigation', () => {
	test('root redirects to login', async ({ page }) => {
		await page.goto('/');
		await expect(page).toHaveURL(/\/login$/);
	});

	test('brand Vynno is visible in shell', async ({ page }, testInfo) => {
		await login(page);
		await page.goto('/dashboard');
		// Desktop: sidebar h1; mobile: top bar
		if (testInfo.project.name === 'mobile') {
			await expect(page.getByRole('banner').getByText('Vynno')).toBeVisible();
		} else {
			await expect(desktopNav(page).getByText('Vynno', { exact: true })).toBeVisible();
		}
	});

	test('primary nav reaches all six routes', async ({ page }, testInfo) => {
		await login(page);
		await page.goto('/dashboard');
		const mobile = testInfo.project.name === 'mobile';
		const nav = mobile ? mobileNav(page) : desktopNav(page);

		for (const route of tabRoutes) {
			await nav.getByRole('link', { name: route.label, exact: true }).click();
			await expect(page).toHaveURL(new RegExp(`${route.href}$`));
			await expect(nav.getByRole('link', { name: route.label, exact: true })).toHaveAttribute(
				'aria-current',
				'page'
			);
		}

		if (mobile) {
			await expect(nav.getByRole('link', { name: 'Settings', exact: true })).toHaveCount(0);
			const banner = page.getByRole('banner');
			await expect(banner.getByRole('button', { name: 'Open command palette' })).toBeVisible();
			const settings = banner.getByRole('link', { name: 'Settings' });
			await expect(settings).toBeVisible();
			await settings.click();
			await expect(page).toHaveURL(/\/settings$/);
			await expect(settings).toHaveAttribute('aria-current', 'page');
			await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible();
		} else {
			await nav.getByRole('link', { name: 'Settings', exact: true }).click();
			await expect(page).toHaveURL(/\/settings$/);
			await expect(nav.getByRole('link', { name: 'Settings', exact: true })).toHaveAttribute(
				'aria-current',
				'page'
			);
		}
	});

	test('active route highlights only current destination', async ({ page }, testInfo) => {
		await login(page);
		await page.goto('/logs');
		const nav = testInfo.project.name === 'mobile' ? mobileNav(page) : desktopNav(page);

		await expect(nav.getByRole('link', { name: 'Logs', exact: true })).toHaveAttribute(
			'aria-current',
			'page'
		);
		await expect(nav.getByRole('link', { name: 'Timer', exact: true })).not.toHaveAttribute(
			'aria-current',
			'page'
		);
	});

	test('mobile timer stays full-width with a compact today line', async ({ page }, testInfo) => {
		test.skip(testInfo.project.name !== 'mobile', 'desktop timer layout is covered in layout.spec');
		await login(page);
		await page.goto('/timer');
		const today = page.getByTestId('timer-today-summary');
		await expect(today).toBeVisible();
		await expect(today.getByTestId('timer-today-total')).toBeVisible();
		await expect(page.getByRole('status', { name: 'No active session' })).toHaveCount(0);
		await page.goto('/dashboard');
		await expect(page.getByRole('status', { name: 'No active session' })).toBeVisible();
		await page.goto('/timer');
		const timer = page.getByRole('region', { name: 'Session timer' });
		const box = await timer.boundingBox();
		expect(box).toBeTruthy();
		expect(box!.width).toBeGreaterThan(300);
	});

	test('mobile timer stacks session fields', async ({ page }, testInfo) => {
		test.skip(testInfo.project.name !== 'mobile', 'desktop timer layout is covered in layout.spec');
		await login(page);
		await page.goto('/timer');
		await expect(page.getByLabel('Project')).toBeVisible();
		await expect(page.getByLabel('Activity')).toBeVisible();
		await expect(page.getByLabel('Ticket')).toBeVisible();
		const project = await page.locator('#project-select').boundingBox();
		const activity = await page.locator('#activity-select').boundingBox();
		const ticket = await page.locator('#task-ticket').boundingBox();
		expect(project && activity && ticket).toBeTruthy();
		expect(activity!.y).toBeGreaterThan(project!.y + project!.height - 2);
		expect(Math.abs(activity!.y - ticket!.y)).toBeLessThan(8);
		expect(project!.width).toBeGreaterThan(activity!.width);
	});

	test('mobile page header does not collapse on scroll', async ({ page }, testInfo) => {
		test.skip(
			testInfo.project.name !== 'mobile',
			'desktop header collapse is covered in layout.spec'
		);
		await login(page);
		await page.goto('/logs');
		const header = page.getByTestId('page-header');
		const description = page.getByTestId('page-header-description');
		await expect(header).toHaveAttribute('data-compact', 'false');
		await expect(description).toBeHidden();

		await page.locator('#main-content').evaluate((el) => {
			el.scrollTop = 400;
		});

		await expect(header).toHaveAttribute('data-compact', 'false');
		await expect(description).toBeHidden();
	});
});
