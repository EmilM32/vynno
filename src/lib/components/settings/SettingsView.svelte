<script lang="ts">
	import { resolve } from '$app/paths';
	import { m } from '$lib/paraglide/messages.js';
	import { getLocale, locales, setLocale, type Locale } from '$lib/paraglide/runtime.js';
	import { sessionStore } from '$lib/stores/session.svelte';
	import { prefsStore } from '$lib/stores/prefs.svelte';
	import { APP_VERSION } from '$lib/components/shell/nav';
	import ThemeSelect from './ThemeSelect.svelte';

	function onTargetInput(e: Event) {
		const v = Number((e.currentTarget as HTMLInputElement).value);
		prefsStore.setDailyTargetHours(v);
	}

	function localeDisplayName(locale: Locale): string {
		if (locale === 'en') return m.locale_en();
		return locale;
	}

	function onLocaleChange(e: Event) {
		const value = (e.currentTarget as HTMLSelectElement).value as Locale;
		if ((locales as readonly string[]).includes(value)) {
			setLocale(value);
		}
	}
</script>

<div class="mx-auto flex w-full max-w-2xl flex-col gap-8">
	<div class="border-b border-outline-variant pb-4">
		<h1 class="text-headline-lg text-on-surface">{m.settings_title()}</h1>
		<p class="mt-1 text-body-sm text-on-surface-variant">
			{m.settings_subtitle()}
		</p>
	</div>

	<!-- Profile -->
	<section
		class="rounded-lg border border-outline-variant bg-surface-container p-4"
		aria-labelledby="settings-profile"
	>
		<h2 id="settings-profile" class="mb-4 text-headline-md text-on-surface">
			{m.settings_profile()}
		</h2>
		<div class="flex items-center gap-4">
			<div
				class="flex h-14 w-14 shrink-0 items-center justify-center rounded-DEFAULT border border-primary/30 bg-primary/10 font-mono text-lg font-medium text-primary"
				aria-hidden="true"
			>
				{prefsStore.displayName
					.split(/\s+/)
					.map((w) => w[0])
					.join('')
					.slice(0, 2)
					.toUpperCase()}
			</div>
			<div class="min-w-0">
				<p class="text-headline-md text-on-surface">{prefsStore.displayName}</p>
				<p class="font-mono text-code-label text-on-surface-variant">{prefsStore.handle}</p>
			</div>
		</div>
		<p class="mt-3 text-body-sm text-outline">{m.settings_profile_mock()}</p>
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
					<span class="mt-0.5 block text-body-sm text-on-surface-variant">
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
					class="focus-ring w-full rounded border border-outline-variant bg-surface-container-low px-3 py-2 font-mono text-code-data text-on-surface outline-none sm:w-28"
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
					class="focus-ring w-full rounded border border-outline-variant bg-surface-container-low px-3 py-2 font-mono text-code-label text-on-surface outline-none sm:w-56"
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
					class="focus-ring w-full rounded border border-outline-variant bg-surface-container-low px-3 py-2 font-mono text-code-label text-on-surface outline-none sm:w-56"
					value={getLocale()}
					onchange={onLocaleChange}
				>
					{#each locales as locale (locale)}
						<option value={locale}>{localeDisplayName(locale)}</option>
					{/each}
				</select>
			</div>

			<p class="text-body-sm text-on-surface-variant">
				<a
					href={resolve('/projects')}
					class="focus-ring text-primary underline-offset-2 hover:underline"
				>
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
					<dd class="font-mono text-code-label text-on-surface">
						{m.settings_about_pronunciation()}
					</dd>
				</div>
				<div>
					<dt class="text-on-surface-variant">{m.settings_about_version()}</dt>
					<dd class="font-mono text-code-label text-on-surface">{APP_VERSION}</dd>
				</div>
			</dl>
			<p class="text-body-md text-on-surface">{m.settings_about_tagline()}</p>
			<p class="text-on-surface-variant">{m.settings_about_oneliner({ name: m.app_name() })}</p>
			<p class="text-on-surface-variant">{m.settings_about_coined()}</p>
		</div>
	</section>

	<!-- Coming later -->
	<section
		class="rounded-lg border border-dashed border-outline-variant bg-surface-container/40 p-4"
		aria-labelledby="settings-later"
	>
		<h2 id="settings-later" class="mb-2 text-headline-md text-on-surface-variant">
			{m.settings_coming_later()}
		</h2>
		<ul class="list-inside list-disc space-y-1 text-body-sm text-outline">
			<li>{m.settings_later_notifications()}</li>
			<li>{m.settings_later_account()}</li>
			<li>{m.settings_later_persisted()}</li>
		</ul>
	</section>
</div>
