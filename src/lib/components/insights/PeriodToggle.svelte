<script lang="ts" generics="T extends string">
	import Button from '$lib/components/ui/Button.svelte';
	import { m } from '$lib/paraglide/messages.js';

	let {
		value = $bindable(),
		options,
		ariaLabel
	}: {
		value: T;
		options: { id: T; label: string }[];
		ariaLabel?: string;
	} = $props();

	const groupLabel = $derived(ariaLabel ?? m.insights_period_aria());
</script>

<div
	class="inline-flex rounded-DEFAULT border border-outline-variant bg-surface-container-low p-0.5"
	role="group"
	aria-label={groupLabel}
>
	{#each options as opt (opt.id)}
		<Button
			variant="tab"
			size="sm"
			selected={value === opt.id}
			aria-pressed={value === opt.id}
			onclick={() => (value = opt.id)}
		>
			{opt.label}
		</Button>
	{/each}
</div>
