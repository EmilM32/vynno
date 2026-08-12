<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import { prefsStore } from '$lib/stores/prefs.svelte';
	import { sessionStore } from '$lib/stores/session.svelte';
	import { periodStats } from '$lib/time/aggregates';
	import type { PeriodKind } from '$lib/time/duration';
	import ActivityBars from './ActivityBars.svelte';
	import BreakdownTable from './BreakdownTable.svelte';
	import KpiCards from './KpiCards.svelte';
	import PeriodToggle from './PeriodToggle.svelte';
	import ProjectDonut from './ProjectDonut.svelte';

	let period = $state<PeriodKind>('week');

	const stats = $derived(
		periodStats(
			sessionStore.sessions,
			sessionStore.projects,
			period,
			new Date(sessionStore.nowMs),
			prefsStore.dailyTargetMs
		)
	);
</script>

<div class="mx-auto flex w-full max-w-container-max flex-col gap-6">
	<div
		class="flex flex-col justify-between gap-4 border-b border-outline-variant pb-4 sm:flex-row sm:items-end"
	>
		<div>
			<h1 class="text-headline-lg text-on-surface">{m.insights_title()}</h1>
			<p class="mt-1 text-body-sm text-on-surface-variant">
				{m.insights_subtitle()}
			</p>
		</div>
		<PeriodToggle bind:value={period} />
	</div>

	<KpiCards {stats} />

	<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
		<ProjectDonut items={stats.byProject} totalMs={stats.totalMs} />
		<ActivityBars items={stats.byActivity} />
	</div>

	<BreakdownTable rows={stats.breakdown} />
</div>
