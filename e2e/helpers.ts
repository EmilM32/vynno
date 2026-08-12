import { expect, type Locator, type Page } from '@playwright/test';

/** Desktop sidebar is `md:flex` (≥768px). Prefer this for SPA nav that keeps store state. */
export function desktopNav(page: Page): Locator {
	return page.locator('nav.md\\:flex[aria-label="Main"]');
}

/** Mobile bottom bar is `md:hidden`. */
export function mobileNav(page: Page): Locator {
	return page.locator('nav.md\\:hidden[aria-label="Main"]');
}

/**
 * Client-side navigation via desktop sidebar.
 * Important: full `page.goto` reloads the app and resets the in-memory mock store.
 */
export async function spaGo(page: Page, label: string, href: string) {
	await desktopNav(page).getByRole('link', { name: label, exact: true }).click();
	await expect(page).toHaveURL(new RegExp(`${href}$`));
}

export function uniqueNote(prefix = 'e2e'): string {
	return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export async function startSession(page: Page, note: string, projectLabel?: string) {
	await page.goto('/timer');
	const task = page.getByRole('textbox', { name: 'Task description' });
	await task.fill(note);
	if (projectLabel) {
		await page.locator('#project-select').selectOption({ label: projectLabel });
	}
	await page.getByRole('button', { name: 'Start' }).click();
	await expect(page.getByTestId('timer-status')).toHaveText('ACTIVE');
}

export async function stopSession(page: Page) {
	await page.getByRole('button', { name: 'Stop' }).click();
	await expect(page.getByRole('button', { name: 'Start' })).toBeVisible();
}
