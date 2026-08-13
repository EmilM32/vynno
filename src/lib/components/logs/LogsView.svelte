<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import { sessionStore } from '$lib/stores/session.svelte';
	import { filterSessions, groupSessionsByDate } from '$lib/time/aggregates';
	import { localDateKeyFromDate } from '$lib/time/duration';
	import LogRow from './LogRow.svelte';

	let query = $state('');

	const stopped = $derived(sessionStore.sessions.filter((s) => s.status === 'stopped'));
	const filtered = $derived(filterSessions(stopped, query, sessionStore.projects));
	const groups = $derived(groupSessionsByDate(filtered));
	const todayKey = $derived(localDateKeyFromDate(new Date(sessionStore.nowMs)));
</script>

<div class="mx-auto w-full max-w-container-max space-y-6">
	<div
		class="flex flex-col justify-between gap-4 border-b border-outline-variant pb-4 md:flex-row md:items-end"
	>
		<div>
			<h1 class="text-headline-lg text-on-surface">{m.logs_title()}</h1>
			<p class="mt-1 text-body-sm text-on-surface-variant">
				{m.logs_subtitle()}
			</p>
		</div>
		<div class="group relative w-full md:w-64">
			<span
				class="material-symbols-outlined absolute top-1/2 left-3 -translate-y-1/2 text-[18px] text-on-surface-variant transition-colors group-focus-within:text-primary"
				aria-hidden="true">search</span
			>
			<input
				class="focus-ring w-full rounded-DEFAULT border border-outline-variant bg-surface-container-low py-2 pr-3 pl-9 font-mono text-code-label text-on-surface transition-all placeholder:text-on-surface-variant focus:border-primary focus:ring-1 focus:ring-primary"
				type="search"
				placeholder={m.logs_search_placeholder()}
				bind:value={query}
				aria-label={m.logs_search_aria()}
			/>
		</div>
	</div>

	{#if groups.length === 0}
		<p class="py-12 text-center text-body-md text-on-surface-variant">
			{query.trim() ? m.logs_no_match() : m.logs_no_completed()}
		</p>
	{:else}
		{#each groups as group, i (group.dateKey)}
			<div class="flex items-center gap-4 py-2 {i > 0 ? 'mt-6' : ''}">
				<div
					class="font-mono text-code-label {group.dateKey === todayKey
						? 'text-primary'
						: 'text-on-surface-variant'}"
				>
					{group.dateKey}
				</div>
				<div class="flex-1 border-t border-dashed border-outline-variant"></div>
			</div>
			<div class="space-y-2">
				{#each group.sessions as session (session.id)}
					<LogRow {session} />
				{/each}
			</div>
		{/each}
	{/if}
</div>
