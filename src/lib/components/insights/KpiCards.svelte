<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import { formatHoursDecimal, formatHoursMinutes } from '$lib/time/duration';
	import type { PeriodStats } from '$lib/time/aggregates';

	let { stats }: { stats: PeriodStats } = $props();

	const totalLabel = $derived(formatHoursMinutes(stats.totalMs));
	const avgLabel = $derived(formatHoursMinutes(stats.dailyAverageMs));
	const productive = $derived(stats.mostProductiveDay);
	const vsTarget = $derived(stats.vsTargetRatio);
	const vsTargetPct = $derived(
		vsTarget != null ? `${vsTarget >= 0 ? '+' : ''}${Math.round(vsTarget * 100)}%` : null
	);
	const periodWord = $derived(
		stats.period === 'week' ? m.insights_period_week().toLowerCase() : m.insights_period_month().toLowerCase()
	);
</script>

<div class="grid grid-cols-1 gap-gutter sm:grid-cols-3">
	<div
		class="flex flex-col justify-between rounded-lg border border-outline-variant bg-surface-container p-4"
	>
		<span class="font-mono text-code-label tracking-wider text-on-surface-variant uppercase"
			>{m.insights_kpi_total_time()}</span
		>
		<div class="mt-4 flex items-baseline gap-2">
			<span class="font-mono text-code-display text-primary" data-testid="kpi-total-time"
				>{totalLabel}</span
			>
			<span class="font-mono text-code-label text-on-surface-variant">
				{m.insights_kpi_this_period({ period: periodWord })}
			</span>
		</div>
	</div>

	<div
		class="flex flex-col justify-between rounded-lg border border-outline-variant bg-surface-container p-4"
	>
		<span class="font-mono text-code-label tracking-wider text-on-surface-variant uppercase"
			>{m.insights_kpi_most_productive()}</span
		>
		<div class="mt-4 flex items-baseline gap-2">
			<span class="font-mono text-code-display text-on-surface">
				{productive?.label ?? '—'}
			</span>
			{#if productive}
				<span class="font-mono text-code-label text-on-surface-variant">
					{m.insights_kpi_peak({ hours: formatHoursDecimal(productive.ms) })}
				</span>
			{/if}
		</div>
	</div>

	<div
		class="flex flex-col justify-between rounded-lg border border-outline-variant bg-surface-container p-4"
	>
		<span class="font-mono text-code-label tracking-wider text-on-surface-variant uppercase"
			>{m.insights_kpi_daily_average()}</span
		>
		<div class="mt-4 flex items-baseline gap-2">
			<span class="font-mono text-code-display text-on-surface">{avgLabel}</span>
			{#if vsTargetPct}
				<span
					class="font-mono text-code-label {(vsTarget ?? 0) >= 0
						? 'text-secondary'
						: 'text-error'}"
				>
					{m.insights_kpi_vs_target({ pct: vsTargetPct })}
				</span>
			{/if}
		</div>
	</div>
</div>
