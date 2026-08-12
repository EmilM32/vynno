<script lang="ts">
	import { sessionStore } from '$lib/stores/session.svelte';
	import ActiveProjects from './ActiveProjects.svelte';
	import CurrentFocus from './CurrentFocus.svelte';
	import RecentLogsList from './RecentLogsList.svelte';
	import TodayTotal from './TodayTotal.svelte';
	import WeeklyOverview from './WeeklyOverview.svelte';
</script>

<div class="flex flex-col gap-gutter">
	{#if sessionStore.error}
		<div
			class="rounded border border-error/40 bg-error-container/20 px-3 py-2 font-mono text-code-label text-error"
			role="alert"
		>
			{sessionStore.error}
			<button
				type="button"
				class="ml-2 underline"
				onclick={() => sessionStore.clearError()}>dismiss</button
			>
		</div>
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
