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

<div class="grid grid-cols-1 gap-gutter sm:grid-cols-3">
	<div
		class="flex flex-col justify-between rounded-lg border border-outline-variant bg-surface-container p-4"
	>
		<span class="font-mono text-code-label tracking-wider text-on-surface-variant uppercase"
			>{m.insights_kpi_total_time()}</span
		>
		<div class="mt-4 flex items-baseline gap-2">
			<span
				class="font-mono text-code-display text-primary tabular-nums"
				data-testid="project-kpi-total">{totalLabel}</span
			>
			<span class="font-mono text-code-label text-on-surface-variant">{periodPhrase}</span>
		</div>
	</div>

	<div
		class="flex flex-col justify-between rounded-lg border border-outline-variant bg-surface-container p-4"
	>
		<span class="font-mono text-code-label tracking-wider text-on-surface-variant uppercase"
			>{m.insights_kpi_daily_average()}</span
		>
		<div class="mt-4 flex items-baseline gap-2">
			<span class="font-mono text-code-display text-on-surface tabular-nums">{avgLabel}</span>
		</div>
	</div>

	<div
		class="flex flex-col justify-between rounded-lg border border-outline-variant bg-surface-container p-4"
	>
		<span class="font-mono text-code-label tracking-wider text-on-surface-variant uppercase"
			>{m.project_kpi_share()}</span
		>
		<div class="mt-4 flex items-baseline gap-2">
			<span
				class="font-mono text-code-display text-on-surface tabular-nums"
				data-testid="project-kpi-share">{stats.sharePercent}%</span
			>
			<span class="font-mono text-code-label text-on-surface-variant">{shareOf}</span>
		</div>
	</div>
</div>
