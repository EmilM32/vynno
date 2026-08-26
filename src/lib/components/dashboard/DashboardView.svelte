<script lang="ts">
	import { onMount } from 'svelte';
	import PageHeader from '$lib/components/shell/PageHeader.svelte';
	import Banner from '$lib/components/ui/Banner.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { m } from '$lib/paraglide/messages.js';
	import { useSession } from '$lib/stores/session.svelte';
	import { periodBounds } from '$lib/time/duration';
	import ActiveProjects from './ActiveProjects.svelte';
	import CurrentFocus from './CurrentFocus.svelte';
	import RecentLogsList from './RecentLogsList.svelte';
	import TodayTotal from './TodayTotal.svelte';
	import WeeklyOverview from './WeeklyOverview.svelte';

	const sessionStore = useSession();

	onMount(() => {
		const { start } = periodBounds('week', new Date(sessionStore.nowMs), sessionStore.timeZone);
		void sessionStore.ensureThrough(start.getTime());
	});
</script>

<div class="flex flex-col gap-gutter" data-testid="page-view">
	<PageHeader title={m.dashboard_title()} description={m.dashboard_subtitle()} />

	{#if sessionStore.error}
		<Banner>
			{sessionStore.error}
			{#snippet action()}
				<Button variant="inline" size="xs" onclick={() => sessionStore.clearError()}>
					{m.common_dismiss()}
				</Button>
			{/snippet}
		</Banner>
	{/if}

	<div class="grid grid-cols-1 gap-gutter md:grid-cols-12">
		<TodayTotal />
		<CurrentFocus />
	</div>

	<ActiveProjects />

	<div class="grid grid-cols-1 gap-gutter lg:grid-cols-2">
		<WeeklyOverview />
		<RecentLogsList />
	</div>
</div>
