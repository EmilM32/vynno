<script lang="ts" module>
	export type SelectSize = 'sm' | 'md';

	const SIZE: Record<SelectSize, string> = {
		sm: 'min-h-8 py-1.5',
		md: 'min-h-10 py-2.5'
	};
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLSelectAttributes } from 'svelte/elements';
	import { getFieldContext } from './field-context';

	interface Props extends Omit<HTMLSelectAttributes, 'class' | 'size' | 'value'> {
		size?: SelectSize;
		value?: string;
		/**
		 * Layout utilities ONLY — flex, width, margin. Never padding, radius,
		 * border or type scale: those come from `size`.
		 */
		class?: string;
		children: Snippet;
	}

	let {
		id,
		size = 'md',
		value = $bindable(''),
		class: className = '',
		disabled = false,
		children,
		...rest
	}: Props = $props();

	const field = getFieldContext();
	const selectId = $derived(id ?? field?.id);
	const describedBy = $derived(
		[field?.describedBy, rest['aria-describedby']].filter(Boolean).join(' ') || undefined
	);
	const invalid = $derived(field?.invalid ? true : rest['aria-invalid']);
</script>

<select
	{...rest}
	id={selectId}
	bind:value
	{disabled}
	aria-invalid={invalid}
	aria-describedby={describedBy}
	class={[
		'native-select rounded border border-outline-variant bg-surface-container-low pl-3',
		'font-mono text-code-label text-on-surface',
		'disabled:cursor-not-allowed disabled:opacity-60',
		SIZE[size],
		className
	]}
>
	{@render children()}
</select>
