<script lang="ts">
	import {
		formatHoursDecimal,
		formatHoursMinutes
	} from '$lib/time/duration';
	import type { PeriodStats } from '$lib/time/aggregates';

	let { stats }: { stats: PeriodStats } = $props();

	const totalLabel = $derived(formatHoursMinutes(stats.totalMs));
	const avgLabel = $derived(formatHoursMinutes(stats.dailyAverageMs));
	const productive = $derived(stats.mostProductiveDay);
	const vsTarget = $derived(stats.vsTargetRatio);
	const vsTargetPct = $derived(
		vsTarget != null ? `${vsTarget >= 0 ? '+' : ''}${Math.round(vsTarget * 100)}%` : null
	);
</script>

<div class="grid grid-cols-1 gap-gutter sm:grid-cols-3">
	<div
		class="flex flex-col justify-between rounded-lg border border-outline-variant bg-surface-container p-4"
	>
		<span class="font-mono text-code-label tracking-wider text-on-surface-variant uppercase"
			>Total Time</span
		>
		<div class="mt-4 flex items-baseline gap-2">
			<span class="font-mono text-code-display text-primary">{totalLabel}</span>
			<span class="font-mono text-code-label text-on-surface-variant">
				this {stats.period}
			</span>
		</div>
	</div>

	<div
		class="flex flex-col justify-between rounded-lg border border-outline-variant bg-surface-container p-4"
	>
		<span class="font-mono text-code-label tracking-wider text-on-surface-variant uppercase"
			>Most Productive Day</span
		>
		<div class="mt-4 flex items-baseline gap-2">
			<span class="font-mono text-code-display text-on-surface">
				{productive?.label ?? '—'}
			</span>
			{#if productive}
				<span class="font-mono text-code-label text-on-surface-variant">
					{formatHoursDecimal(productive.ms)} peak
				</span>
			{/if}
		</div>
	</div>

	<div
		class="flex flex-col justify-between rounded-lg border border-outline-variant bg-surface-container p-4"
	>
		<span class="font-mono text-code-label tracking-wider text-on-surface-variant uppercase"
			>Daily Average</span
		>
		<div class="mt-4 flex items-baseline gap-2">
			<span class="font-mono text-code-display text-on-surface">{avgLabel}</span>
			{#if vsTargetPct}
				<span
					class="font-mono text-code-label {(vsTarget ?? 0) >= 0
						? 'text-secondary'
						: 'text-error'}"
				>
					{vsTargetPct} vs target
				</span>
			{/if}
		</div>
	</div>
</div>
