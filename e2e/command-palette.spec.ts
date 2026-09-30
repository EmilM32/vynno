import { expect, test, type Locator, type Page } from '@playwright/test';
import {
	createProject,
	desktopNav,
	login,
	mobileNav,
	seedManualSession,
	stopSession,
	uniqueNote,
	waitForClient
} from './helpers';

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
		// Six commands currently fit in max-h-72. Cap the list so overflow — and
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

test.describe('command palette actions', () => {
	test.beforeEach(async ({ page }) => {
		await login(page);
	});

	async function openPalette(page: Page) {
		await desktopNav(page).getByRole('button', { name: 'Commands' }).click();
		const dialog = page.getByRole('dialog', { name: 'Command palette' });
		await expect(dialog).toBeVisible();
		return dialog;
	}

	test('starts and stops the session', async ({ page }) => {
		await page.goto('/timer');
		await waitForClient(page);
		const note = uniqueNote('palette');
		await page.getByRole('combobox', { name: 'Task description' }).fill(note);

		const dialog = await openPalette(page);
		await dialog.getByRole('option', { name: 'Start session' }).click();
		await expect(page.getByTestId('timer-status')).toHaveText('ACTIVE');
		await expect(page.getByRole('dialog', { name: 'Command palette' })).toHaveCount(0);

		await expect(page.getByTestId('timer-elapsed')).not.toHaveText('00:00:00');
		await openPalette(page);
		await page.getByRole('combobox', { name: 'Filter commands' }).fill('stop');
		await page.getByRole('combobox', { name: 'Filter commands' }).press('Enter');
		await expect(page.getByTestId('timer-status')).toHaveText('IDLE');
		await expect(page.getByTestId('timer-elapsed')).toHaveText('00:00:00');
	});

	test('resumes a recent task, and not while another runs', async ({ page }) => {
		const note = uniqueNote('palette-resume');
		await page.goto('/timer');
		await waitForClient(page);
		await seedManualSession(page, {
			note,
			startedAt: new Date(Date.now() - 2 * 3_600_000).toISOString(),
			endedAt: new Date(Date.now() - 3_600_000).toISOString()
		});
		await page.reload();
		await waitForClient(page);

		// The idle draft is this note too, so Start session matches it; aim at the group.
		const recent = (dialog: Locator) => dialog.getByRole('group', { name: 'Recent Tasks' });
		let dialog = await openPalette(page);
		await page.getByRole('combobox', { name: 'Filter commands' }).fill(note);
		await recent(dialog).getByRole('option', { name: note }).click();
		await expect(page.getByTestId('timer-status')).toHaveText('ACTIVE');
		await expect(page.getByRole('combobox', { name: 'Task description' })).toHaveValue(note);

		dialog = await openPalette(page);
		await page.getByRole('combobox', { name: 'Filter commands' }).fill(note);
		const resume = recent(dialog).getByRole('option', { name: note });
		await expect(resume).toHaveAttribute('aria-disabled', 'true');
		await expect(resume).toContainText('Stop the current session first');
		// It is the active option; Enter must not start anything or close the palette.
		await expect(resume).toHaveAttribute('aria-selected', 'true');
		await page.getByRole('combobox', { name: 'Filter commands' }).press('Enter');
		await expect(dialog).toBeVisible();
		await page.keyboard.press('Escape');
		await expect(page.getByTestId('timer-status')).toHaveText('ACTIVE');

		await stopSession(page);
	});

	test('opens a project dossier by name or code', async ({ page }) => {
		const project = await createProject(page, {
			name: uniqueNote('Palette project'),
			code: 'PAL'
		});
		await page.goto('/dashboard');
		await waitForClient(page);

		const dialog = await openPalette(page);
		await page.getByRole('combobox', { name: 'Filter commands' }).fill('pal');
		await dialog.getByRole('option', { name: `Open ${project.name}` }).click();
		await expect(page).toHaveURL(new RegExp(`/projects/${project.id}$`));
	});

	test('does not list projects until there is a query', async ({ page }) => {
		const project = await createProject(page, { name: uniqueNote('Hidden project') });
		await page.goto('/dashboard');
		await waitForClient(page);

		const dialog = await openPalette(page);
		await expect(dialog.getByRole('option', { name: `Open ${project.name}` })).toHaveCount(0);
		await expect(dialog.getByRole('group', { name: 'Go to' })).toBeVisible();
	});
});
