import { expect, test, type Locator, type Page } from '@playwright/test';
import { desktopNav, login, mobileNav } from './helpers';

async function openPaletteWithShortcut(page: Page) {
	await expect(page.getByTestId('page-view')).toBeVisible();
	await page.evaluate(() => {
		window.dispatchEvent(
			new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true, cancelable: true })
		);
	});
}

async function expectPageInteractive(page: Page) {
	await expect.poll(() => page.locator('[inert]').count()).toBe(0);
}

function isFullyVisibleInListbox(option: Locator) {
	return option.evaluate((el) => {
		const list = el.closest('[role="listbox"]');
		if (!(list instanceof HTMLElement) || !(el instanceof HTMLElement)) return false;
		const listRect = list.getBoundingClientRect();
		const optionRect = el.getBoundingClientRect();
		return optionRect.top >= listRect.top - 1 && optionRect.bottom <= listRect.bottom + 1;
	});
}

test.describe('command palette', () => {
	test.describe('mobile chrome', () => {
		// Top-bar open button is mobile-only (`md:hidden`)
		test.use({ viewport: { width: 390, height: 844 } });

		test('opens via top-bar button', async ({ page }) => {
			await login(page);
			await page.goto('/dashboard');
			await page.getByRole('button', { name: 'Open command palette' }).click();
			await expect(page.getByRole('dialog', { name: 'Command palette' })).toBeVisible();
		});

		test('closes with Escape', async ({ page }) => {
			await login(page);
			await page.goto('/dashboard');
			await page.getByRole('button', { name: 'Open command palette' }).click();
			await expect(page.getByRole('dialog', { name: 'Command palette' })).toBeVisible();
			await page.keyboard.press('Escape');
			await expect(page.getByRole('dialog', { name: 'Command palette' })).toHaveCount(0);
			await expectPageInteractive(page);
			await mobileNav(page).getByRole('link', { name: 'Logs', exact: true }).click();
			await expect(page).toHaveURL(/\/logs$/);
		});

		test('navigates to Logs via command', async ({ page }) => {
			await login(page);
			await page.goto('/dashboard');
			await page.getByRole('button', { name: 'Open command palette' }).click();
			const dialog = page.getByRole('dialog', { name: 'Command palette' });
			await expect(dialog).toBeVisible();
			await page.getByRole('combobox', { name: 'Filter commands' }).fill('Logs');
			await dialog.getByRole('option', { name: 'Go to Logs' }).click();
			await expect(page).toHaveURL(/\/logs$/);
			await expect(page.getByRole('dialog', { name: 'Command palette' })).toHaveCount(0);
		});
	});

	test('opens via keyboard shortcut (meta/ctrl + k)', async ({ page }) => {
		await login(page);
		await page.goto('/dashboard');
		// Headless Chromium often swallows real Meta/Control+K (omnibox / OS).
		// Dispatch the same keydown the app window listener expects.
		await openPaletteWithShortcut(page);
		await expect(page.getByRole('dialog', { name: 'Command palette' })).toBeVisible();
	});

	test('opens via sidebar button', async ({ page }) => {
		await login(page);
		await page.goto('/dashboard');
		await desktopNav(page).getByRole('button', { name: 'Commands' }).click();
		await expect(page.getByRole('dialog', { name: 'Command palette' })).toBeVisible();
	});

	test('closing restores pointer events', async ({ page }) => {
		await login(page);
		await page.goto('/dashboard');
		await desktopNav(page).getByRole('button', { name: 'Commands' }).click();
		await expect(page.getByRole('dialog', { name: 'Command palette' })).toBeVisible();
		await page.keyboard.press('Escape');
		await expect(page.getByRole('dialog', { name: 'Command palette' })).toHaveCount(0);
		await expectPageInteractive(page);
		await desktopNav(page).getByRole('link', { name: 'Logs', exact: true }).click();
		await expect(page).toHaveURL(/\/logs$/);
	});

	test('arrow keys keep the active option in view', async ({ page }) => {
		await login(page);
		await page.goto('/dashboard');
		await desktopNav(page).getByRole('button', { name: 'Commands' }).click();
		const dialog = page.getByRole('dialog', { name: 'Command palette' });
		await expect(dialog).toBeVisible();
		const listbox = dialog.getByRole('listbox');
		const options = listbox.getByRole('option');
		const count = await options.count();
		expect(count).toBeGreaterThan(1);
		const last = options.nth(count - 1);
		// Seven commands currently fit in max-h-72. Cap the list so overflow — and
		// scroll-into-view — is deterministic regardless of command count.
		await listbox.evaluate((el) => {
			el.style.maxHeight = '8rem';
		});
		await expect.poll(() => listbox.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true);
		await expect.poll(() => isFullyVisibleInListbox(last)).toBe(false);

		const filter = page.getByRole('combobox', { name: 'Filter commands' });
		await expect(filter).toBeFocused();
		for (let i = 0; i < count - 1; i++) {
			await filter.press('ArrowDown');
		}
		await expect.poll(() => isFullyVisibleInListbox(last)).toBe(true);
		await expect.poll(() => listbox.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);

		await filter.press('ArrowDown');
		await expect.poll(() => isFullyVisibleInListbox(options.first())).toBe(true);
	});
});
