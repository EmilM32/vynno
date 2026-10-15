<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
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

<!--
	Phones: two rows, nothing scrolls sideways. Grains span the width like an iOS segmented
	control; below them a stepper (‹ range ›) in one frame, then Custom. The label wraps rather
	than clips (long custom ranges, Polish months). Desktop keeps the single row.
-->
<div
	class="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end"
	data-testid="insight-range-control"
>
	<PeriodToggle value={grain} options={grainOptions} fill onchange={setGrain} />
	<div class="flex min-w-0 items-stretch gap-2">
		<div
			class="flex min-w-0 flex-1 items-center gap-1 max-sm:rounded-DEFAULT max-sm:border max-sm:border-outline-variant max-sm:bg-surface-container-low max-sm:px-1 sm:flex-none"
		>
			<IconButton
				icon="chevron_left"
				label={m.insights_range_prev()}
				variant="ghost"
				size="sm"
				onclick={() => shift(-1)}
			/>
			<span
				class="min-w-0 flex-1 py-1.5 text-center font-mono text-code-label text-balance text-on-surface tabular-nums sm:flex-none sm:whitespace-nowrap"
				data-testid="insight-range-label"
				aria-live="polite"
			>
				{label}
			</span>
			<IconButton
				icon="chevron_right"
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
			class="shrink-0"
			aria-pressed={range.grain === 'custom'}
			onclick={openCustom}
		>
			<Icon name="calendar_month" size="sm" />
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
