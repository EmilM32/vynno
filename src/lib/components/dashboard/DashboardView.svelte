<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import { sessionStore } from '$lib/stores/session.svelte';
	import ActiveProjects from './ActiveProjects.svelte';
	import CurrentFocus from './CurrentFocus.svelte';
	import RecentLogsList from './RecentLogsList.svelte';
	import TodayTotal from './TodayTotal.svelte';
	import WeeklyOverview from './WeeklyOverview.svelte';
</script>

<div class="flex flex-col gap-gutter">
	<div class="border-b border-outline-variant pb-4">
		<h1 class="text-headline-lg text-on-surface">{m.dashboard_title()}</h1>
		<p class="mt-1 text-body-sm text-on-surface-variant">{m.dashboard_subtitle()}</p>
	</div>

	{#if sessionStore.error}
		<div
			class="rounded border border-error/40 bg-error-container/20 px-3 py-2 font-mono text-code-label text-error"
			role="alert"
		>
			{sessionStore.error}
			<button
				type="button"
				class="focus-ring ml-2 underline"
				onclick={() => sessionStore.clearError()}>{m.common_dismiss()}</button
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
