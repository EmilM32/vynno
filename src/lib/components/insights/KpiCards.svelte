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
	const periodPhrase = $derived(
		stats.period === 'week' ? m.insights_kpi_this_week() : m.insights_kpi_this_month()
	);
</script>

<div class="grid grid-cols-3 gap-gutter">
	<div
		class="flex flex-col justify-between rounded-lg border border-outline-variant bg-surface-container p-2 sm:p-4"
	>
		<span
			class="font-mono text-[10px] tracking-wider text-on-surface-variant uppercase sm:text-code-label"
			>{m.insights_kpi_total_time()}</span
		>
		<div class="mt-2 flex flex-col gap-0.5 sm:mt-4 sm:flex-row sm:items-baseline sm:gap-2">
			<span
				class="font-mono text-code-data text-primary tabular-nums sm:text-code-display"
				data-testid="kpi-total-time">{totalLabel}</span
			>
			<span class="font-mono text-[10px] text-on-surface-variant sm:text-code-label">
				{periodPhrase}
			</span>
		</div>
	</div>

	<div
		class="flex flex-col justify-between rounded-lg border border-outline-variant bg-surface-container p-2 sm:p-4"
	>
		<span
			class="font-mono text-[10px] tracking-wider text-on-surface-variant uppercase sm:text-code-label"
			>{m.insights_kpi_most_productive()}</span
		>
		<div class="mt-2 flex flex-col gap-0.5 sm:mt-4 sm:flex-row sm:items-baseline sm:gap-2">
			<span class="font-mono text-code-data text-on-surface tabular-nums sm:text-code-display">
				{productive?.label ?? '—'}
			</span>
			{#if productive}
				<span class="font-mono text-[10px] text-on-surface-variant sm:text-code-label">
					{m.insights_kpi_peak({ hours: formatHoursDecimal(productive.ms) })}
				</span>
			{/if}
		</div>
	</div>

	<div
		class="flex flex-col justify-between rounded-lg border border-outline-variant bg-surface-container p-2 sm:p-4"
	>
		<span
			class="font-mono text-[10px] tracking-wider text-on-surface-variant uppercase sm:text-code-label"
			>{m.insights_kpi_daily_average()}</span
		>
		<div class="mt-2 flex flex-col gap-0.5 sm:mt-4 sm:flex-row sm:items-baseline sm:gap-2">
			<span class="font-mono text-code-data text-on-surface tabular-nums sm:text-code-display"
				>{avgLabel}</span
			>
			{#if vsTargetPct}
				<span
					class="font-mono text-[10px] sm:text-code-label {(vsTarget ?? 0) >= 0
						? 'text-secondary'
						: 'text-error'}"
				>
					{m.insights_kpi_vs_target({ pct: vsTargetPct })}
				</span>
			{/if}
		</div>
	</div>
</div>
