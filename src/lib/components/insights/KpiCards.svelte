<script lang="ts">
	import KpiCard from '$lib/components/ui/KpiCard.svelte';
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
	<KpiCard
		label={m.insights_kpi_total_time()}
		value={totalLabel}
		caption={periodPhrase}
		valueTone="primary"
		valueTestId="kpi-total-time"
	/>
	<KpiCard
		label={m.insights_kpi_most_productive()}
		value={productive?.label ?? '—'}
		caption={productive
			? m.insights_kpi_peak({ hours: formatHoursDecimal(productive.ms) })
			: undefined}
	/>
	<KpiCard
		label={m.insights_kpi_daily_average()}
		value={avgLabel}
		caption={vsTargetPct ? m.insights_kpi_vs_target({ pct: vsTargetPct }) : undefined}
		captionTone={(vsTarget ?? 0) >= 0 ? 'positive' : 'negative'}
	/>
</div>
