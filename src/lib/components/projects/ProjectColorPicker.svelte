<script lang="ts">
	import SwatchPicker from '$lib/components/ui/SwatchPicker.svelte';
	import { m } from '$lib/paraglide/messages.js';
	import { PROJECT_COLOR_LABEL_KEY, PROJECT_COLOR_PALETTE } from '$lib/projects/palette';

	interface Props {
		value: string;
		id?: string;
		onchange?: (color: string) => void;
	}

	let { value = $bindable(), id = 'project-color', onchange }: Props = $props();

	const options = $derived(
		PROJECT_COLOR_PALETTE.map((color) => ({
			value: color,
			color,
			label: colorLabel(color)
		}))
	);

	function colorLabel(color: string): string {
		const key = PROJECT_COLOR_LABEL_KEY[color as keyof typeof PROJECT_COLOR_LABEL_KEY];
		const messages = m as Record<string, unknown>;
		const fn = key ? messages[key] : undefined;
		if (typeof fn === 'function') return (fn as () => string)();
		return m.projects_color_option_aria({ color });
	}
</script>

<SwatchPicker
	bind:value
	{id}
	{options}
	{onchange}
	label={m.projects_color_aria()}
	compare={(a, b) => a.toLowerCase() === b.toLowerCase()}
/>
