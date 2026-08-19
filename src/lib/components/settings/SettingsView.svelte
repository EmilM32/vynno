<script lang="ts">
	import { resolve } from '$app/paths';
	import { m } from '$lib/paraglide/messages.js';
	import { getLocale, locales, setLocale, type Locale } from '$lib/paraglide/runtime.js';
	import { goto } from '$app/navigation';
	import { logoutRequest } from '$lib/api/auth';
	import { authStore } from '$lib/stores/auth.svelte';
	import { usePrefs } from '$lib/stores/prefs.svelte';
	import { useSession } from '$lib/stores/session.svelte';
	import PageHeader from '$lib/components/shell/PageHeader.svelte';
	import ProfileAvatar from '$lib/components/shell/ProfileAvatar.svelte';
	import { APP_VERSION } from '$lib/components/shell/nav';
	import ThemeSelect from './ThemeSelect.svelte';

	const sessionStore = useSession();
	const prefsStore = usePrefs();

	let displayNameDraft = $derived(prefsStore.displayName);
	let fileInput: HTMLInputElement | undefined;

	const profileBusy = $derived(sessionStore.pendingAction === 'profile');
	const nameDirty = $derived(displayNameDraft.trim() !== prefsStore.displayName);

	async function onSaveName() {
		const name = displayNameDraft.trim();
		if (!name || profileBusy) return;
		const ok = await sessionStore.updateProfile({ displayName: name });
		if (ok) displayNameDraft = prefsStore.displayName;
	}

	async function onPhotoSelected(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		input.value = '';
		if (!file || profileBusy) return;
		await sessionStore.uploadAvatar(file);
	}

	async function onRemovePhoto() {
		if (profileBusy) return;
		await sessionStore.deleteAvatar();
	}

	function onTargetInput(e: Event) {
		const v = Number((e.currentTarget as HTMLInputElement).value);
		prefsStore.setDailyTargetHours(v);
	}

	function localeDisplayName(locale: Locale): string {
		switch (locale) {
			case 'en':
				return m.locale_en();
			case 'pl':
				return m.locale_pl();
		}
	}

	async function onLogout() {
		try {
			await logoutRequest();
		} catch {
			// Cookie may already be gone.
		}
		authStore.clearSession();
		await goto(resolve('/login'), { invalidateAll: true });
	}

	function onLocaleChange(e: Event) {
		const value = (e.currentTarget as HTMLSelectElement).value as Locale;
		if ((locales as readonly string[]).includes(value)) {
			setLocale(value);
		}
	}
</script>

<div
	class="mx-auto flex w-full max-w-2xl flex-col gap-8 md:mx-0 md:max-w-none"
	data-testid="page-view"
