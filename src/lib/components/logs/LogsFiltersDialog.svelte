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
	import LogsPickList, { type LogsPickItem } from './LogsPickList.svelte';

	let {
		open,
		preset = $bindable(),
		fromDay = $bindable(),
		toDay = $bindable(),
		projectIds = $bindable(),
		activityTypeIds = $bindable(),
		projectItems,
		activityItems,
		now,
		timeZone,
		showProjects = true,
		showDates = true,
		onclose,
		onapply
	}: {
		open: boolean;
		preset: LogDatePreset;
		fromDay: string;
		toDay: string;
		projectIds: string[];
		activityTypeIds: string[];
		projectItems: LogsPickItem[];
		activityItems: LogsPickItem[];
		now: Date;
		timeZone?: string;
		showProjects?: boolean;
		showDates?: boolean;
		onclose: () => void;
		onapply: (next: {
			preset: LogDatePreset;
			customRange: LogDateRange | null;
			projectIds: string[];
			activityTypeIds: string[];
		}) => void;
	} = $props();

	const parsed = $derived(customInsightRange(fromDay, toDay, now, timeZone));
	const errorKey = $derived(showDates && preset === 'custom' && !parsed.ok ? parsed.error : null);
	const errorText = $derived(errorKey ? messageFor(errorKey) : '');
	const ready = $derived(!showDates || preset !== 'custom' || parsed.ok);

	function messageFor(error: CustomRangeError): string {
		if (error === 'order') return m.insights_range_error_order();
		if (error === 'future') return m.insights_range_error_future();
		if (error === 'span') return m.insights_range_error_span();
		return m.insights_range_error_invalid();
	}

	function customRange(): LogDateRange | null {
		if (!showDates || preset !== 'custom' || !parsed.ok) return null;
		return { start: parsed.range.start, end: parsed.range.end };
	}

	function apply(close: (then?: () => void) => void) {
		if (!ready) return;
		close(() =>
			onapply({
				preset: showDates ? preset : 'all',
				customRange: customRange(),
				projectIds: showProjects ? projectIds : [],
				activityTypeIds
			})
		);
	}

	function clear(close: (then?: () => void) => void) {
		close(() =>
			onapply({
				preset: 'all',
				customRange: null,
				projectIds: [],
				activityTypeIds: []
			})
		);
	}
</script>

<Dialog {open} title={m.logs_filter_dialog()} {onclose} size="lg">
	{#snippet children({ close })}
		<div class="flex flex-col gap-5">
			{#if showDates}
				<section class="flex flex-col gap-2">
					<h3 class="text-body-sm text-on-surface-variant">{m.logs_filter_dates()}</h3>
					<LogsDateFields bind:preset bind:fromDay bind:toDay {now} {timeZone} {errorText} />
				</section>
			{/if}
			{#if showProjects}
				<section class="flex flex-col gap-2">
					<h3 class="text-body-sm text-on-surface-variant">{m.logs_filter_projects()}</h3>
					<LogsPickList
						items={projectItems}
						bind:selected={projectIds}
						ariaLabel={m.logs_filter_projects_dialog()}
					/>
				</section>
			{/if}
			<section class="flex flex-col gap-2">
				<h3 class="text-body-sm text-on-surface-variant">{m.logs_filter_activities()}</h3>
				<LogsPickList
					items={activityItems}
					bind:selected={activityTypeIds}
					ariaLabel={m.logs_filter_activities_dialog()}
				/>
			</section>
			<div class="flex flex-wrap items-center justify-end gap-2">
				<Button variant="quiet" class="mr-auto" onclick={() => clear(close)}>
					{m.logs_filter_clear()}
				</Button>
				<Button variant="secondary" onclick={() => close()}>
					{m.common_cancel()}
				</Button>
				<Button variant="primary" disabled={!ready} onclick={() => apply(close)}>
					{m.logs_filter_apply()}
				</Button>
			</div>
		</div>
	{/snippet}
</Dialog>
