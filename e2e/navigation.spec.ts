import { expect, test } from '@playwright/test';
import { desktopNav, login, mobileNav } from './helpers';

const routes = [
	{ href: '/timer', label: 'Timer' },
	{ href: '/dashboard', label: 'Dashboard' },
	{ href: '/logs', label: 'Logs' },
	{ href: '/insights', label: 'Insights' },
	{ href: '/projects', label: 'Projects' },
	{ href: '/settings', label: 'Settings' }
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
		const nav = testInfo.project.name === 'mobile' ? mobileNav(page) : desktopNav(page);

		for (const route of routes) {
			await nav.getByRole('link', { name: route.label, exact: true }).click();
			await expect(page).toHaveURL(new RegExp(`${route.href}$`));
			await expect(nav.getByRole('link', { name: route.label, exact: true })).toHaveAttribute(
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

	test('mobile timer stays full-width without today summary', async ({ page }, testInfo) => {
		test.skip(testInfo.project.name !== 'mobile', 'desktop timer layout is covered in layout.spec');
		await login(page);
		await page.goto('/timer');
		await expect(page.getByTestId('timer-today-summary')).toBeHidden();
		const timer = page.getByRole('region', { name: 'Session timer' });
		const box = await timer.boundingBox();
		expect(box).toBeTruthy();
		expect(box!.width).toBeGreaterThan(300);
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
		await expect(description).toBeVisible();

		await page.locator('#main-content').evaluate((el) => {
			el.scrollTop = 400;
		});

		await expect(header).toHaveAttribute('data-compact', 'false');
		await expect(description).toBeVisible();
	});
});
