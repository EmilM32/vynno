<script lang="ts" generics="T extends string">
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
		<button
			type="button"
			class="focus-ring min-h-6 rounded-sm px-3 py-1 font-mono text-code-label transition-colors {value ===
			opt.id
				? 'bg-primary/15 text-primary'
				: 'text-on-surface-variant hover:text-on-surface'}"
			aria-pressed={value === opt.id}
			onclick={() => (value = opt.id)}
		>
			{opt.label}
		</button>
	{/each}
</div>
