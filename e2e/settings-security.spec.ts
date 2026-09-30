import { expect, test, type Browser, type Page } from '@playwright/test';
import { e2eOrigin } from './env';
import { login, loginWith, waitForClient, type E2EAccount } from './helpers';
import { waitForMailpitCode } from './mailpit';

/** A second device: its own cookie jar, signed in as the same account. */
async function openOtherDevice(browser: Browser, account: E2EAccount) {
	const context = await browser.newContext({ baseURL: e2eOrigin, locale: 'en-US' });
	const page = await context.newPage();
	await loginWith(page, account.email, account.password);
	return { context, page };
}

async function expectSignedOut(page: Page) {
	await page.goto('/dashboard');
	await expect(page).toHaveURL(/\/login$/);
}

/** The Security heading is a disclosure button, collapsed on every visit (EMI-148). */
function securityToggle(page: Page) {
	return page.getByRole('button', { name: 'Security', exact: true });
}

async function openSecurity(page: Page) {
	const toggle = securityToggle(page);
	await toggle.click();
	await expect(toggle).toHaveAttribute('aria-expanded', 'true');
}

test.describe('settings security disclosure', () => {
	test.beforeEach(async ({ page }) => {
		await login(page);
		await page.goto('/settings');
		await waitForClient(page);
	});

	test('is collapsed by default, with its fields out of reach', async ({ page }) => {
		const toggle = securityToggle(page);
		await expect(toggle).toHaveAttribute('aria-expanded', 'false');
		const panelId = await toggle.getAttribute('aria-controls');
		expect(panelId).toBeTruthy();
		await expect(page.locator(`[id="${panelId}"]`)).toBeAttached();
		await expect(page.locator(`[id="${panelId}"]`)).toBeHidden();
		await expect(page.getByRole('textbox', { name: 'Current password' })).toHaveCount(0);
		await expect(page.getByRole('button', { name: 'Change password' })).toHaveCount(0);

		await toggle.click();
		const panel = page.getByRole('region', { name: 'Security' });
		await expect(panel).toBeVisible();
		await expect(panel).toHaveAttribute('id', panelId!);
	});

	test('Enter and Space toggle it and focus stays on the heading button', async ({ page }) => {
		const toggle = securityToggle(page);
		await toggle.focus();
		await page.keyboard.press('Enter');
		await expect(toggle).toHaveAttribute('aria-expanded', 'true');
		await expect(toggle).toBeFocused();
		await expect(page.getByTestId('security-password')).toBeVisible();

		await page.keyboard.press('Space');
		await expect(toggle).toHaveAttribute('aria-expanded', 'false');
		await expect(toggle).toBeFocused();
		await expect(page.getByTestId('security-password')).toBeHidden();

		// Collapsed, Tab moves past the section instead of into its fields.
		await page.keyboard.press('Tab');
		const insideSecurity = await page.evaluate(
			() => !!document.activeElement?.closest('[data-testid="settings-security"]')
		);
		expect(insideSecurity).toBe(false);
	});

	test('keeps half-typed input when collapsed and expanded again', async ({ page }) => {
		await openSecurity(page);
		const current = page
			.getByTestId('security-password')
			.getByRole('textbox', { name: 'Current password' });
		await current.fill('half-typed');
		await securityToggle(page).click();
		await expect(page.getByTestId('security-password')).toBeHidden();
		await securityToggle(page).click();
		await expect(current).toHaveValue('half-typed');
	});
});

test.describe('settings security', () => {
	let account: E2EAccount;

	test.beforeEach(async ({ page }) => {
		account = await login(page);
		await page.goto('/settings');
		await waitForClient(page);
		await openSecurity(page);
	});

	test('changes the password, keeps this browser, and signs out the other', async ({
		page,
		browser
	}) => {
		const other = await openOtherDevice(browser, account);
		try {
			const form = page.getByTestId('security-password');
			await form.getByRole('textbox', { name: 'Current password' }).fill(account.password);
			await form.getByRole('textbox', { name: 'New password' }).fill('e2e-new-password');
			await form.getByRole('textbox', { name: 'Confirm password' }).fill('e2e-new-password');
			await form.getByRole('button', { name: 'Change password' }).click();
			await expect(form.getByRole('status')).toHaveText(
				'Password changed. Other devices were signed out.'
			);
			await expect(form.getByRole('textbox', { name: 'Current password' })).toHaveValue('');
			await expect(securityToggle(page)).toHaveAttribute('aria-expanded', 'true');

			await expectSignedOut(other.page);
			await page.reload();
			await waitForClient(page);
			await expect(page.getByRole('region', { name: 'Profile' })).toContainText(account.email);

			await loginWith(other.page, account.email, 'e2e-new-password');
		} finally {
			await other.context.close();
		}
	});

	test('a wrong current password is named and changes nothing', async ({ page }) => {
		const form = page.getByTestId('security-password');
		await form.getByRole('textbox', { name: 'Current password' }).fill('not-the-password');
		await form.getByRole('textbox', { name: 'New password' }).fill('e2e-new-password');
		await form.getByRole('textbox', { name: 'Confirm password' }).fill('e2e-new-password');
		await form.getByRole('button', { name: 'Change password' }).click();
		await expect(form.getByRole('alert')).toHaveText('Current password is incorrect.');
		await expect(securityToggle(page)).toHaveAttribute('aria-expanded', 'true');

		// Still signed in: a 401 invalid_credentials is not a lost session.
		await page.reload();
		await expect(page).toHaveURL(/\/settings$/);
	});

	test('changes the email after the code sent to the new address', async ({ page, browser }) => {
		const newEmail = `e2e_moved_${Date.now().toString(36)}@example.com`;
		const form = page.getByTestId('security-email');
		await form.getByLabel('New email').fill(newEmail);
		await form.getByRole('textbox', { name: 'Current password' }).fill(account.password);
		await form.getByRole('button', { name: 'Send code' }).click();

		const code = await waitForMailpitCode(newEmail, { subjectIncludes: 'email change' });
		await expect(form.getByText(`We sent 6 digits to ${newEmail}.`)).toBeVisible();
		// Collapsing does not drop the code step.
		await securityToggle(page).click();
		await expect(form).toBeHidden();
		await securityToggle(page).click();
		await expect(form.getByText(`We sent 6 digits to ${newEmail}.`)).toBeVisible();
		await form.getByLabel('Confirmation code').fill(code);
		await form.getByRole('button', { name: 'Change email' }).click();
		await expect(form.getByRole('status')).toHaveText(
			`You now sign in with ${newEmail}. Other devices were signed out.`
		);
		await expect(securityToggle(page)).toHaveAttribute('aria-expanded', 'true');
		await expect(page.getByRole('region', { name: 'Profile' })).toContainText(newEmail);

		const other = await browser.newContext({ baseURL: e2eOrigin, locale: 'en-US' });
		try {
			await loginWith(await other.newPage(), newEmail, account.password);
		} finally {
			await other.close();
		}
	});
});
