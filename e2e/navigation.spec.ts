import { expect, test } from '@playwright/test';
import { desktopNav, mobileNav } from './helpers';

const routes = [
	{ href: '/timer', label: 'Timer' },
	{ href: '/dashboard', label: 'Dashboard' },
	{ href: '/logs', label: 'Logs' },
	{ href: '/insights', label: 'Insights' },
	{ href: '/projects', label: 'Projects' },
	{ href: '/settings', label: 'Settings' }
] as const;

test.describe('navigation', () => {
	test('root redirects to dashboard', async ({ page }) => {
		await page.goto('/');
		await expect(page).toHaveURL(/\/dashboard$/);
	});

	test('brand Vynno is visible in shell', async ({ page }, testInfo) => {
		await page.goto('/dashboard');
		// Desktop: sidebar h1; mobile: top bar
		if (testInfo.project.name === 'mobile') {
			await expect(page.getByRole('banner').getByText('Vynno')).toBeVisible();
		} else {
			await expect(desktopNav(page).getByRole('heading', { name: 'Vynno' })).toBeVisible();
		}
	});

	test('primary nav reaches all six routes', async ({ page }, testInfo) => {
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
});
