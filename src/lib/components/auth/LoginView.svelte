<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import {
		loginRequest,
		registerRequest,
		requestPasswordReset,
		requestRegisterCode,
		resetPasswordRequest
	} from '$lib/api/auth';
	import { userMessageForError } from '$lib/api/user-message';
	import {
		isValidEmail,
		isValidOTP,
		isValidRegisterCode,
		normalizeEmail,
		passwordsMatch,
		validateRegisterFieldErrors,
		validateResetFieldErrors,
		type RegisterFieldErrorKey,
		type ResetFieldErrorKey
	} from '$lib/auth/validate';
	import BrandMark from '$lib/components/shell/BrandMark.svelte';
	import { APP_VERSION } from '$lib/components/shell/nav';
	import Button from '$lib/components/ui/Button.svelte';
	import Field from '$lib/components/ui/Field.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import { m } from '$lib/paraglide/messages.js';
	import { authStore } from '$lib/stores/auth.svelte';
	import PasswordField from './PasswordField.svelte';

	type AuthTab = 'login' | 'register';

	let tab = $state<AuthTab>('login');
	let pending = $state(false);
	let formError = $state('');
	let notice = $state('');
	let forgot = $state(false);

	let loginEmail = $state('');
	let loginPassword = $state('');
	let loginRemember = $state(true);
	let loginFieldErrors = $state<{ email?: string; password?: string }>({});

	let registerEmail = $state('');
	let registerPassword = $state('');
	let registerConfirm = $state('');
	let registerDisplayName = $state('');
	let registerRemember = $state(true);
	let registerCode = $state('');
	let registerStep = $state<'details' | 'code'>('details');
	let registerFieldErrors = $state<Partial<Record<RegisterFieldErrorKey, string>>>({});

	let forgotEmail = $state('');
	let forgotPassword = $state('');
	let forgotConfirm = $state('');
	let forgotCode = $state('');
	let forgotStep = $state<'email' | 'code'>('email');
	let forgotFieldErrors = $state<Partial<Record<ResetFieldErrorKey, string>>>({});

	const registerReady = $derived(passwordsMatch(registerPassword, registerConfirm));
	const forgotReady = $derived(passwordsMatch(forgotPassword, forgotConfirm));
	const registerConfirmError = $derived(
		registerConfirm && registerPassword !== registerConfirm
			? m.register_password_mismatch()
			: registerFieldErrors.confirm
	);
	const forgotConfirmError = $derived(
		forgotConfirm && forgotPassword !== forgotConfirm
			? m.register_password_mismatch()
			: forgotFieldErrors.confirm
	);

	function switchTab(next: AuthTab) {
		if (tab === next && !forgot) return;
		tab = next;
		formError = '';
		notice = '';
		pending = false;
		forgot = false;
		registerStep = 'details';
		registerCode = '';
	}

	function openForgot() {
		forgot = true;
		forgotStep = 'email';
		forgotEmail = loginEmail;
		forgotPassword = '';
		forgotConfirm = '';
		forgotCode = '';
		forgotFieldErrors = {};
		formError = '';
		notice = '';
		pending = false;
	}

	function closeForgot() {
		forgot = false;
		formError = '';
		pending = false;
	}

	function onFieldKeydown(e: KeyboardEvent) {
		if (e.key !== 'Enter' || e.isComposing || e.repeat) return;
		const target = e.currentTarget;
		if (!(target instanceof HTMLInputElement)) return;
		if (target.type !== 'text' && target.type !== 'password' && target.type !== 'email') return;
		const form = target.form;
		if (!form) return;
		const submitter = form.querySelector<HTMLButtonElement>('button[type="submit"]');
		if (!submitter || submitter.disabled) return;
		e.preventDefault();
		form.requestSubmit(submitter);
	}

	function onTabListKey(e: KeyboardEvent) {
		if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
			e.preventDefault();
			switchTab(tab === 'login' ? 'register' : 'login');
			queueMicrotask(() => {
				document.getElementById(tab === 'login' ? 'tab-login' : 'tab-register')?.focus();
			});
		} else if (e.key === 'Home') {
			e.preventDefault();
			switchTab('login');
			queueMicrotask(() => document.getElementById('tab-login')?.focus());
		} else if (e.key === 'End') {
			e.preventDefault();
			switchTab('register');
			queueMicrotask(() => document.getElementById('tab-register')?.focus());
		}
	}

	async function handleLogin(e: Event) {
		e.preventDefault();
		const errors: { email?: string; password?: string } = {};
		if (!loginEmail.trim()) errors.email = m.login_email_required();
		if (!loginPassword) errors.password = m.login_password_required();
		loginFieldErrors = errors;
		formError = '';
		notice = '';
		if (errors.email || errors.password) return;

		pending = true;
		try {
			const email = normalizeEmail(loginEmail);
			await loginRequest(email, loginPassword, loginRemember);
			authStore.applySession(email, loginRemember);
			await goto(resolve('/dashboard'), { invalidateAll: true });
		} catch (err) {
			formError = userMessageForError(err, () => m.error_invalid_credentials());
		} finally {
			pending = false;
		}
	}

	async function handleRegister(e: Event) {
		e.preventDefault();
		if (!registerReady) return;

		const errors = validateRegisterFieldErrors({
			email: registerEmail,
			password: registerPassword,
			confirm: registerConfirm,
			displayName: registerDisplayName
		});
		registerFieldErrors = errors;
		formError = '';
		if (errors.email || errors.password || errors.confirm || errors.displayName) return;

		const email = normalizeEmail(registerEmail);
		if (registerStep === 'details') {
			pending = true;
			try {
				await requestRegisterCode(email);
				registerStep = 'code';
				registerCode = '';
			} catch (err) {
				formError = userMessageForError(err, () => m.error_failed_register());
			} finally {
				pending = false;
			}
			return;
		}

		if (!isValidRegisterCode(registerCode)) {
			registerFieldErrors = { ...registerFieldErrors, code: m.register_code_format() };
			return;
		}

		pending = true;
		try {
			await registerRequest(
				email,
				registerPassword,
				registerRemember,
				registerCode.trim(),
				registerDisplayName.trim() || undefined
			);
			authStore.applySession(email, registerRemember);
			await goto(resolve('/dashboard'), { invalidateAll: true });
		} catch (err) {
			formError = userMessageForError(err, () => m.error_failed_register());
		} finally {
			pending = false;
		}
	}

	async function handleResend() {
		if (pending || !registerReady) return;
		formError = '';
		pending = true;
		try {
			await requestRegisterCode(normalizeEmail(registerEmail));
			registerCode = '';
		} catch (err) {
			formError = userMessageForError(err, () => m.error_failed_register());
		} finally {
			pending = false;
		}
	}

	async function handleForgot(e: Event) {
		e.preventDefault();
		formError = '';
		if (forgotStep === 'email') {
			const errors: Partial<Record<ResetFieldErrorKey, string>> = {};
			if (!forgotEmail.trim()) errors.email = m.login_email_required();
			else if (!isValidEmail(forgotEmail)) errors.email = m.register_email_format();
			forgotFieldErrors = errors;
			if (errors.email) return;

			pending = true;
			try {
				await requestPasswordReset(normalizeEmail(forgotEmail));
				forgotStep = 'code';
				forgotCode = '';
			} catch (err) {
				formError = userMessageForError(err, () => m.error_failed_reset());
			} finally {
				pending = false;
			}
			return;
		}

		const errors = validateResetFieldErrors({
			email: forgotEmail,
			password: forgotPassword,
			confirm: forgotConfirm
		});
		if (!isValidOTP(forgotCode)) {
			errors.code = m.register_code_format();
		}
		forgotFieldErrors = errors;
		if (errors.email || errors.password || errors.confirm || errors.code) return;

		pending = true;
		try {
			await resetPasswordRequest(normalizeEmail(forgotEmail), forgotCode.trim(), forgotPassword);
			loginEmail = normalizeEmail(forgotEmail);
			loginPassword = '';
			forgot = false;
			tab = 'login';
			notice = m.forgot_success();
		} catch (err) {
			formError = userMessageForError(err, () => m.error_failed_reset());
		} finally {
			pending = false;
		}
	}

	async function handleForgotResend() {
		if (pending) return;
		formError = '';
		pending = true;
		try {
			await requestPasswordReset(normalizeEmail(forgotEmail));
			forgotCode = '';
		} catch (err) {
			formError = userMessageForError(err, () => m.error_failed_reset());
		} finally {
			pending = false;
		}
	}
