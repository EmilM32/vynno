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

test.describe('settings security', () => {
	let account: E2EAccount;

	test.beforeEach(async ({ page }) => {
		account = await login(page);
		await page.goto('/settings');
		await waitForClient(page);
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
		await form.getByLabel('Confirmation code').fill(code);
		await form.getByRole('button', { name: 'Change email' }).click();
		await expect(form.getByRole('status')).toHaveText(
			`You now sign in with ${newEmail}. Other devices were signed out.`
		);
		await expect(page.getByRole('region', { name: 'Profile' })).toContainText(newEmail);

		const other = await browser.newContext({ baseURL: e2eOrigin, locale: 'en-US' });
		try {
			await loginWith(await other.newPage(), newEmail, account.password);
		} finally {
			await other.close();
		}
	});
});
