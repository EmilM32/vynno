<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import { themeStore } from '$lib/theme/theme.svelte';
	import { THEMES, type ThemeDefinition } from '$lib/theme/themes';

	function themeLabel(theme: ThemeDefinition): string {
		const messages = m as Record<string, unknown>;
		const fn = messages[theme.labelKey];
		return typeof fn === 'function' ? (fn as () => string)() : theme.id;
	}

	function onChange(e: Event) {
		themeStore.setTheme((e.currentTarget as HTMLSelectElement).value);
	}
</script>

<div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
	<label class="text-body-md text-on-surface" for="ui-theme">
		{m.settings_appearance()}
		<span class="mt-0.5 block text-body-sm text-on-surface-variant">
			{m.settings_appearance_hint()}
		</span>
	</label>
	<select
		id="ui-theme"
		class="native-select focus-ring w-full rounded border border-outline-variant bg-surface-container-low py-2 pl-3 font-mono text-code-label text-on-surface outline-none sm:w-56"
		value={themeStore.themeId}
		onchange={onChange}
	>
		{#each THEMES as theme (theme.id)}
			<option value={theme.id}>{themeLabel(theme)}</option>
		{/each}
	</select>
</div>
