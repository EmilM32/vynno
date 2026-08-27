import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { desktopNav, fillRegisterCode, fillResetCode, loginWith, registerAccount } from './helpers';

const themes = ['dark', 'light', 'deep-dark'] as const;

async function expectNoViolations(page: Page) {
	const results = await new AxeBuilder({ page })
		.withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
		.analyze();
	expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
}

test.describe('login', () => {
	test('root redirects to login when signed out', async ({ page }) => {
		await page.goto('/');
		await expect(page).toHaveURL(/\/login$/);
		await expect(page.getByRole('heading', { name: 'Vynno' })).toBeVisible();
		await expect(page.getByRole('button', { name: 'Log in' })).toBeVisible();
	});

	test('login has no app shell chrome', async ({ page }) => {
		await page.goto('/login');
		await expect(desktopNav(page)).toHaveCount(0);
		await expect(page.getByRole('link', { name: 'Skip to content' })).toHaveCount(0);
		await expect(page.getByRole('button', { name: 'Open command palette' })).toHaveCount(0);
		await expect(page.getByRole('button', { name: 'Commands' })).toHaveCount(0);
	});

	test('empty submit stays and shows field errors', async ({ page }) => {
		await page.goto('/login');
		await page.getByRole('button', { name: 'Log in' }).click();
		await expect(page).toHaveURL(/\/login$/);
		await expect(page.getByRole('alert')).toHaveCount(2);
		await expect(page.getByText('Email is required.')).toBeVisible();
		await expect(page.getByText('Password is required.')).toBeVisible();
	});

	test('empty Enter submit stays and shows field errors', async ({ page }) => {
		await page.goto('/login');
		await page.getByLabel('Email').press('Enter');
		await expect(page).toHaveURL(/\/login$/);
		await expect(page.getByRole('alert')).toHaveCount(2);
		await expect(page.getByText('Email is required.')).toBeVisible();
		await expect(page.getByText('Password is required.')).toBeVisible();
	});

	test('valid credentials proceed to the dashboard', async ({ page }) => {
		const account = await registerAccount(page.request);
		await loginWith(page, account.email, account.password);
		await expect(page.getByTestId('page-view')).toBeVisible();
		await expect(desktopNav(page).getByText('Vynno', { exact: true })).toBeVisible();
	});

	test('Enter in the password field signs in', async ({ page }) => {
		const account = await registerAccount(page.request);
		await page.goto('/login');
		await page.getByLabel('Email').fill(account.email);
		const password = page.getByRole('textbox', { name: 'Password', exact: true });
		await password.fill(account.password);
		await password.press('Enter');
		await expect(page).toHaveURL(/\/dashboard$/);
		await expect(page.getByTestId('page-view')).toBeVisible();
	});

	test('root goes to dashboard after login', async ({ page }) => {
		const account = await registerAccount(page.request);
		await loginWith(page, account.email, account.password);

		await page.goto('/');
		await expect(page).toHaveURL(/\/dashboard$/);
	});
});

