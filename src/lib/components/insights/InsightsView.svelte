<script lang="ts">
	import PageHeader from '$lib/components/shell/PageHeader.svelte';
	import { m } from '$lib/paraglide/messages.js';
	import { usePrefs } from '$lib/stores/prefs.svelte';
	import { useSession } from '$lib/stores/session.svelte';
	import { periodStats } from '$lib/time/aggregates';
	import type { PeriodKind } from '$lib/time/duration';
	import ActivityBars from './ActivityBars.svelte';
	import BreakdownTable from './BreakdownTable.svelte';
	import KpiCards from './KpiCards.svelte';
	import PeriodToggle from './PeriodToggle.svelte';
	import ProjectDonut from './ProjectDonut.svelte';

	const prefsStore = usePrefs();
	const sessionStore = useSession();

	let period = $state<PeriodKind>('week');

	const stats = $derived(
		periodStats(
			sessionStore.sessions,
			sessionStore.projects,
			period,
			new Date(sessionStore.nowMs),
			prefsStore.dailyTargetMs,
			sessionStore.timeZone
		)
	);
</script>

<div class="flex w-full flex-col gap-6" data-testid="page-view">
	<PageHeader title={m.insights_title()} description={m.insights_subtitle()}>
		{#snippet actions()}
			<PeriodToggle bind:value={period} />
		{/snippet}
	</PageHeader>

	<KpiCards {stats} />

	<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
		<ProjectDonut items={stats.byProject} totalMs={stats.totalMs} />
		<ActivityBars items={stats.byActivity} />
	</div>

	<BreakdownTable rows={stats.breakdown} />
</div>
