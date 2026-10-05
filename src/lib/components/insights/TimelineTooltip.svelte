<script lang="ts">
	import type { ComponentProps } from 'svelte';
	import { m } from '$lib/paraglide/messages.js';
	import { formatCompact, formatTimeRange } from '$lib/time/duration';
	import type { TimelineSegment } from '$lib/time/timeline';

	type Lc = typeof import('$lib/components/charts/lazy-timeline');

	/** Per-session tooltip for the Days and Projects timeline views. */
	let {
		Tooltip,
		context,
		timeZone,
		dayLabel
	}: {
		Tooltip: Lc['Tooltip'];
		context: ComponentProps<Lc['Tooltip']['Root']>['context'];
		timeZone: string;
		dayLabel: (key: string) => string;
	} = $props();

	const iso = (ms: number) => new Date(ms).toISOString();
</script>

<Tooltip.Root {context}>
	{#snippet children({ data: row }: { data: unknown })}
		<!-- LayerChart types the context per chart; both views feed it segments. -->
		{const data = $derived(row as TimelineSegment)}
		{const split = $derived(
			data.startMs !== data.sessionStartMs || data.endMs !== data.sessionEndMs
		)}
		<Tooltip.Header value={data.projectName} color={data.color} />
		<Tooltip.List>
			<Tooltip.Item
				label={dayLabel(data.dateKey)}
				value={formatTimeRange(
					iso(data.startMs),
					data.active ? undefined : iso(data.endMs),
					timeZone
				)}
			/>
			<Tooltip.Item
				label={m.insights_col_duration()}
				value={formatCompact(data.endMs - data.startMs)}
			/>
			{#if split}
				<Tooltip.Item
					label={m.insights_timeline_whole_session()}
					value={formatCompact(data.sessionEndMs - data.sessionStartMs)}
				/>
			{/if}
			{#if data.note || data.ticketId}
				<Tooltip.Separator />
				<Tooltip.Item
					label={data.ticketId ?? m.logs_field_note()}
					value={data.note || '—'}
					valueAlign="right"
				/>
			{/if}
		</Tooltip.List>
	{/snippet}
</Tooltip.Root>
