<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import Dialog from '$lib/components/ui/Dialog.svelte';
	import { m } from '$lib/paraglide/messages.js';
	import { useSession } from '$lib/stores/session.svelte';
	import {
		calendarDaysInclusive,
		formatLogDateRangeLabel,
		type LogDateRange
	} from '$lib/time/duration';
	import type { TimeSession } from '$lib/types/domain';
	import {
		entriesCsv,
		entriesJson,
		exportEntries,
		exportFileName,
		TIMESHEET_MAX_DAYS,
		timesheetCsv,
		type ExportContext
	} from './export';

	/**
	 * Downloads exactly what the list shows. The opener loads the rest of the range
	 * first (`loaded`), so an export is not cut off at the page the list reached.
	 */
	let {
		open,
		loaded,
		onclose,
		sessions,
		range,
		now
	}: {
		open: boolean;
		loaded: boolean;
		onclose: () => void;
		/** The list's rows: stopped sessions after search, date, project and activity filters. */
		sessions: TimeSession[];
		range: LogDateRange | null;
		now: Date;
	} = $props();

	const sessionStore = useSession();

	const ctx = $derived<ExportContext>({
		project: sessionStore.getProject,
		activity: sessionStore.getActivityType,
		now,
		timeZone: sessionStore.timeZone
	});
	const timesheetFits = $derived(
		range != null &&
			calendarDaysInclusive(range.start, range.end, sessionStore.timeZone) <= TIMESHEET_MAX_DAYS
	);
	const scope = $derived(
		range ? formatLogDateRangeLabel(range, undefined, sessionStore.timeZone) : m.logs_export_all()
	);
	const ready = $derived(loaded && sessions.length > 0);

	function download(text: string, type: string, name: string) {
		const url = URL.createObjectURL(new Blob([text], { type }));
		const link = document.createElement('a');
		link.href = url;
		link.download = name;
		document.body.append(link);
		link.click();
		link.remove();
		setTimeout(() => URL.revokeObjectURL(url), 0);
	}

	function fileName(kind: 'entries' | 'timesheet', extension: 'csv' | 'json') {
		return exportFileName(kind, extension, range, now, sessionStore.timeZone);
	}

	function saveEntries(format: 'csv' | 'json') {
		const entries = exportEntries(sessions, ctx);
		if (format === 'csv')
			download(entriesCsv(entries), 'text/csv;charset=utf-8', fileName('entries', 'csv'));
		else download(entriesJson(entries), 'application/json', fileName('entries', 'json'));
	}

	function saveTimesheet() {
		if (!range) return;
		const text = timesheetCsv(sessions, range, ctx);
		if (text) download(text, 'text/csv;charset=utf-8', fileName('timesheet', 'csv'));
	}
</script>

<Dialog {open} title={m.logs_export_title()} {onclose}>
	{#snippet children({ close })}
		<div class="flex flex-col gap-4" data-testid="logs-export">
			<p class="text-body-sm text-on-surface-variant">{m.logs_export_scope()}</p>
			<dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 font-mono text-code-label">
				<dt class="text-on-surface-variant">{m.logs_export_range()}</dt>
				<dd class="text-on-surface">{scope}</dd>
				<dt class="text-on-surface-variant">{m.logs_export_count_label()}</dt>
				<dd class="text-on-surface" data-testid="logs-export-count">
					{loaded ? sessions.length : m.logs_export_loading()}
				</dd>
			</dl>
			{#if sessionStore.error}
				<p class="text-body-sm text-error" role="alert">{sessionStore.error}</p>
			{/if}
			<div class="flex flex-wrap gap-2">
				<Button variant="secondary" size="sm" disabled={!ready} onclick={() => saveEntries('csv')}>
					{m.logs_export_entries_csv()}
				</Button>
				<Button variant="secondary" size="sm" disabled={!ready} onclick={() => saveEntries('json')}>
					{m.logs_export_entries_json()}
				</Button>
				<Button
					variant="secondary"
					size="sm"
					disabled={!ready || !timesheetFits}
					onclick={saveTimesheet}
				>
					{m.logs_export_timesheet_csv()}
				</Button>
			</div>
			{#if !timesheetFits}
				<p class="text-body-sm text-on-surface-variant">
					{m.logs_export_timesheet_hint({ max: TIMESHEET_MAX_DAYS })}
				</p>
			{/if}
			<div class="flex justify-end">
				<Button variant="secondary" onclick={() => close()}>{m.common_cancel()}</Button>
			</div>
		</div>
	{/snippet}
</Dialog>
