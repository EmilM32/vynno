<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { loginRequest, registerRequest } from '$lib/api/auth';
	import { userMessageForError } from '$lib/api/user-message';
	import {
		normalizeUsername,
		passwordsMatch,
		validateRegisterFieldErrors,
		type RegisterFieldErrorKey
	} from '$lib/auth/validate';
	import BrandMark from '$lib/components/shell/BrandMark.svelte';
	import { APP_VERSION } from '$lib/components/shell/nav';
	import { m } from '$lib/paraglide/messages.js';
	import { authStore } from '$lib/stores/auth.svelte';
	import PasswordField from './PasswordField.svelte';

	type AuthTab = 'login' | 'register';

	let tab = $state<AuthTab>('login');
	let pending = $state(false);
	let formError = $state('');

	let loginUsername = $state('');
	let loginPassword = $state('');
	let loginRemember = $state(true);
	let loginFieldErrors = $state<{ username?: string; password?: string }>({});

	let registerUsername = $state('');
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
		const errors: { username?: string; password?: string } = {};
		if (!loginUsername.trim()) errors.username = m.login_username_required();
		if (!loginPassword) errors.password = m.login_password_required();
		loginFieldErrors = errors;
		formError = '';
		if (errors.username || errors.password) return;

		pending = true;
		try {
			await loginRequest(loginUsername.trim(), loginPassword, loginRemember);
			authStore.applySession(loginUsername, loginRemember);
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
			username: registerUsername,
			password: registerPassword,
			confirm: registerConfirm,
			displayName: registerDisplayName
		});
		registerFieldErrors = errors;
		formError = '';
		if (errors.username || errors.password || errors.confirm || errors.displayName) return;

		pending = true;
		try {
			const username = normalizeUsername(registerUsername);
			await registerRequest(
				username,
				registerPassword,
				registerRemember,
				registerDisplayName.trim() || undefined
			);
			authStore.applySession(username, registerRemember);
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
			<button
				type="button"
				role="tab"
				id="tab-login"
				aria-selected={tab === 'login'}
				aria-controls="auth-panel"
				tabindex={tab === 'login' ? 0 : -1}
				class="focus-ring flex-1 rounded px-3 py-1.5 text-body-sm font-medium transition-colors {tab ===
				'login'
					? 'bg-surface-container-high text-primary'
					: 'text-on-surface-variant hover:text-on-surface'}"
				onclick={() => switchTab('login')}
			>
				{m.login_tab_login()}
			</button>
			<button
				type="button"
				role="tab"
				id="tab-register"
				aria-selected={tab === 'register'}
				aria-controls="auth-panel"
				tabindex={tab === 'register' ? 0 : -1}
				class="focus-ring flex-1 rounded px-3 py-1.5 text-body-sm font-medium transition-colors {tab ===
				'register'
					? 'bg-surface-container-high text-primary'
					: 'text-on-surface-variant hover:text-on-surface'}"
				onclick={() => switchTab('register')}
			>
				{m.login_tab_register()}
			</button>
		</div>

		<div
			id="auth-panel"
			role="tabpanel"
			aria-labelledby={tab === 'login' ? 'tab-login' : 'tab-register'}
		>
			{#if tab === 'login'}
				<form
					class="flex flex-col gap-4"
					onsubmit={handleLogin}
					novalidate
					data-testid="login-form"
				>
					<div class="flex flex-col gap-1.5">
						<label class="text-body-sm text-on-surface-variant" for="login-username">
							{m.login_username()}
						</label>
						<input
							id="login-username"
							type="text"
							name="username"
							required
							autocapitalize="none"
							autocomplete="username"
							spellcheck="false"
							bind:value={loginUsername}
							aria-invalid={loginFieldErrors.username ? 'true' : undefined}
							aria-describedby={loginFieldErrors.username ? 'login-username-error' : undefined}
							class="min-h-10 w-full rounded border border-outline-variant bg-surface-container-low px-3 py-2.5 text-body-md text-on-surface"
						/>
						{#if loginFieldErrors.username}
							<p id="login-username-error" class="text-body-sm text-error" role="alert">
								{loginFieldErrors.username}
							</p>
						{/if}
					</div>

					<PasswordField
						id="login-password"
						label={m.login_password()}
						autocomplete="current-password"
						bind:value={loginPassword}
						error={loginFieldErrors.password ?? ''}
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

					<button
						type="submit"
						disabled={pending}
						class="press focus-ring mt-1 min-h-10 w-full rounded bg-primary px-4 py-2.5 font-mono text-code-data font-medium text-on-primary hover:bg-primary-container disabled:opacity-60"
					>
						{pending ? m.login_pending() : m.login_submit()}
					</button>
				</form>
			{:else}
				<form
					class="flex flex-col gap-4"
					onsubmit={handleRegister}
					novalidate
					data-testid="register-form"
				>
					<div class="flex flex-col gap-1.5">
						<label class="text-body-sm text-on-surface-variant" for="register-username">
							{m.login_username()}
						</label>
						<input
							id="register-username"
							type="text"
							name="username"
							required
							autocapitalize="none"
							autocomplete="username"
							spellcheck="false"
							bind:value={registerUsername}
							aria-invalid={registerFieldErrors.username ? 'true' : undefined}
							aria-describedby={registerFieldErrors.username
								? 'register-username-error'
								: undefined}
							class="min-h-10 w-full rounded border border-outline-variant bg-surface-container-low px-3 py-2.5 text-body-md text-on-surface"
						/>
						{#if registerFieldErrors.username}
							<p id="register-username-error" class="text-body-sm text-error" role="alert">
								{registerFieldErrors.username}
							</p>
						{/if}
					</div>

					<PasswordField
						id="register-password"
						label={m.login_password()}
						autocomplete="new-password"
						bind:value={registerPassword}
						error={registerFieldErrors.password ?? ''}
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
					/>

					<div class="flex flex-col gap-1.5">
						<label class="text-body-sm text-on-surface-variant" for="register-display-name">
							{m.register_display_name()}
						</label>
						<input
							id="register-display-name"
							type="text"
							name="displayName"
							autocomplete="nickname"
							maxlength="80"
							bind:value={registerDisplayName}
							aria-describedby="register-display-name-hint"
							aria-invalid={registerFieldErrors.displayName ? 'true' : undefined}
							class="min-h-10 w-full rounded border border-outline-variant bg-surface-container-low px-3 py-2.5 text-body-md text-on-surface"
						/>
						<p id="register-display-name-hint" class="text-body-sm text-on-surface-variant">
							{m.register_display_name_hint()}
						</p>
						{#if registerFieldErrors.displayName}
							<p id="register-display-name-error" class="text-body-sm text-error" role="alert">
								{registerFieldErrors.displayName}
							</p>
						{/if}
					</div>

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

					<button
						type="submit"
						disabled={pending || !registerReady}
						class="press focus-ring mt-1 min-h-10 w-full rounded bg-primary px-4 py-2.5 font-mono text-code-data font-medium text-on-primary hover:bg-primary-container disabled:cursor-not-allowed disabled:opacity-60"
					>
						{pending ? m.register_pending() : m.register_submit()}
					</button>
				</form>
			{/if}
		</div>
	</div>

	<p class="mt-4 font-mono text-[10px] text-on-surface-variant uppercase">{APP_VERSION}</p>
</main>