>
	<PageHeader title={m.settings_title()} description={m.settings_subtitle()} />

	<!-- Profile -->
	<section
		class="rounded-lg border border-outline-variant bg-surface-container p-4"
		aria-labelledby="settings-profile"
	>
		<h2 id="settings-profile" class="mb-4 text-headline-md text-on-surface">
			{m.settings_profile()}
		</h2>
		<div class="flex items-center gap-4">
			<ProfileAvatar name={prefsStore.displayName} src={prefsStore.avatarUrl} size="lg" />
			<div class="min-w-0">
				<p class="text-headline-md text-on-surface">{prefsStore.displayName}</p>
				<p class="font-mono text-code-label text-on-surface-variant">{prefsStore.handle}</p>
				<p class="mt-1 text-body-sm text-on-surface-variant">{m.settings_handle_readonly()}</p>
			</div>
		</div>

		<div class="mt-4 flex flex-wrap items-center gap-2">
			<input
				bind:this={fileInput}
				type="file"
				accept="image/jpeg,image/png,image/webp"
				class="sr-only"
				tabindex="-1"
				aria-hidden="true"
				onchange={onPhotoSelected}
			/>
			<button
				type="button"
				class="press focus-ring min-h-10 rounded border border-outline-variant px-4 py-2 font-mono text-code-data text-on-surface hover:bg-surface-container-high disabled:opacity-50"
				disabled={profileBusy}
				onclick={() => fileInput?.click()}
			>
				{m.settings_change_photo()}
			</button>
			{#if prefsStore.avatarUrl}
				<button
					type="button"
					class="press focus-ring min-h-10 rounded border border-outline-variant px-4 py-2 font-mono text-code-data text-on-surface hover:bg-surface-container-high disabled:opacity-50"
					disabled={profileBusy}
					onclick={onRemovePhoto}
				>
					{m.settings_remove_photo()}
				</button>
			{/if}
		</div>
		<p class="mt-2 text-body-sm text-on-surface-variant">{m.settings_photo_hint()}</p>

		<div class="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end">
			<label
				class="flex min-w-0 flex-1 flex-col gap-1 text-body-md text-on-surface"
				for="display-name"
			>
				{m.settings_display_name()}
				<input
					id="display-name"
					type="text"
					maxlength="80"
					bind:value={displayNameDraft}
					class="rounded border border-outline-variant bg-surface-container-low px-3 py-2 font-mono text-code-data text-on-surface"
				/>
			</label>
			<button
				type="button"
				class="press focus-ring min-h-10 rounded border border-primary/30 bg-primary/10 px-4 py-2 font-mono text-code-data text-primary hover:bg-primary/20 disabled:opacity-50"
				disabled={profileBusy || !nameDirty || !displayNameDraft.trim()}
				onclick={onSaveName}
			>
				{m.settings_save_profile()}
			</button>
		</div>

		{#if sessionStore.error}
			<p class="mt-3 text-body-sm text-error" role="alert">{sessionStore.error}</p>
		{/if}

		<button
			type="button"
			class="press focus-ring mt-4 min-h-10 rounded border border-outline-variant px-4 py-2 font-mono text-code-data text-on-surface hover:bg-surface-container-high"
			onclick={onLogout}
		>
			{m.settings_logout()}
		</button>
	</section>

	<!-- Preferences -->
	<section
		class="rounded-lg border border-outline-variant bg-surface-container p-4"
		aria-labelledby="settings-prefs"
	>
		<h2 id="settings-prefs" class="mb-4 text-headline-md text-on-surface">
			{m.settings_preferences()}
		</h2>
		<div class="flex flex-col gap-5">
			<div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
				<label class="text-body-md text-on-surface" for="daily-target">
					{m.settings_daily_target()}
					<span id="daily-target-hint" class="mt-0.5 block text-body-sm text-on-surface-variant">
						{m.settings_daily_target_hint()}
					</span>
				</label>
				<input
					id="daily-target"
					type="number"
					min="1"
					max="16"
					step="0.5"
					value={prefsStore.dailyTargetHours}
					oninput={onTargetInput}
					aria-describedby="daily-target-hint"
					class="w-full rounded border border-outline-variant bg-surface-container-low px-3 py-2 font-mono text-code-data text-on-surface sm:w-28"
				/>
			</div>

			<div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
				<label class="text-body-md text-on-surface" for="default-project">
					{m.settings_default_project()}
					<span class="mt-0.5 block text-body-sm text-on-surface-variant">
						{m.settings_default_project_hint()}
					</span>
				</label>
				<select
					id="default-project"
					class="native-select w-full rounded border border-outline-variant bg-surface-container-low py-2 pl-3 font-mono text-code-label text-on-surface sm:w-56"
					bind:value={prefsStore.defaultProjectId}
					onchange={() => {
						// Keep timer draft in sync when idle
						if (!sessionStore.activeSession) {
							sessionStore.draftProjectId = prefsStore.defaultProjectId;
						}
					}}
				>
					{#each sessionStore.projects as project (project.id)}
						<option value={project.id}>{project.name}</option>
					{/each}
				</select>
			</div>

			<ThemeSelect />

			<div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
				<label class="text-body-md text-on-surface" for="ui-locale">
					{m.settings_language()}
					<span class="mt-0.5 block text-body-sm text-on-surface-variant">
						{m.settings_language_hint()}
					</span>
				</label>
				<select
					id="ui-locale"
					class="native-select w-full rounded border border-outline-variant bg-surface-container-low py-2 pl-3 font-mono text-code-label text-on-surface sm:w-56"
					value={getLocale()}
					onchange={onLocaleChange}
				>
					{#each locales as locale (locale)}
						<option value={locale}>{localeDisplayName(locale)}</option>
					{/each}
				</select>
			</div>

			<p class="text-body-sm text-on-surface-variant">
				<a href={resolve('/projects')} class="focus-ring text-primary underline underline-offset-2">
					{m.settings_manage_projects()}
				</a>
				{m.settings_manage_projects_suffix()}
			</p>
		</div>
	</section>

	<!-- About -->
	<section
		class="rounded-lg border border-outline-variant bg-surface-container p-4"
		aria-labelledby="settings-about"
	>
		<h2 id="settings-about" class="mb-4 text-headline-md text-on-surface">
			{m.settings_about({ name: m.app_name() })}
		</h2>
		<div class="flex flex-col gap-3 text-body-sm">
			<dl class="flex flex-col gap-3">
				<div>
					<dt class="text-on-surface-variant">{m.settings_about_pronounced()}</dt>
					<dd class="flex flex-wrap items-baseline gap-x-2 font-mono text-code-label">
						<span class="text-on-surface">{m.settings_about_pronunciation()}</span>
						<span class="text-on-surface-variant" lang="en-fonipa">/ˈvɪn.oʊ/</span>
					</dd>
				</div>
				<div>
					<dt class="text-on-surface-variant">{m.settings_about_version()}</dt>
					<dd class="font-mono text-code-label text-on-surface">{APP_VERSION}</dd>
				</div>
			</dl>
			<p class="text-on-surface-variant">{m.settings_about_oneliner({ name: m.app_name() })}</p>
			<p class="text-on-surface-variant">{m.settings_about_coined()}</p>
		</div>
	</section>
</div>
