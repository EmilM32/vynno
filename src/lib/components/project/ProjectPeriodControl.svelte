<script lang="ts">
	import InsightRangeDialog from '$lib/components/insights/InsightRangeDialog.svelte';
	import PeriodToggle from '$lib/components/insights/PeriodToggle.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import IconButton from '$lib/components/ui/IconButton.svelte';
	import { m } from '$lib/paraglide/messages.js';
	import { getLocale } from '$lib/paraglide/runtime.js';
	import {
		MAX_INSIGHT_CUSTOM_DAYS,
		addLocalDays,
		canShiftInsightRange,
		formatInsightRangeLabel,
		localDateKeyFromDate,
		periodBounds,
		shiftInsightRange,
		startOfLocalDay,
		type ProjectPeriodKind,
		type ProjectPeriodSpec
	} from '$lib/time/duration';

	let {
		period = $bindable(),
		now,
		timeZone
	}: {
		period: ProjectPeriodSpec;
		now: Date;
		timeZone?: string;
	} = $props();

	const preset = $derived(period.kind === 'custom' ? null : period.kind);
	const isCustom = $derived(period.kind === 'custom');
	const rangeLabel = $derived(
		period.kind === 'custom' ? formatInsightRangeLabel(period.range, getLocale(), timeZone) : ''
	);
	const customLabel = $derived(isCustom ? rangeLabel : m.insights_range_custom());
	const canNext = $derived(
		period.kind === 'custom' && canShiftInsightRange(period.range, 1, now, timeZone)
	);
	const presetOptions = $derived([
		{ id: 'week' as const, label: m.insights_period_week() },
		{ id: 'month' as const, label: m.insights_period_month() },
		{ id: 'all' as const, label: m.insights_period_all() }
	]);

	let customOpen = $state(false);
	let draftFrom = $state('');
	let draftTo = $state('');

	function setPreset(id: ProjectPeriodKind) {
		period = { kind: id };
	}

	function shift(direction: -1 | 1) {
		if (period.kind !== 'custom') return;
		period = { kind: 'custom', range: shiftInsightRange(period.range, direction, now, timeZone) };
	}

	function openCustom() {
		if (period.kind === 'custom') {
			draftFrom = localDateKeyFromDate(period.range.start, timeZone);
			draftTo = localDateKeyFromDate(period.range.end, timeZone);
		} else if (period.kind === 'all') {
			const todayStart = new Date(startOfLocalDay(now, timeZone));
			draftFrom = localDateKeyFromDate(
				addLocalDays(todayStart, 1 - MAX_INSIGHT_CUSTOM_DAYS, timeZone),
				timeZone
			);
			draftTo = localDateKeyFromDate(now, timeZone);
		} else {
			const { start, end } = periodBounds(period.kind, now, timeZone);
			draftFrom = localDateKeyFromDate(start, timeZone);
			draftTo = localDateKeyFromDate(end, timeZone);
		}
		customOpen = true;
	}
</script>

<div class="flex flex-wrap items-center gap-2" data-testid="project-period-control">
	<PeriodToggle value={preset} options={presetOptions} onchange={setPreset} />
	<Button
		variant={isCustom ? 'tonal' : 'secondary'}
		size="sm"
		aria-pressed={isCustom}
		aria-live="polite"
		data-testid="project-range-label"
		onclick={openCustom}
	>
		{customLabel}
	</Button>
	{#if isCustom}
		<IconButton
			icon="arrow_back"
			label={m.insights_range_prev()}
			variant="ghost"
			size="sm"
			onclick={() => shift(-1)}
		/>
		<IconButton
			icon="arrow_forward"
			label={m.insights_range_next()}
			variant="ghost"
			size="sm"
			disabled={!canNext}
			onclick={() => shift(1)}
		/>
	{/if}
</div>

<InsightRangeDialog
	open={customOpen}
	bind:fromDay={draftFrom}
	bind:toDay={draftTo}
	{now}
	{timeZone}
	onclose={() => (customOpen = false)}
	onapply={(next) => {
		period = { kind: 'custom', range: next };
		customOpen = false;
	}}
/>
