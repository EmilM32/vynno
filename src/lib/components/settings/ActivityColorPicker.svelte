<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import {
		ACTIVITY_COLOR_TOKENS,
		activitySwatchClass,
		type ActivityColorToken
	} from '$lib/time/activity-styles';

	interface Props {
		value: string;
		id?: string;
		onchange?: (color: string) => void;
	}

	let { value = $bindable('primary'), id = 'activity-color', onchange }: Props = $props();

	let buttons: HTMLButtonElement[] = $state([]);

	function select(color: ActivityColorToken) {
		value = color;
		onchange?.(color);
	}

	function onSwatchKey(e: KeyboardEvent, index: number) {
		const last = ACTIVITY_COLOR_TOKENS.length - 1;
		let next: number;
		if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
			next = (index + 1) % ACTIVITY_COLOR_TOKENS.length;
		} else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
			next = (index - 1 + ACTIVITY_COLOR_TOKENS.length) % ACTIVITY_COLOR_TOKENS.length;
		} else if (e.key === 'Home') {
			next = 0;
		} else if (e.key === 'End') {
			next = last;
		} else {
			return;
		}
		e.preventDefault();
		const color = ACTIVITY_COLOR_TOKENS[next];
		if (!color) return;
		select(color);
		buttons[next]?.focus();
	}
</script>

<div class="flex flex-wrap gap-2" role="radiogroup" aria-label={m.activity_types_color_aria()} {id}>
	{#each ACTIVITY_COLOR_TOKENS as color, i (color)}
		{const selected = $derived(value === color)}
		<button
			bind:this={buttons[i]}
			type="button"
			role="radio"
			aria-checked={selected}
			aria-label={color}
			tabindex={selected ? 0 : -1}
			class="focus-ring h-8 w-8 rounded-DEFAULT border-2 {activitySwatchClass(color)} {selected
				? 'border-on-surface'
				: 'border-transparent'}"
			onclick={() => select(color)}
			onkeydown={(e) => onSwatchKey(e, i)}
		></button>
	{/each}
</div>
