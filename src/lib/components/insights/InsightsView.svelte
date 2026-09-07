<script lang="ts">
	import PageHeader from '$lib/components/shell/PageHeader.svelte';
	import { m } from '$lib/paraglide/messages.js';
	import { useSession } from '$lib/stores/session.svelte';
	import { periodStats } from '$lib/time/aggregates';
	import { insightRangeForGrain, type InsightRange } from '$lib/time/duration';
	import ActivityBars from './ActivityBars.svelte';
	import BreakdownTable from './BreakdownTable.svelte';
	import InsightRangeControl from './InsightRangeControl.svelte';
	import ProjectDonut from './ProjectDonut.svelte';

	const sessionStore = useSession();

	const initialNow = new Date(sessionStore.nowMs || Date.now());
	let range = $state.raw<InsightRange>(
		insightRangeForGrain('week', initialNow, initialNow, sessionStore.timeZone)
	);

	const now = $derived(new Date(sessionStore.nowMs || Date.now()));

	const stats = $derived(
		periodStats(
			sessionStore.sessions,
			sessionStore.projects,
			sessionStore.activityTypes,
			range,
			now
		)
	);

	$effect(() => {
		void sessionStore.ensureThrough(range.start.getTime());
	});
</script>

<div class="flex w-full flex-col gap-6" data-testid="page-view">
	<PageHeader title={m.insights_title()} description={m.insights_subtitle()}>
		{#snippet actions()}
			<InsightRangeControl bind:range {now} timeZone={sessionStore.timeZone} />
		{/snippet}
	</PageHeader>

	{#if sessionStore.loadingMore}
		<p class="text-body-sm text-on-surface-variant">{m.insights_loading_earlier()}</p>
	{/if}

	<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
		<ProjectDonut items={stats.byProject} totalMs={stats.totalMs} />
		<ActivityBars items={stats.byActivity} />
	</div>

	<BreakdownTable rows={stats.breakdown} />
</div>
