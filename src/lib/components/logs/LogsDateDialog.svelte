<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import Dialog from '$lib/components/ui/Dialog.svelte';
	import { m } from '$lib/paraglide/messages.js';
	import {
		customInsightRange,
		type CustomRangeError,
		type LogDatePreset,
		type LogDateRange
	} from '$lib/time/duration';
	import LogsDateFields from './LogsDateFields.svelte';

	let {
		open,
		preset = $bindable(),
		fromDay = $bindable(),
		toDay = $bindable(),
		now,
		timeZone,
		onclose,
		onapply
	}: {
		open: boolean;
		preset: LogDatePreset;
		fromDay: string;
		toDay: string;
		now: Date;
		timeZone?: string;
		onclose: () => void;
		onapply: (next: { preset: LogDatePreset; customRange: LogDateRange | null }) => void;
	} = $props();

	const parsed = $derived(customInsightRange(fromDay, toDay, now, timeZone));
	const errorKey = $derived(preset === 'custom' && !parsed.ok ? parsed.error : null);
	const errorText = $derived(errorKey ? messageFor(errorKey) : '');
	const customReady = $derived(preset !== 'custom' || parsed.ok);

	function messageFor(error: CustomRangeError): string {
		if (error === 'order') return m.insights_range_error_order();
		if (error === 'future') return m.insights_range_error_future();
		if (error === 'span') return m.insights_range_error_span();
		return m.insights_range_error_invalid();
	}

	function chooseNamed(id: Exclude<LogDatePreset, 'custom'>, close: (then?: () => void) => void) {
		close(() => onapply({ preset: id, customRange: null }));
	}

	function applyCustom(close: (then?: () => void) => void) {
		if (!parsed.ok) return;
		const range = parsed.range;
		close(() => onapply({ preset: 'custom', customRange: { start: range.start, end: range.end } }));
	}
</script>

<Dialog {open} title={m.logs_filter_dates_dialog()} {onclose}>
	{#snippet children({ close })}
		<form
			class="flex flex-col gap-4"
			onsubmit={(e) => {
				e.preventDefault();
				if (preset === 'custom') applyCustom(close);
			}}
		>
			<LogsDateFields
				bind:preset
				bind:fromDay
				bind:toDay
				{now}
				{timeZone}
				{errorText}
				onnamed={(id) => chooseNamed(id, close)}
			/>

			{#if preset === 'custom'}
				<div class="flex flex-wrap justify-end gap-2">
					<Button variant="secondary" onclick={() => close()}>
						{m.common_cancel()}
					</Button>
					<Button variant="primary" type="submit" disabled={!customReady}>
						{m.logs_filter_apply()}
					</Button>
				</div>
			{/if}
		</form>
	{/snippet}
</Dialog>
