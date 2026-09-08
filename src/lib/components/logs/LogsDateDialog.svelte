<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import Dialog from '$lib/components/ui/Dialog.svelte';
	import Field from '$lib/components/ui/Field.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import { m } from '$lib/paraglide/messages.js';
	import {
		customInsightRange,
		localDateKeyFromDate,
		type CustomRangeError,
		type LogDatePreset,
		type LogDateRange
	} from '$lib/time/duration';

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

	const todayKey = $derived(localDateKeyFromDate(now, timeZone));
	const parsed = $derived(customInsightRange(fromDay, toDay, now, timeZone));
	const errorKey = $derived(preset === 'custom' && !parsed.ok ? parsed.error : null);
	const errorText = $derived(errorKey ? messageFor(errorKey) : '');
	const customReady = $derived(preset !== 'custom' || parsed.ok);

	const presets: { id: Exclude<LogDatePreset, 'custom'>; label: string }[] = [
		{ id: 'all', label: m.logs_filter_dates_all() },
		{ id: 'today', label: m.logs_filter_today() },
		{ id: 'yesterday', label: m.logs_filter_yesterday() },
		{ id: 'last7', label: m.logs_filter_last_7() },
		{ id: 'week', label: m.logs_filter_this_week() },
		{ id: 'month', label: m.logs_filter_this_month() }
	];

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
		<div class="flex flex-col gap-4">
			<div
				class="flex flex-wrap gap-1"
				role="group"
				aria-label={m.logs_filter_dates()}
				data-testid="logs-date-presets"
			>
				{#each presets as opt (opt.id)}
					<Button
						variant="tab"
						size="sm"
						selected={preset === opt.id}
						aria-pressed={preset === opt.id}
						onclick={() => chooseNamed(opt.id, close)}
					>
						{opt.label}
					</Button>
				{/each}
				<Button
					variant="tab"
					size="sm"
					selected={preset === 'custom'}
					aria-pressed={preset === 'custom'}
					onclick={() => (preset = 'custom')}
				>
					{m.logs_filter_custom()}
				</Button>
			</div>

			{#if preset === 'custom'}
				<form
					class="flex flex-col gap-4"
					onsubmit={(e) => {
						e.preventDefault();
						applyCustom(close);
					}}
				>
					<div class="grid gap-4 sm:grid-cols-2">
						<Field id="logs-range-from" label={m.insights_range_from()}>
							<Input tone="data" type="date" bind:value={fromDay} max={todayKey} class="w-full" />
						</Field>
						<Field id="logs-range-to" label={m.insights_range_to()} error={errorText}>
							<Input tone="data" type="date" bind:value={toDay} max={todayKey} class="w-full" />
						</Field>
					</div>
					<div class="flex flex-wrap justify-end gap-2">
						<Button variant="secondary" onclick={() => close()}>
							{m.common_cancel()}
						</Button>
						<Button variant="primary" type="submit" disabled={!customReady}>
							{m.logs_filter_apply()}
						</Button>
					</div>
				</form>
			{/if}
		</div>
	{/snippet}
</Dialog>
