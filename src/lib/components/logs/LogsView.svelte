<script lang="ts">
	import PageHeader from '$lib/components/shell/PageHeader.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import { m } from '$lib/paraglide/messages.js';
	import { useSession } from '$lib/stores/session.svelte';
	import { filterSessions, groupSessionsByDate } from '$lib/time/aggregates';
	import { localDateKeyFromDate } from '$lib/time/duration';
	import LogRow from './LogRow.svelte';
	import SessionMutations from './SessionMutations.svelte';

	const sessionStore = useSession();

	let sentinel = $state<HTMLElement | undefined>(undefined);

	$effect(() => {
		if (!sentinel || !sessionStore.nextCursor) return;
		const node = sentinel;
		const io = new IntersectionObserver((entries) => {
			if (entries.some((e) => e.isIntersecting)) void sessionStore.loadMore();
		});
		io.observe(node);
		return () => io.disconnect();
	});

	let query = $state('');

	const live = $derived(sessionStore.activeSession);
	const stopped = $derived(sessionStore.sessions.filter((s) => s.status === 'stopped'));
	const filtered = $derived(filterSessions(stopped, query, sessionStore.projects));
	const groups = $derived(groupSessionsByDate(filtered, sessionStore.timeZone));
	const todayKey = $derived(
		localDateKeyFromDate(new Date(sessionStore.nowMs), sessionStore.timeZone)
	);
</script>

<SessionMutations>
	{#snippet children({ openCreate, openEdit, openDelete })}
		<div class="flex w-full flex-col gap-6" data-testid="page-view">
			<PageHeader title={m.logs_title()} description={m.logs_subtitle()}>
				{#snippet actions()}
					<div class="flex w-full flex-col gap-2 md:w-auto md:flex-row md:items-center">
						<div class="group relative w-full md:w-64">
							<Icon
								name="search"
								class="absolute top-1/2 left-3 -translate-y-1/2 text-on-surface-variant transition-colors group-focus-within:text-primary"
							/>
							<input
								class="w-full rounded-DEFAULT border border-outline-variant bg-surface-container-low py-2 pr-3 pl-9 font-mono text-code-label text-on-surface transition-colors placeholder:text-on-surface-variant"
								type="search"
								placeholder={m.logs_search_placeholder()}
								bind:value={query}
								aria-label={m.logs_search_aria()}
							/>
						</div>
						<Button variant="primary" size="sm" onclick={openCreate}>
							{m.logs_add_entry()}
						</Button>
					</div>
				{/snippet}
			</PageHeader>

			{#if live && !query.trim()}
				<div class="flex items-center gap-4 py-2">
					<div class="font-mono text-code-label text-primary">{m.logs_in_progress()}</div>
					<div class="flex-1 border-t border-dashed border-outline-variant"></div>
				</div>
				<LogRow session={live} onedit={() => openEdit(live)} ondelete={() => openDelete(live)} />
			{/if}

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
							<LogRow
								{session}
								onedit={() => openEdit(session)}
								ondelete={() => openDelete(session)}
							/>
						{/each}
					</div>
				{/each}
			{/if}

			{#if sessionStore.nextCursor}
				<div bind:this={sentinel} class="h-8" data-testid="logs-sentinel" aria-hidden="true"></div>
			{/if}
		</div>
	{/snippet}
</SessionMutations>