test.describe('register', () => {
	test('create-account tab shows a disabled submit until passwords match', async ({ page }) => {
		await page.goto('/login');
		await page.getByRole('tab', { name: 'Create account' }).click();
		const submit = page.getByRole('button', { name: 'Send confirmation code' });
		await expect(submit).toBeDisabled();

		await page.getByLabel('Email').fill('new.user@example.com');
		await page.getByLabel('Password', { exact: true }).fill('long-enough');
		await expect(submit).toBeDisabled();
		await expect(page.getByText('Passwords do not match.')).toHaveCount(0);

		await page.getByRole('textbox', { name: 'Confirm password' }).fill('different1');
		await expect(page.getByText('Passwords do not match.')).toBeVisible();
		await expect(submit).toBeDisabled();

		await page.getByRole('textbox', { name: 'Confirm password' }).fill('long-enough');
		await expect(page.getByText('Passwords do not match.')).toHaveCount(0);
		await expect(submit).toBeEnabled();
	});

	test('empty email with matching passwords stays and shows a field error', async ({ page }) => {
		await page.goto('/login');
		await page.getByRole('tab', { name: 'Create account' }).click();
		await page.getByLabel('Password', { exact: true }).fill('long-enough');
		await page.getByRole('textbox', { name: 'Confirm password' }).fill('long-enough');
		await page.getByRole('button', { name: 'Send confirmation code' }).click();
		await expect(page).toHaveURL(/\/login$/);
		await expect(page.getByText('Email is required.')).toBeVisible();
	});

	test('create account proceeds to the dashboard', async ({ page }) => {
		const local = `ui_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
		const email = `${local}@example.com`;
		await page.goto('/login');
		await page.getByRole('tab', { name: 'Create account' }).click();
		await page.getByLabel('Email').fill(email);
		await page.getByLabel('Password', { exact: true }).fill('e2epassword');
		await page.getByRole('textbox', { name: 'Confirm password' }).fill('e2epassword');
		await page.getByLabel('Display name').fill(`E2E ${local}`);
		await page.getByRole('button', { name: 'Send confirmation code' }).click();
		await expect(page.getByLabel('Confirmation code')).toBeVisible();
		await fillRegisterCode(page, email);
		await page.getByRole('button', { name: 'Create account' }).click();
		await expect(page).toHaveURL(/\/dashboard$/);
		await expect(page.getByTestId('page-view')).toBeVisible();
	});

	test('Enter in the confirm field sends a code', async ({ page }) => {
		const local = `ui_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
		const email = `${local}@example.com`;
		await page.goto('/login');
		await page.getByRole('tab', { name: 'Create account' }).click();
		await page.getByLabel('Email').fill(email);
		await page.getByLabel('Password', { exact: true }).fill('e2epassword');
		const confirm = page.getByRole('textbox', { name: 'Confirm password' });
		await confirm.fill('e2epassword');
		await expect(page.getByRole('button', { name: 'Send confirmation code' })).toBeEnabled();
		await confirm.press('Enter');
		await expect(page.getByLabel('Confirmation code')).toBeVisible();
		await fillRegisterCode(page, email);
		await page.getByRole('button', { name: 'Create account' }).click();
		await expect(page).toHaveURL(/\/dashboard$/);
		await expect(page.getByTestId('page-view')).toBeVisible();
	});

	test('taken email shows an error', async ({ page }) => {
		const account = await registerAccount(page.request);
		await page.goto('/login');
		await page.getByRole('tab', { name: 'Create account' }).click();
		await page.getByLabel('Email').fill(account.email);
		await page.getByLabel('Password', { exact: true }).fill('e2epassword');
		await page.getByRole('textbox', { name: 'Confirm password' }).fill('e2epassword');
		await page.getByRole('button', { name: 'Send confirmation code' }).click();
		await expect(page).toHaveURL(/\/login$/);
		await expect(page.getByText('That email is already taken.')).toBeVisible();
	});

	test('password visibility toggle reveals the typed value', async ({ page }) => {
		await page.goto('/login');
		const password = page.getByLabel('Password', { exact: true });
		await password.fill('secret-value');
		await expect(password).toHaveAttribute('type', 'password');
		await page.getByRole('button', { name: 'Show password' }).click();
		await expect(password).toHaveAttribute('type', 'text');
		await expect(password).toHaveValue('secret-value');
	});
});

test.describe('forgot password', () => {
	test('link opens the reset form', async ({ page }) => {
		await page.goto('/login');
		await page.getByRole('button', { name: 'Forgot password?' }).click();
		await expect(page.getByTestId('forgot-form')).toBeVisible();
		await expect(page.getByRole('heading', { name: 'Reset password' })).toBeVisible();
		await page.getByRole('button', { name: 'Back to log in' }).click();
		await expect(page.getByTestId('login-form')).toBeVisible();
	});

	test('unknown email still shows the code step', async ({ page }) => {
		await page.goto('/login');
		await page.getByRole('button', { name: 'Forgot password?' }).click();
		await page.getByLabel('Email').fill(`missing_${Date.now().toString(36)}@example.com`);
		await page.getByRole('button', { name: 'Send reset code' }).click();
		await expect(page.getByLabel('Reset code')).toBeVisible();
		await expect(page.getByRole('alert')).toHaveCount(0);
	});

	test('reset then login with the new password', async ({ page }) => {
		const account = await registerAccount(page.request);
		const nextPassword = 'new-e2e-pass-1';
		await page.goto('/login');
		await page.getByRole('button', { name: 'Forgot password?' }).click();
		await page.getByLabel('Email').fill(account.email);
		await page.getByRole('button', { name: 'Send reset code' }).click();
		await expect(page.getByLabel('Reset code')).toBeVisible();
		await fillResetCode(page, account.email);
		await page.getByLabel('New password').fill(nextPassword);
		await page.getByRole('textbox', { name: 'Confirm password' }).fill(nextPassword);
		await page.getByRole('button', { name: 'Reset password' }).click();
		await expect(page.getByText('Password updated. Sign in with your new password.')).toBeVisible();
		await loginWith(page, account.email, nextPassword);
		await expect(page.getByTestId('page-view')).toBeVisible();
	});
});

test.describe('login a11y', () => {
	for (const theme of themes) {
		test(`axe ${theme}`, async ({ page }) => {
			await page.addInitScript((id) => {
				localStorage.setItem('vynno-theme', id);
			}, theme);
			await page.goto('/login');
			await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
			await expectNoViolations(page);
		});
	}

	test('axe register tab', async ({ page }) => {
		await page.goto('/login');
		await page.getByRole('tab', { name: 'Create account' }).click();
		await expect(page.getByTestId('register-form')).toBeVisible();
		await expectNoViolations(page);
	});

	test('axe forgot form', async ({ page }) => {
		await page.goto('/login');
		await page.getByRole('button', { name: 'Forgot password?' }).click();
		await expect(page.getByTestId('forgot-form')).toBeVisible();
		await expectNoViolations(page);
	});
});
