<script lang="ts">
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
				data-testid="project-kpi-total">{totalLabel}</span
			>
			<span class="font-mono text-[10px] text-on-surface-variant sm:text-code-label"
				>{periodPhrase}</span
			>
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
		</div>
	</div>

	<div
		class="flex flex-col justify-between rounded-lg border border-outline-variant bg-surface-container p-2 sm:p-4"
	>
		<span
			class="font-mono text-[10px] tracking-wider text-on-surface-variant uppercase sm:text-code-label"
			>{m.project_kpi_share()}</span
		>
		<div class="mt-2 flex flex-col gap-0.5 sm:mt-4 sm:flex-row sm:items-baseline sm:gap-2">
			<span
				class="font-mono text-code-data text-on-surface tabular-nums sm:text-code-display"
				data-testid="project-kpi-share">{stats.sharePercent}%</span
			>
			<span class="font-mono text-[10px] text-on-surface-variant sm:text-code-label">{shareOf}</span
			>
		</div>
	</div>
</div>
