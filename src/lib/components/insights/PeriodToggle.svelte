<script lang="ts" generics="T extends string">
	import Button from '$lib/components/ui/Button.svelte';
	import { m } from '$lib/paraglide/messages.js';

	let {
		value = $bindable(),
		options,
		ariaLabel,
		fill = false,
		onchange
	}: {
		value: T | null;
		options: { id: T; label: string }[];
		ariaLabel?: string;
		/** Below `sm`, span the full width with equal-share segments. */
		fill?: boolean;
		onchange?: (id: T) => void;
	} = $props();

	const groupLabel = $derived(ariaLabel ?? m.insights_period_aria());
</script>

<div
	class={[
		'rounded-DEFAULT border border-outline-variant bg-surface-container-low p-0.5',
		fill ? 'flex w-full sm:inline-flex sm:w-auto' : 'inline-flex'
	]}
	role="group"
	aria-label={groupLabel}
>
	{#each options as opt (opt.id)}
		<Button
			variant="tab"
			size="sm"
			class={fill ? 'flex-1 whitespace-nowrap sm:flex-none' : 'whitespace-nowrap'}
			selected={value === opt.id}
			aria-pressed={value === opt.id}
			onclick={() => {
				value = opt.id;
				onchange?.(opt.id);
			}}
		>
			{opt.label}
		</Button>
	{/each}
</div>