</script>

<main
	class="flex min-h-dvh flex-col items-center justify-center bg-surface px-margin-mobile py-10 text-on-surface"
>
	<div class="w-full max-w-sm rounded-lg border border-outline-variant bg-surface-container p-6">
		<div class="mb-6 flex items-center gap-3">
			<BrandMark class="size-8 shrink-0 text-primary" />
			<div>
				<h1 class="text-headline-md leading-tight font-bold text-primary">{m.app_name()}</h1>
			</div>
		</div>

		{#if forgot}
			<form
				class="flex flex-col gap-4"
				method="post"
				onsubmit={handleForgot}
				novalidate
				data-testid="forgot-form"
			>
				<h2 class="text-headline-md font-bold text-on-surface">{m.forgot_title()}</h2>

				<Field id="forgot-email" label={m.login_email()} error={forgotFieldErrors.email}>
					<Input
						type="email"
						name="email"
						required
						autocapitalize="none"
						autocomplete="email"
						spellcheck="false"
						bind:value={forgotEmail}
						onkeydown={onFieldKeydown}
						disabled={forgotStep === 'code'}
						class="w-full"
					/>
				</Field>

				{#if forgotStep === 'code'}
					<Field
						id="forgot-code"
						label={m.forgot_code()}
						hint={m.forgot_code_hint()}
						error={forgotFieldErrors.code}
					>
						<Input
							type="text"
							name="code"
							inputmode="numeric"
							pattern="[0-9]*"
							autocomplete="one-time-code"
							maxlength="6"
							bind:value={forgotCode}
							onkeydown={onFieldKeydown}
							class="w-full"
						/>
					</Field>

					<PasswordField
						id="forgot-password"
						label={m.forgot_new_password()}
						autocomplete="new-password"
						bind:value={forgotPassword}
						error={forgotFieldErrors.password ?? ''}
						onkeydown={onFieldKeydown}
					/>

					<PasswordField
						id="forgot-confirm"
						label={m.register_confirm_password()}
						name="confirm"
						autocomplete="new-password"
						bind:value={forgotConfirm}
						error={forgotConfirmError ?? ''}
						showLabel={m.register_show_confirm()}
						hideLabel={m.register_hide_confirm()}
						onkeydown={onFieldKeydown}
					/>
				{/if}

				{#if formError}
					<p class="text-body-sm text-error" role="alert">{formError}</p>
				{/if}

				<Button
					variant="primary"
					type="submit"
					class="mt-1 w-full"
					disabled={pending || (forgotStep === 'code' && (!forgotReady || !isValidOTP(forgotCode)))}
				>
					{#if forgotStep === 'email'}
						{pending ? m.forgot_sending_code() : m.forgot_send_code()}
					{:else}
						{pending ? m.forgot_pending() : m.forgot_submit()}
					{/if}
				</Button>

				{#if forgotStep === 'code'}
					<Button
						variant="secondary"
						type="button"
						class="w-full"
						disabled={pending}
						onclick={handleForgotResend}
					>
						{m.forgot_resend()}
					</Button>
				{/if}

				<Button variant="link" size="sm" type="button" class="self-start" onclick={closeForgot}>
					{m.forgot_back()}
				</Button>
			</form>
		{:else}
			<div
				class="mb-5 flex gap-1 rounded-DEFAULT border border-outline-variant bg-surface p-1"
				role="tablist"
				tabindex="-1"
				aria-label={m.login_tabs_aria()}
				onkeydown={onTabListKey}
			>
				<Button
					variant="tab"
					size="sm"
					selected={tab === 'login'}
					class="flex-1"
					role="tab"
					id="tab-login"
					aria-selected={tab === 'login'}
					aria-controls="auth-panel"
					tabindex={tab === 'login' ? 0 : -1}
					onclick={() => switchTab('login')}
				>
					{m.login_tab_login()}
				</Button>
				<Button
					variant="tab"
					size="sm"
					selected={tab === 'register'}
					class="flex-1"
					role="tab"
					id="tab-register"
					aria-selected={tab === 'register'}
					aria-controls="auth-panel"
					tabindex={tab === 'register' ? 0 : -1}
					onclick={() => switchTab('register')}
				>
					{m.login_tab_register()}
				</Button>
			</div>

			<div
				id="auth-panel"
				role="tabpanel"
				aria-labelledby={tab === 'login' ? 'tab-login' : 'tab-register'}
			>
				{#if tab === 'login'}
					<form
						class="flex flex-col gap-4"
						method="post"
						onsubmit={handleLogin}
						novalidate
						data-testid="login-form"
					>
						<Field id="login-email" label={m.login_email()} error={loginFieldErrors.email}>
							<Input
								type="email"
								name="email"
								required
								autocapitalize="none"
								autocomplete="email"
								spellcheck="false"
								bind:value={loginEmail}
								onkeydown={onFieldKeydown}
								class="w-full"
							/>
						</Field>

						<PasswordField
							id="login-password"
							label={m.login_password()}
							autocomplete="current-password"
							bind:value={loginPassword}
							error={loginFieldErrors.password ?? ''}
							onkeydown={onFieldKeydown}
						/>

						<label
							class="flex items-center gap-2 text-body-sm text-on-surface-variant"
							for="login-remember"
						>
							<input
								id="login-remember"
								type="checkbox"
								name="rememberMe"
								bind:checked={loginRemember}
								class="size-4 rounded border-outline-variant"
							/>
							{m.login_remember()}
						</label>

						<Button variant="link" size="sm" type="button" class="self-start" onclick={openForgot}>
							{m.login_forgot()}
						</Button>

						{#if notice}
							<p class="text-body-sm text-primary" role="status">{notice}</p>
						{/if}

						{#if formError}
							<p class="text-body-sm text-error" role="alert">{formError}</p>
						{/if}

						<Button variant="primary" type="submit" class="mt-1 w-full" disabled={pending}>
							{pending ? m.login_pending() : m.login_submit()}
						</Button>
					</form>
				{:else}
					<form
						class="flex flex-col gap-4"
						method="post"
						onsubmit={handleRegister}
						novalidate
						data-testid="register-form"
					>
						<Field id="register-email" label={m.login_email()} error={registerFieldErrors.email}>
							<Input
								type="email"
								name="email"
								required
								autocapitalize="none"
								autocomplete="email"
								spellcheck="false"
								bind:value={registerEmail}
								onkeydown={onFieldKeydown}
								disabled={registerStep === 'code'}
								class="w-full"
							/>
						</Field>

						<PasswordField
							id="register-password"
							label={m.login_password()}
							autocomplete="new-password"
							bind:value={registerPassword}
							error={registerFieldErrors.password ?? ''}
							onkeydown={onFieldKeydown}
							disabled={registerStep === 'code'}
						/>

						<PasswordField
							id="register-confirm"
							label={m.register_confirm_password()}
							name="confirm"
							autocomplete="new-password"
							bind:value={registerConfirm}
							error={registerConfirmError ?? ''}
							showLabel={m.register_show_confirm()}
							hideLabel={m.register_hide_confirm()}
							onkeydown={onFieldKeydown}
							disabled={registerStep === 'code'}
						/>

						<Field
							id="register-display-name"
							label={m.register_display_name()}
							hint={m.register_display_name_hint()}
							error={registerFieldErrors.displayName}
						>
							<Input
								type="text"
								name="displayName"
								autocomplete="nickname"
								maxlength="80"
								bind:value={registerDisplayName}
								onkeydown={onFieldKeydown}
								disabled={registerStep === 'code'}
								class="w-full"
							/>
						</Field>

						<label
							class="flex items-center gap-2 text-body-sm text-on-surface-variant"
							for="register-remember"
						>
							<input
								id="register-remember"
								type="checkbox"
								name="rememberMe"
								bind:checked={registerRemember}
								class="size-4 rounded border-outline-variant"
							/>
							{m.login_remember()}
						</label>

						{#if registerStep === 'code'}
							<Field
								id="register-code"
								label={m.register_code()}
								hint={m.register_code_hint()}
								error={registerFieldErrors.code}
							>
								<Input
									type="text"
									name="code"
									inputmode="numeric"
									pattern="[0-9]*"
									autocomplete="one-time-code"
									maxlength="6"
									bind:value={registerCode}
									onkeydown={onFieldKeydown}
									class="w-full"
								/>
							</Field>
						{/if}

						{#if formError}
							<p class="text-body-sm text-error" role="alert">{formError}</p>
						{/if}

						<Button
							variant="primary"
							type="submit"
							class="mt-1 w-full"
							disabled={pending ||
								!registerReady ||
								(registerStep === 'code' && !isValidRegisterCode(registerCode))}
						>
							{#if registerStep === 'details'}
								{pending ? m.register_sending_code() : m.register_send_code()}
							{:else}
								{pending ? m.register_pending() : m.register_submit()}
							{/if}
						</Button>

						{#if registerStep === 'code'}
							<Button
								variant="secondary"
								type="button"
								class="w-full"
								disabled={pending}
								onclick={handleResend}
							>
								{m.register_resend()}
							</Button>
						{/if}
					</form>
				{/if}
			</div>
		{/if}
	</div>

	<p class="mt-4 font-mono text-[10px] text-on-surface-variant uppercase">{APP_VERSION}</p>
</main>
