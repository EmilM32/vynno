<script lang="ts">
	import Field from '$lib/components/ui/Field.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import { m } from '$lib/paraglide/messages.js';
	import { themeStore } from '$lib/theme/theme.svelte';
	import { THEMES, type ThemeDefinition } from '$lib/theme/themes';

	function themeLabel(theme: ThemeDefinition): string {
		const messages = m as Record<string, unknown>;
		const fn = messages[theme.labelKey];
		return typeof fn === 'function' ? (fn as () => string)() : theme.id;
	}
</script>

<Field
	id="ui-theme"
	label={m.settings_appearance()}
	hint={m.settings_appearance_hint()}
	layout="split"
>
	<Select
		value={themeStore.themeId}
		onchange={(id) => themeStore.setTheme(id)}
		class="w-full sm:w-56"
		options={THEMES.map((theme) => ({ value: theme.id, label: themeLabel(theme) }))}
	/>
</Field>
