<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { loginRequest, registerRequest } from '$lib/api/auth';
	import { userMessageForError } from '$lib/api/user-message';
	import {
		normalizeEmail,
		passwordsMatch,
		validateRegisterFieldErrors,
		type RegisterFieldErrorKey
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

	let loginEmail = $state('');
	let loginPassword = $state('');
	let loginRemember = $state(true);
	let loginFieldErrors = $state<{ email?: string; password?: string }>({});

	let registerEmail = $state('');
	let registerPassword = $state('');
	let registerConfirm = $state('');
	let registerDisplayName = $state('');
	let registerRemember = $state(true);
	let registerFieldErrors = $state<Partial<Record<RegisterFieldErrorKey, string>>>({});

	const registerReady = $derived(passwordsMatch(registerPassword, registerConfirm));
	const registerConfirmError = $derived(
		registerConfirm && registerPassword !== registerConfirm
			? m.register_password_mismatch()
			: registerFieldErrors.confirm
	);

	function switchTab(next: AuthTab) {
		if (tab === next) return;
		tab = next;
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

		pending = true;
		try {
			const email = normalizeEmail(registerEmail);
			await registerRequest(
				email,
				registerPassword,
				registerRemember,
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
					<Field
						id="register-email"
						label={m.login_email()}
						error={registerFieldErrors.email}
					>
						<Input
							type="email"
							name="email"
							required
							autocapitalize="none"
							autocomplete="email"
							spellcheck="false"
							bind:value={registerEmail}
							onkeydown={onFieldKeydown}
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

					{#if formError}
						<p class="text-body-sm text-error" role="alert">{formError}</p>
					{/if}

					<Button
						variant="primary"
						type="submit"
						class="mt-1 w-full"
						disabled={pending || !registerReady}
					>
						{pending ? m.register_pending() : m.register_submit()}
					</Button>
				</form>
			{/if}
		</div>
	</div>

	<p class="mt-4 font-mono text-[10px] text-on-surface-variant uppercase">{APP_VERSION}</p>
</main>
