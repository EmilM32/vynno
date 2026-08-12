<script lang="ts">
	import CurrentFocus from './CurrentFocus.svelte';
	import RecentLogsList from './RecentLogsList.svelte';
	import TodayTotal from './TodayTotal.svelte';
</script>

<div class="flex flex-col gap-gutter">
	<div class="grid grid-cols-1 gap-gutter md:grid-cols-12">
		<TodayTotal />
		<CurrentFocus />
	</div>

	<!-- Phase 3: Active Projects strip + Weekly Overview chart -->
	<div class="grid grid-cols-1 gap-gutter lg:grid-cols-2">
		<div
			class="flex min-h-[200px] flex-col items-center justify-center rounded-lg border border-dashed border-outline-variant bg-surface-container/50 p-6 text-center"
		>
			<span class="mb-2 material-symbols-outlined text-2xl text-outline" aria-hidden="true"
				>bar_chart</span
			>
			<p class="text-body-md text-on-surface-variant">Weekly overview</p>
			<p class="mt-1 font-mono text-code-label text-outline">Phase 3</p>
		</div>
		<RecentLogsList />
	</div>
</div>
