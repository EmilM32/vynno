<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import IconButton from '$lib/components/ui/IconButton.svelte';
	import { m } from '$lib/paraglide/messages.js';
	import { getLocale } from '$lib/paraglide/runtime.js';
	import {
		canShiftInsightRange,
		formatInsightRangeLabel,
		insightRangeForGrain,
		localDateKeyFromDate,
		shiftInsightRange,
		type InsightGrain,
		type InsightRange
	} from '$lib/time/duration';
	import InsightRangeDialog from './InsightRangeDialog.svelte';
	import PeriodToggle from './PeriodToggle.svelte';

	let {
		range = $bindable(),
		now,
		timeZone
	}: {
		range: InsightRange;
		now: Date;
		timeZone?: string;
	} = $props();

	const label = $derived(formatInsightRangeLabel(range, getLocale(), timeZone));
	const grain = $derived(range.grain === 'custom' ? null : range.grain);
	const canNext = $derived(canShiftInsightRange(range, 1, now, timeZone));
	const grainOptions = $derived([
		{ id: 'week' as const, label: m.insights_period_week() },
		{ id: 'twoWeeks' as const, label: m.insights_period_two_weeks() },
		{ id: 'month' as const, label: m.insights_period_month() }
	]);

	let customOpen = $state(false);
	let draftFrom = $state('');
	let draftTo = $state('');

	function setGrain(id: Exclude<InsightGrain, 'custom'>) {
		range = insightRangeForGrain(id, now, now, timeZone);
	}

	function shift(direction: -1 | 1) {
		range = shiftInsightRange(range, direction, now, timeZone);
	}

	function openCustom() {
		draftFrom = localDateKeyFromDate(range.start, timeZone);
		draftTo = localDateKeyFromDate(range.end, timeZone);
		customOpen = true;
	}
</script>

<div class="flex w-full flex-col gap-2 sm:w-auto sm:items-end" data-testid="insight-range-control">
	<PeriodToggle value={grain} options={grainOptions} onchange={setGrain} />
	<div class="flex flex-wrap items-center justify-between gap-2 sm:justify-end">
		<div class="flex items-center gap-1">
			<IconButton
				icon="arrow_back"
				label={m.insights_range_prev()}
				variant="ghost"
				size="sm"
				onclick={() => shift(-1)}
			/>
			<span
				class="min-w-0 font-mono text-code-label text-on-surface tabular-nums"
				data-testid="insight-range-label"
				aria-live="polite"
			>
				{label}
			</span>
			<IconButton
				icon="arrow_forward"
				label={m.insights_range_next()}
				variant="ghost"
				size="sm"
				disabled={!canNext}
				onclick={() => shift(1)}
			/>
		</div>
		<Button
			variant={range.grain === 'custom' ? 'tonal' : 'secondary'}
			size="sm"
			aria-pressed={range.grain === 'custom'}
			onclick={openCustom}
		>
			{m.insights_range_custom()}
		</Button>
	</div>
</div>

<InsightRangeDialog
	open={customOpen}
	bind:fromDay={draftFrom}
	bind:toDay={draftTo}
	{now}
	{timeZone}
	onclose={() => (customOpen = false)}
	onapply={(next) => {
		range = next;
		customOpen = false;
	}}
/>
