<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import { sessionStore } from '$lib/stores/session.svelte';
	import { formatHoursDecimal } from '$lib/time/duration';

	const days = $derived(sessionStore.weekDayTotals);
	const maxMs = $derived(Math.max(1, ...days.map((d) => d.ms)));
	const scaleHours = $derived(Math.ceil(maxMs / 3_600_000) || 8);
	const todayKey = $derived(days.find((d) => d.isToday)?.key ?? '');
</script>

<section
	class="flex h-[300px] flex-col rounded-lg border border-outline-variant bg-surface-container p-4"
	aria-label={m.dashboard_weekly_overview_aria()}
>
	<div class="mb-6 flex items-center justify-between">
		<span class="text-headline-md">{m.dashboard_weekly_overview()}</span>
		<div class="flex items-center gap-2">
			<span class="h-2 w-2 rounded-sm bg-primary" aria-hidden="true"></span>
			<span class="text-body-sm text-on-surface-variant">{m.dashboard_hours()}</span>
		</div>
	</div>

	<div class="relative flex flex-1 items-end gap-2 border-b border-outline-variant px-2 pb-2">
		<div
			class="absolute top-0 bottom-2 left-0 -ml-1 flex flex-col justify-between font-mono text-[10px] text-on-surface-variant"
			aria-hidden="true"
		>
			<span>{scaleHours}h</span>
			<span>{Math.round(scaleHours / 2)}h</span>
			<span>0h</span>
		</div>

		{#each days as day (day.key)}
			{const heightPct = $derived(day.ms > 0 ? Math.max(8, day.ratio * 100) : 5)}
			{const future = $derived(
				!day.isToday && day.ms === 0 && todayKey !== '' && day.key > todayKey
			)}
			<div class="group ml-0 flex flex-1 flex-col items-center gap-2 first:ml-4">
				<div
					class="relative flex w-full items-end justify-center rounded-t-sm transition-colors
						{day.ms > 0
						? day.isToday
							? 'bar-today-glow border-t border-primary-container bg-primary/80 hover:bg-primary'
							: 'bg-primary/20 hover:bg-primary/40'
						: 'border border-dashed border-outline-variant bg-surface-container'}"
					style:height="{heightPct}%"
					role="img"
					aria-label="{day.label}: {formatHoursDecimal(day.ms)}"
				>
					{#if day.ms > 0}
						<div
							class="absolute -top-8 z-10 rounded border border-outline-variant bg-surface-container-high px-2 py-1 font-mono text-code-label whitespace-nowrap text-on-surface opacity-0 shadow-lg transition-opacity group-hover:opacity-100"
						>
							{formatHoursDecimal(day.ms)}{day.isToday ? m.dashboard_today_paren() : ''}
						</div>
					{/if}
				</div>
				<span
					class="font-mono text-code-label text-[10px] {day.isToday
						? 'font-bold text-primary'
						: future
							? 'text-on-surface-variant/50'
							: 'text-on-surface-variant'}"
				>
					{day.label}
				</span>
			</div>
		{/each}
	</div>
</section>
