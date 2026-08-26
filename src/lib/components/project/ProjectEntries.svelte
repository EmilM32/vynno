<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import LogRow from '$lib/components/logs/LogRow.svelte';
	import SessionMutations from '$lib/components/logs/SessionMutations.svelte';
	import { m } from '$lib/paraglide/messages.js';
	import { useSession } from '$lib/stores/session.svelte';
	import { filterSessions, groupSessionsByDate } from '$lib/time/aggregates';
	import { localDateKeyFromDate } from '$lib/time/duration';
	import type { TimeSession } from '$lib/types/domain';

	let { sessions }: { sessions: TimeSession[] } = $props();

	const sessionStore = useSession();
	let query = $state('');

	const stopped = $derived(sessions.filter((s) => s.status === 'stopped'));
	const filtered = $derived(filterSessions(stopped, query, sessionStore.allProjects));
	const groups = $derived(groupSessionsByDate(filtered, sessionStore.timeZone));
	const todayKey = $derived(
		localDateKeyFromDate(new Date(sessionStore.nowMs), sessionStore.timeZone)
	);
</script>

<SessionMutations>
	{#snippet children({ openEdit, openDelete })}
		<section class="flex flex-col gap-4" aria-label={m.project_entries_aria()}>
			<div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
				<h2 class="text-headline-md text-on-surface">{m.project_entries()}</h2>
				<Input
					type="search"
					tone="code"
					size="sm"
					class="w-full sm:w-64"
					placeholder={m.logs_search_placeholder()}
					bind:value={query}
					aria-label={m.project_entries_search_aria()}
				>
					{#snippet leading()}
						<Icon name="search" />
					{/snippet}
				</Input>
			</div>

			{#if groups.length === 0}
				<p class="py-8 text-center text-body-md text-on-surface-variant">
					{query.trim() ? m.project_entries_no_match() : m.project_entries_empty()}
				</p>
			{:else}
				{#each groups as group, i (group.dateKey)}
					<div class="flex items-center gap-4 py-2 {i > 0 ? 'mt-4' : ''}">
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
							<LogRow
								{session}
								hideProject
								onedit={() => openEdit(session)}
								ondelete={() => openDelete(session)}
							/>
						{/each}
					</div>
				{/each}
			{/if}
		</section>
	{/snippet}
</SessionMutations>
