<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { loginRequest } from '$lib/api/auth';
	import { userMessageForError } from '$lib/api/user-message';
	import BrandMark from '$lib/components/shell/BrandMark.svelte';
	import { APP_VERSION } from '$lib/components/shell/nav';
	import { m } from '$lib/paraglide/messages.js';
	import { authStore } from '$lib/stores/auth.svelte';

	let username = $state('');
	let password = $state('');
	let rememberMe = $state(true);
	let pending = $state(false);
	let formError = $state('');
	let fieldErrors = $state<{ username?: string; password?: string }>({});

	async function handleSubmit(e: Event) {
		e.preventDefault();
		const errors: { username?: string; password?: string } = {};
		if (!username.trim()) errors.username = m.login_username_required();
		if (!password) errors.password = m.login_password_required();
		fieldErrors = errors;
		formError = '';
		if (errors.username || errors.password) return;

		pending = true;
		try {
			await loginRequest(username.trim(), password, rememberMe);
			authStore.applySession(username, rememberMe);
			await goto(resolve('/dashboard'));
		} catch (err) {
			formError = userMessageForError(err, () => m.error_invalid_credentials());
		} finally {
			pending = false;
		}
	}
</script>

<main
	class="flex min-h-dvh flex-col items-center justify-center bg-surface px-margin-mobile py-10 text-on-surface"
>
	<form
		class="w-full max-w-sm rounded-lg border border-outline-variant bg-surface-container p-6"
		onsubmit={handleSubmit}
		novalidate
		data-testid="login-form"
	>
		<div class="mb-6 flex items-center gap-3">
			<BrandMark class="size-8 shrink-0 text-primary" />
			<div>
				<h1 class="text-headline-md leading-tight font-bold text-primary">{m.app_name()}</h1>
				<p class="text-body-sm text-on-surface-variant">{m.login_tagline()}</p>
			</div>
		</div>

		<div class="flex flex-col gap-4">
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
					bind:value={username}
					aria-invalid={fieldErrors.username ? 'true' : undefined}
					aria-describedby={fieldErrors.username ? 'login-username-error' : undefined}
					class="min-h-10 w-full rounded border border-outline-variant bg-surface-container-low px-3 py-2.5 text-body-md text-on-surface"
				/>
				{#if fieldErrors.username}
					<p id="login-username-error" class="text-body-sm text-error" role="alert">
						{fieldErrors.username}
					</p>
				{/if}
			</div>

			<div class="flex flex-col gap-1.5">
				<label class="text-body-sm text-on-surface-variant" for="login-password">
					{m.login_password()}
				</label>
				<input
					id="login-password"
					type="password"
					name="password"
					required
					autocomplete="current-password"
					bind:value={password}
					aria-invalid={fieldErrors.password ? 'true' : undefined}
					aria-describedby={fieldErrors.password ? 'login-password-error' : undefined}
					class="min-h-10 w-full rounded border border-outline-variant bg-surface-container-low px-3 py-2.5 text-body-md text-on-surface"
				/>
				{#if fieldErrors.password}
					<p id="login-password-error" class="text-body-sm text-error" role="alert">
						{fieldErrors.password}
					</p>
				{/if}
			</div>

			<label class="flex items-center gap-2 text-body-sm text-on-surface-variant" for="login-remember">
				<input
					id="login-remember"
					type="checkbox"
					name="rememberMe"
					bind:checked={rememberMe}
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
		</div>
	</form>

	<p class="mt-4 font-mono text-[10px] text-on-surface-variant uppercase">{APP_VERSION}</p>
</main>
