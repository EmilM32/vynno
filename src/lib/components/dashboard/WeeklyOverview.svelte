<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import { useSession } from '$lib/stores/session.svelte';
	import type { WeekDayTotal } from '$lib/time/aggregates';
	import { formatHoursDecimal } from '$lib/time/duration';

	let {
		days: daysProp,
		barColor,
		heading,
		ariaLabel,
		class: className
	}: {
		days?: WeekDayTotal[];
		/** Hex fill for bars (project view). Dashboard keeps the primary track. */
		barColor?: string;
		heading?: string;
		ariaLabel?: string;
		class?: string;
	} = $props();

	const sessionStore = useSession();

	const days = $derived(daysProp ?? sessionStore.weekDayTotals);
	const title = $derived(heading ?? m.dashboard_weekly_overview());
	const regionLabel = $derived(ariaLabel ?? m.dashboard_weekly_overview_aria());
	const maxMs = $derived(Math.max(1, ...days.map((d) => d.ms)));
	const scaleHours = $derived(Math.ceil(maxMs / 3_600_000) || 8);
	const todayKey = $derived(days.find((d) => d.isToday)?.key ?? '');

	let tipDay = $state<string | null>(null);
	let hoverDay = $state<string | null>(null);

	function showTip(key: string): boolean {
		return tipDay === key || hoverDay === key;
	}

	function onWindowKey(e: KeyboardEvent) {
		if (e.key !== 'Escape') return;
		if (!tipDay && !hoverDay) return;
		tipDay = null;
		hoverDay = null;
		e.preventDefault();
	}
</script>

<svelte:window onkeydown={onWindowKey} />

<section
	class={[
		'flex flex-col rounded-lg border border-outline-variant bg-surface-container p-4',
		className ?? 'h-[300px]'
	]}
	aria-label={regionLabel}
>
	<div class="mb-6 flex items-center justify-between">
		<h2 class="text-headline-md">{title}</h2>
		<div class="flex items-center gap-2">
			<span
				class="h-2 w-2 rounded-sm {barColor ? '' : 'bg-primary'}"
				style:background-color={barColor}
				aria-hidden="true"
			></span>
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
				<button
					type="button"
					class="focus-ring relative flex min-h-6 w-full items-end justify-center rounded-t-sm transition-colors
						{day.ms > 0
						? barColor
							? day.isToday
								? 'bar-today-glow'
								: ''
							: day.isToday
								? 'bar-today-glow border-t border-primary-container bg-primary/80 hover:bg-primary'
								: 'bg-primary/20 hover:bg-primary/40'
						: 'border border-dashed border-outline-variant bg-surface-container'}"
					style:height="{heightPct}%"
					style:background-color={day.ms > 0 && barColor
						? day.isToday
							? barColor
							: `${barColor}33`
						: undefined}
					aria-label="{day.label}: {formatHoursDecimal(day.ms)}"
					onfocus={() => (tipDay = day.key)}
					onblur={() => {
						if (tipDay === day.key) tipDay = null;
					}}
					onmouseenter={() => (hoverDay = day.key)}
					onmouseleave={() => {
						if (hoverDay === day.key) hoverDay = null;
					}}
				>
					{#if day.ms > 0 && showTip(day.key)}
						<div
							class="absolute -top-8 z-10 rounded border border-outline-variant bg-surface-container-high px-2 py-1 font-mono text-code-label whitespace-nowrap text-on-surface shadow-lg"
						>
							{formatHoursDecimal(day.ms)}{day.isToday ? m.dashboard_today_paren() : ''}
						</div>
					{/if}
				</button>
				<span
					class="font-mono text-code-label text-[10px] {day.isToday
						? 'font-bold text-primary'
						: future
							? 'text-on-surface-variant'
							: 'text-on-surface-variant'}"
				>
					{day.label}
				</span>
			</div>
		{/each}
	</div>
</section>
