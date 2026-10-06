<script lang="ts">
	import PasswordField from '$lib/components/auth/PasswordField.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Disclosure from '$lib/components/ui/Disclosure.svelte';
	import Field from '$lib/components/ui/Field.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import { isValidEmail, isValidOTP, normalizeEmail, passwordFieldError } from '$lib/auth/validate';
	import { m } from '$lib/paraglide/messages.js';
	import { authStore } from '$lib/stores/auth.svelte';
	import { usePrefs } from '$lib/stores/prefs.svelte';
	import { useSession } from '$lib/stores/session.svelte';

	/**
	 * Signed-in credential changes. Both keep this browser signed in and sign out
	 * every other session; the server mails a notice. Collapsed on every visit.
	 */

	const sessionStore = useSession();
	const prefsStore = usePrefs();

	let open = $state(false);

	let currentPassword = $state('');
	let newPassword = $state('');
	let confirmPassword = $state('');
	let passwordErrors = $state<{ current?: string; next?: string; confirm?: string }>({});
	let passwordError = $state('');
	let passwordNotice = $state('');
	let passwordPending = $state(false);

	let emailStep = $state<'request' | 'code'>('request');
	let newEmail = $state('');
	let emailPassword = $state('');
	let emailCode = $state('');
	let emailErrors = $state<{ email?: string; password?: string; code?: string }>({});
	let emailError = $state('');
	let emailNotice = $state('');
	let emailPending = $state(false);

	/** The address the code went to; edits to the field after sending do not change it. */
	let pendingEmail = $state('');

	/** A reply can land after the user collapsed the section; never hide its alert or notice. */
	function reveal() {
		open = true;
	}

	async function onChangePassword(e: SubmitEvent) {
		e.preventDefault();
		if (passwordPending) return;
		passwordError = '';
		passwordNotice = '';
		const errors: typeof passwordErrors = {};
		if (!currentPassword) errors.current = m.login_password_required();
		errors.next = passwordFieldError(newPassword);
		if (!confirmPassword) errors.confirm = m.register_confirm_required();
		else if (newPassword !== confirmPassword) errors.confirm = m.register_password_mismatch();
		passwordErrors = errors;
		if (errors.current || errors.next || errors.confirm) return;

		passwordPending = true;
		const error = await sessionStore.changePassword({ currentPassword, newPassword });
		passwordPending = false;
		reveal();
		if (error) {
			passwordError = error;
			return;
		}
		currentPassword = '';
		newPassword = '';
		confirmPassword = '';
		passwordNotice = m.security_password_changed();
	}

	async function sendEmailCode(): Promise<boolean> {
		emailPending = true;
		const email = normalizeEmail(newEmail);
		const error = await sessionStore.requestEmailChange({ email, password: emailPassword });
		emailPending = false;
		reveal();
		if (error) {
			emailError = error;
			return false;
		}
		pendingEmail = email;
		return true;
	}

	async function onEmailSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (emailPending) return;
		emailError = '';
		emailNotice = '';

		if (emailStep === 'request') {
			const errors: typeof emailErrors = {};
			const email = normalizeEmail(newEmail);
			if (!email) errors.email = m.login_email_required();
			else if (!isValidEmail(email)) errors.email = m.register_email_format();
			else if (email === prefsStore.email) errors.email = m.security_same_email();
			if (!emailPassword) errors.password = m.login_password_required();
			emailErrors = errors;
			if (errors.email || errors.password) return;
			if (await sendEmailCode()) {
				emailCode = '';
				emailStep = 'code';
			}
			return;
		}

		if (!isValidOTP(emailCode)) {
			emailErrors = { code: m.register_code_format() };
			return;
		}
		emailErrors = {};
		emailPending = true;
		const error = await sessionStore.changeEmail({ email: pendingEmail, code: emailCode.trim() });
		emailPending = false;
		reveal();
		if (error) {
			emailError = error;
			return;
		}
		authStore.updateEmail(pendingEmail);
		emailNotice = m.security_email_changed({ email: pendingEmail });
		resetEmailForm();
	}

	async function onResendCode() {
		if (emailPending) return;
		emailError = '';
		if (await sendEmailCode()) emailCode = '';
	}

	function resetEmailForm() {
		emailStep = 'request';
		newEmail = '';
		emailPassword = '';
		emailCode = '';
		pendingEmail = '';
		emailErrors = {};
	}

	function onUseOtherEmail() {
		emailError = '';
		emailCode = '';
		emailStep = 'request';
	}
