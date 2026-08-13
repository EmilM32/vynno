<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import { PROJECT_COLOR_LABEL_KEY, PROJECT_COLOR_PALETTE } from '$lib/projects/palette';

	interface Props {
		value: string;
		id?: string;
		onchange?: (color: string) => void;
	}

	let { value = $bindable(), id = 'project-color', onchange }: Props = $props();

	let buttons: HTMLButtonElement[] = $state([]);

	function select(color: string) {
		value = color;
		onchange?.(color);
	}

	function colorLabel(color: string): string {
		const key = PROJECT_COLOR_LABEL_KEY[color as keyof typeof PROJECT_COLOR_LABEL_KEY];
		const messages = m as Record<string, unknown>;
		const fn = key ? messages[key] : undefined;
		if (typeof fn === 'function') return (fn as () => string)();
		return m.projects_color_option_aria({ color });
	}

	function onSwatchKey(e: KeyboardEvent, index: number) {
		const last = PROJECT_COLOR_PALETTE.length - 1;
		let next: number;
		if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
			next = (index + 1) % PROJECT_COLOR_PALETTE.length;
		} else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
			next = (index - 1 + PROJECT_COLOR_PALETTE.length) % PROJECT_COLOR_PALETTE.length;
		} else if (e.key === 'Home') {
			next = 0;
		} else if (e.key === 'End') {
			next = last;
		} else {
			return;
		}
		e.preventDefault();
		const color = PROJECT_COLOR_PALETTE[next];
		if (!color) return;
		select(color);
		buttons[next]?.focus();
	}
</script>

<div class="flex flex-wrap gap-2" role="radiogroup" aria-label={m.projects_color_aria()} {id}>
	{#each PROJECT_COLOR_PALETTE as color, i (color)}
		{const selected = $derived(value.toLowerCase() === color.toLowerCase())}
		<button
			bind:this={buttons[i]}
			type="button"
			role="radio"
			aria-checked={selected}
			aria-label={colorLabel(color)}
			tabindex={selected ? 0 : -1}
			class="focus-ring h-8 w-8 rounded-DEFAULT border-2 transition-transform {selected
				? 'scale-110 border-on-surface'
				: 'border-transparent hover:scale-105'}"
			style:background-color={color}
			onclick={() => select(color)}
			onkeydown={(e) => onSwatchKey(e, i)}
		></button>
	{/each}
</div>
