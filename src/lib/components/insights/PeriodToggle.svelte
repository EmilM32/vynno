<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import type { PeriodKind } from '$lib/time/duration';

	let {
		value = $bindable('week' as PeriodKind)
	}: {
		value?: PeriodKind;
	} = $props();

	const options = $derived([
		{ id: 'week' as const, label: m.insights_period_week() },
		{ id: 'month' as const, label: m.insights_period_month() }
	]);
</script>

<div
	class="inline-flex rounded-DEFAULT border border-outline-variant bg-surface-container-low p-0.5"
	role="group"
	aria-label={m.insights_period_aria()}
>
	{#each options as opt (opt.id)}
		<button
			type="button"
			class="focus-ring rounded-sm px-3 py-1 font-mono text-code-label transition-colors {value ===
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
