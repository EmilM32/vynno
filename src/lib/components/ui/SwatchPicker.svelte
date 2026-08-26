<script lang="ts">
	interface SwatchOption {
		value: string;
		label: string;
		/** Hex fill. Ignored when `className` is set. */
		color?: string;
		/** Token fill (activity swatches). */
		className?: string;
	}

	interface Props {
		value: string;
		options: readonly SwatchOption[];
		id?: string;
		/** Accessible name for the radiogroup. */
		label: string;
		onchange?: (value: string) => void;
		compare?: (a: string, b: string) => boolean;
	}

	let {
		value = $bindable(),
		options,
		id,
		label,
		onchange,
		compare = (a, b) => a === b
	}: Props = $props();

	let buttons: HTMLButtonElement[] = $state([]);

	function select(next: string) {
		value = next;
		onchange?.(next);
	}

	function onSwatchKey(e: KeyboardEvent, index: number) {
		const last = options.length - 1;
		let next: number;
		if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
			next = (index + 1) % options.length;
		} else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
			next = (index - 1 + options.length) % options.length;
		} else if (e.key === 'Home') {
			next = 0;
		} else if (e.key === 'End') {
			next = last;
		} else {
			return;
		}
		e.preventDefault();
		const opt = options[next];
		if (!opt) return;
		select(opt.value);
		buttons[next]?.focus();
	}
</script>

<div class="flex flex-wrap gap-2" role="radiogroup" aria-label={label} {id}>
	{#each options as opt, i (opt.value)}
		{const selected = $derived(compare(value, opt.value))}
		<button
			bind:this={buttons[i]}
			type="button"
			role="radio"
			aria-checked={selected}
			aria-label={opt.label}
			tabindex={selected ? 0 : -1}
			class="focus-ring h-8 w-8 rounded-DEFAULT border-2 transition-colors {opt.className ??
				''} {selected ? 'border-on-surface' : 'border-transparent'}"
			style:background-color={opt.className ? undefined : opt.color}
			onclick={() => select(opt.value)}
			onkeydown={(e) => onSwatchKey(e, i)}
		></button>
	{/each}
</div>
