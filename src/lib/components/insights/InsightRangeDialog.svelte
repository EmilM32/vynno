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
		type InsightRange
	} from '$lib/time/duration';

	let {
		open,
		fromDay = $bindable(),
		toDay = $bindable(),
		now,
		timeZone,
		onclose,
		onapply
	}: {
		open: boolean;
		fromDay: string;
		toDay: string;
		now: Date;
		timeZone?: string;
		onclose: () => void;
		onapply: (range: InsightRange) => void;
	} = $props();

	const todayKey = $derived(localDateKeyFromDate(now, timeZone));
	const parsed = $derived(customInsightRange(fromDay, toDay, now, timeZone));
	const errorKey = $derived(parsed.ok ? null : parsed.error);
	const errorText = $derived(errorKey ? messageFor(errorKey) : '');

	function messageFor(error: CustomRangeError): string {
		if (error === 'order') return m.insights_range_error_order();
		if (error === 'future') return m.insights_range_error_future();
		if (error === 'span') return m.insights_range_error_span();
		return m.insights_range_error_invalid();
	}

	function apply(close: (then?: () => void) => void) {
		if (!parsed.ok) return;
		const next = parsed.range;
		close(() => onapply(next));
	}
</script>

<Dialog {open} title={m.insights_range_dialog_title()} {onclose}>
	{#snippet children({ close })}
		<form
			class="flex flex-col gap-4"
			onsubmit={(e) => {
				e.preventDefault();
				apply(close);
			}}
		>
			<div class="grid gap-4 sm:grid-cols-2">
				<Field id="insight-range-from" label={m.insights_range_from()}>
					<Input tone="data" type="date" bind:value={fromDay} max={todayKey} class="w-full" />
				</Field>
				<Field id="insight-range-to" label={m.insights_range_to()} error={errorText}>
					<Input tone="data" type="date" bind:value={toDay} max={todayKey} class="w-full" />
				</Field>
			</div>
			<div class="flex flex-wrap justify-end gap-2">
				<Button variant="secondary" onclick={() => close()}>
					{m.common_cancel()}
				</Button>
				<Button variant="primary" type="submit" disabled={!parsed.ok}>
					{m.insights_range_apply()}
				</Button>
			</div>
		</form>
	{/snippet}
</Dialog>
