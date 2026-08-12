<script lang="ts">
	import type { PeriodKind } from '$lib/time/duration';

	let {
		value = $bindable('week' as PeriodKind)
	}: {
		value?: PeriodKind;
	} = $props();
</script>

<div
	class="inline-flex rounded-DEFAULT border border-outline-variant bg-surface-container-low p-0.5"
	role="group"
	aria-label="Period"
>
	{#each [['week', 'Week'], ['month', 'Month']] as [id, label] (id)}
		<button
			type="button"
			class="focus-ring rounded-sm px-3 py-1 font-mono text-code-label transition-colors {value === id
				? 'bg-primary/15 text-primary'
				: 'text-on-surface-variant hover:text-on-surface'}"
			aria-pressed={value === id}
			onclick={() => (value = id as PeriodKind)}
		>
			{label}
		</button>
	{/each}
</div>
