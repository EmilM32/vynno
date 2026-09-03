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
	import { profileLabel } from '$lib/api/mappers/profile';
	import Button from '$lib/components/ui/Button.svelte';
	import Field from '$lib/components/ui/Field.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import { APP_VERSION } from '$lib/components/shell/nav';
	import ActivityTypesSection from './ActivityTypesSection.svelte';
	import ThemeSelect from './ThemeSelect.svelte';

	const sessionStore = useSession();
	const prefsStore = usePrefs();

	let displayNameDraft = $derived(prefsStore.displayName);
	let fileInput: HTMLInputElement | undefined;

	const profileBusy = $derived(sessionStore.pendingAction === 'profile');
	const nameDirty = $derived(displayNameDraft.trim() !== prefsStore.displayName);

	async function onSaveName() {
		if (profileBusy) return;
		const name = displayNameDraft.trim();
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
			<ProfileAvatar name={profileLabel(prefsStore)} src={prefsStore.avatarUrl} size="lg" />
			<div class="min-w-0">
				<p class="text-headline-md text-on-surface">{profileLabel(prefsStore)}</p>
				<p class="font-mono text-code-label text-on-surface-variant">{prefsStore.email}</p>
				<p class="mt-1 text-body-sm text-on-surface-variant">{m.settings_email_readonly()}</p>
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
			<Button variant="secondary" disabled={profileBusy} onclick={() => fileInput?.click()}>
				{m.settings_change_photo()}
			</Button>
			{#if prefsStore.avatarUrl}
				<Button variant="secondary" disabled={profileBusy} onclick={onRemovePhoto}>
					{m.settings_remove_photo()}
				</Button>
			{/if}
		</div>
		<p class="mt-2 text-body-sm text-on-surface-variant">{m.settings_photo_hint()}</p>

		<div class="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end">
			<Field id="display-name" label={m.settings_display_name()} class="min-w-0 flex-1">
				<Input
					tone="data"
					type="text"
					maxlength="80"
					bind:value={displayNameDraft}
					class="w-full"
				/>
			</Field>
			<Button variant="tonal" disabled={profileBusy || !nameDirty} onclick={onSaveName}>
				{m.settings_save_profile()}
			</Button>
		</div>

		{#if sessionStore.error}
			<p class="mt-3 text-body-sm text-error" role="alert">{sessionStore.error}</p>
		{/if}

		<Button variant="secondary" class="mt-4" onclick={onLogout}>
			{m.settings_logout()}
		</Button>
	</section>

	<ActivityTypesSection />

	<!-- Preferences -->
	<section
		class="rounded-lg border border-outline-variant bg-surface-container p-4"
		aria-labelledby="settings-prefs"
	>
		<h2 id="settings-prefs" class="mb-4 text-headline-md text-on-surface">
			{m.settings_preferences()}
		</h2>
		<div class="flex flex-col gap-5">
			<Field
				id="daily-target"
				label={m.settings_daily_target()}
				hint={m.settings_daily_target_hint()}
				layout="split"
			>
				<Input
					type="number"
					tone="data"
					size="sm"
					min="1"
					max="16"
					step="0.5"
					value={prefsStore.dailyTargetHours}
					oninput={onTargetInput}
					class="w-full sm:w-28"
				/>
			</Field>

			<Field
				id="default-project"
				label={m.settings_default_project()}
				hint={m.settings_default_project_hint()}
				layout="split"
			>
				<Select
					value={prefsStore.defaultProjectId}
					class="w-full sm:w-56"
					onchange={(e) => {
						const id = (e.currentTarget as HTMLSelectElement).value;
						prefsStore.setDefaultProjectId(id);
						if (!sessionStore.activeSession) {
							sessionStore.draftProjectId = id;
						}
					}}
				>
					{#each sessionStore.projects as project (project.id)}
						<option value={project.id}>{project.name}</option>
					{/each}
				</Select>
			</Field>

			<ThemeSelect />

			<Field
				id="ui-locale"
				label={m.settings_language()}
				hint={m.settings_language_hint()}
				layout="split"
			>
				<Select value={getLocale()} onchange={onLocaleChange} class="w-full sm:w-56">
					{#each locales as locale (locale)}
						<option value={locale}>{localeDisplayName(locale)}</option>
					{/each}
				</Select>
			</Field>

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
