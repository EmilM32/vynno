import { expect, test } from '@playwright/test';

test.describe('command palette', () => {
	// Top-bar open button is mobile-only (`md:hidden`); keyboard works on all viewports
	test.use({ viewport: { width: 390, height: 844 } });

	test('opens via top-bar button', async ({ page }) => {
		await page.goto('/dashboard');
		await page.getByRole('button', { name: 'Open command palette' }).click();
		await expect(page.getByRole('dialog', { name: 'Command palette' })).toBeVisible();
	});

	test('closes with Escape', async ({ page }) => {
		await page.goto('/dashboard');
		await page.getByRole('button', { name: 'Open command palette' }).click();
		await expect(page.getByRole('dialog', { name: 'Command palette' })).toBeVisible();
		await page.keyboard.press('Escape');
		await expect(page.getByRole('dialog', { name: 'Command palette' })).toHaveCount(0);
	});

	test('opens via keyboard shortcut (meta/ctrl + k)', async ({ page }) => {
		await page.goto('/dashboard');
		// Headless Chromium often swallows real Meta/Control+K (omnibox / OS).
		// Dispatch the same keydown the app window listener expects.
		await page.evaluate(() => {
			window.dispatchEvent(
				new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true, cancelable: true })
			);
		});
		await expect(page.getByRole('dialog', { name: 'Command palette' })).toBeVisible();
	});

	test('navigates to Logs via command', async ({ page }) => {
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
