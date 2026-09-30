<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import { m } from '$lib/paraglide/messages.js';
	import type { UntrackedGap } from '$lib/time/aggregates';
	import { formatCompact, formatTimeRange } from '$lib/time/duration';

	/** A long stretch with nothing logged between two rows, with a shortcut to log it. */
	let {
		gap,
		timeZone,
		onfill
	}: {
		gap: UntrackedGap;
		timeZone?: string;
		onfill: () => void;
	} = $props();

	const range = $derived(formatTimeRange(gap.startedAt, gap.endedAt, timeZone));
</script>

<div
	class="flex items-center gap-3 py-1 font-mono text-code-label text-on-surface-variant"
	data-testid="log-gap"
>
	<div class="flex-1 border-t border-dotted border-outline-variant" aria-hidden="true"></div>
	<span>{m.logs_gap_untracked({ duration: formatCompact(gap.ms), range })}</span>
	<Button variant="inline" size="xs" aria-label={m.logs_gap_fill_aria({ range })} onclick={onfill}>
		{m.logs_add_entry()}
	</Button>
	<div class="flex-1 border-t border-dotted border-outline-variant" aria-hidden="true"></div>
</div>
