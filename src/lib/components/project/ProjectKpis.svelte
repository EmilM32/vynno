<script lang="ts">
	import KpiCard from '$lib/components/ui/KpiCard.svelte';
	import { m } from '$lib/paraglide/messages.js';
	import type { ProjectPeriodStats } from '$lib/time/aggregates';
	import { formatHoursMinutes } from '$lib/time/duration';

	let { stats }: { stats: ProjectPeriodStats } = $props();

	const totalLabel = $derived(formatHoursMinutes(stats.totalMs));
	const avgLabel = $derived(formatHoursMinutes(stats.dailyAverageMs));
	const periodPhrase = $derived(
		stats.period === 'week'
			? m.insights_kpi_this_week()
			: stats.period === 'month'
				? m.insights_kpi_this_month()
				: m.project_kpi_all_time()
	);
	const shareOf = $derived(
		m.project_kpi_share_of({
			project: formatHoursMinutes(stats.totalMs),
			total: formatHoursMinutes(stats.allMs)
		})
	);
</script>

<div class="grid grid-cols-3 gap-gutter">
	<KpiCard
		label={m.insights_kpi_total_time()}
		value={totalLabel}
		caption={periodPhrase}
		valueTone="primary"
		valueTestId="project-kpi-total"
	/>
	<KpiCard label={m.insights_kpi_daily_average()} value={avgLabel} />
	<KpiCard
		label={m.project_kpi_share()}
		value={`${stats.sharePercent}%`}
		caption={shareOf}
		valueTestId="project-kpi-share"
	/>
</div>