</script>

<!-- The panel is the named region; labelling the section too would repeat "Security". -->
<section
	class="rounded-lg border border-outline-variant bg-surface-container p-4"
	data-testid="settings-security"
>
	<Disclosure title={m.security_title()} bind:open>
		<div class="grid grid-cols-1 gap-8 md:grid-cols-2">
			<form
				class="flex flex-col gap-4"
				method="post"
				novalidate
				aria-labelledby="security-password-title"
				onsubmit={onChangePassword}
				data-testid="security-password"
			>
				<h3 id="security-password-title" class="text-label-caps text-on-surface-variant uppercase">
					{m.security_password_title()}
				</h3>
				<!-- Lets password managers file the new password under this account. -->
				<input
					type="email"
					name="username"
					autocomplete="username"
					value={prefsStore.email}
					readonly
					hidden
				/>
				<PasswordField
					id="security-current-password"
					label={m.security_current_password()}
					name="current-password"
					autocomplete="current-password"
					bind:value={currentPassword}
					error={passwordErrors.current ?? ''}
					disabled={passwordPending}
				/>
				<PasswordField
					id="security-new-password"
					label={m.security_new_password()}
					name="new-password"
					autocomplete="new-password"
					bind:value={newPassword}
					error={passwordErrors.next ?? ''}
					disabled={passwordPending}
				/>
				<PasswordField
					id="security-confirm-password"
					label={m.register_confirm_password()}
					name="confirm-password"
					autocomplete="new-password"
					bind:value={confirmPassword}
					error={passwordErrors.confirm ?? ''}
					showLabel={m.register_show_confirm()}
					hideLabel={m.register_hide_confirm()}
					disabled={passwordPending}
				/>
				{#if passwordError}
					<p class="text-body-sm text-error" role="alert">{passwordError}</p>
				{/if}
				<div class="flex flex-wrap items-center gap-x-3 gap-y-2">
					<Button variant="tonal" type="submit" disabled={passwordPending}>
						{m.security_change_password()}
					</Button>
					<p class="text-body-sm text-primary" role="status">{passwordNotice}</p>
				</div>
			</form>

			<form
				class="flex flex-col gap-4"
				method="post"
				novalidate
				aria-labelledby="security-email-title"
				onsubmit={onEmailSubmit}
				data-testid="security-email"
			>
				<h3 id="security-email-title" class="text-label-caps text-on-surface-variant uppercase">
					{m.security_email_title()}
				</h3>
				<Field id="security-new-email" label={m.security_new_email()} error={emailErrors.email}>
					<Input
						type="email"
						name="email"
						autocapitalize="none"
						autocomplete="email"
						spellcheck="false"
						bind:value={newEmail}
						disabled={emailPending || emailStep === 'code'}
						class="w-full"
					/>
				</Field>

				{#if emailStep === 'request'}
					<PasswordField
						id="security-email-password"
						label={m.security_current_password()}
						name="password"
						autocomplete="current-password"
						bind:value={emailPassword}
						error={emailErrors.password ?? ''}
						disabled={emailPending}
					/>
				{:else}
					<Field
						id="security-email-code"
						label={m.register_code()}
						hint={m.security_code_sent({ email: pendingEmail })}
						error={emailErrors.code}
					>
						<Input
							type="text"
							name="code"
							inputmode="numeric"
							pattern="[0-9]*"
							autocomplete="one-time-code"
							maxlength={6}
							bind:value={emailCode}
							disabled={emailPending}
							class="w-full"
						/>
					</Field>
				{/if}

				{#if emailError}
					<p class="text-body-sm text-error" role="alert">{emailError}</p>
				{/if}

				<div class="flex flex-wrap items-center gap-x-3 gap-y-2">
					<Button variant="tonal" type="submit" disabled={emailPending}>
						{emailStep === 'request' ? m.security_send_code() : m.security_confirm_email()}
					</Button>
					{#if emailStep === 'code'}
						<Button variant="inline" size="xs" disabled={emailPending} onclick={onResendCode}>
							{m.register_resend()}
						</Button>
						<Button variant="inline" size="xs" disabled={emailPending} onclick={onUseOtherEmail}>
							{m.security_use_other_email()}
						</Button>
					{/if}
					<p class="text-body-sm text-primary" role="status">{emailNotice}</p>
				</div>
			</form>
		</div>
	</Disclosure>
</section>
