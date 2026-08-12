<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import { PROJECT_COLOR_PALETTE } from '$lib/projects/palette';

	interface Props {
		value: string;
		id?: string;
		onchange?: (color: string) => void;
	}

	let { value = $bindable(), id = 'project-color', onchange }: Props = $props();

	function select(color: string) {
		value = color;
		onchange?.(color);
	}
</script>

<div class="flex flex-wrap gap-2" role="radiogroup" aria-label={m.projects_color_aria()} {id}>
	{#each PROJECT_COLOR_PALETTE as color (color)}
		{const selected = $derived(value.toLowerCase() === color.toLowerCase())}
		<button
			type="button"
			role="radio"
			aria-checked={selected}
			aria-label={m.projects_color_option_aria({ color })}
			class="focus-ring h-8 w-8 rounded-DEFAULT border-2 transition-transform {selected
				? 'scale-110 border-on-surface'
				: 'border-transparent hover:scale-105'}"
			style:background-color={color}
			onclick={() => select(color)}
		></button>
	{/each}
</div>
