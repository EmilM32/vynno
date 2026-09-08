<script lang="ts">
	import PageHeader from '$lib/components/shell/PageHeader.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import { m } from '$lib/paraglide/messages.js';
	import { useSession } from '$lib/stores/session.svelte';
	import { filterSessions, groupSessionsByDate } from '$lib/time/aggregates';
	import {
		localDateKeyFromDate,
		logDateRangeForPreset,
		type LogDatePreset,
		type LogDateRange
	} from '$lib/time/duration';
	import LogRow from './LogRow.svelte';
	import LogsFilterBar from './LogsFilterBar.svelte';
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
	let datePreset = $state<LogDatePreset>('all');
	let customRange = $state.raw<LogDateRange | null>(null);
	let projectIds = $state.raw<string[]>([]);
	let activityTypeIds = $state.raw<string[]>([]);

	const now = $derived(new Date(sessionStore.nowMs));
	const range = $derived(
		datePreset === 'custom'
			? customRange
			: logDateRangeForPreset(datePreset, now, sessionStore.timeZone)
	);
	const listFilter = $derived({ range, projectIds, activityTypeIds });

	$effect(() => {
		if (range) void sessionStore.ensureThrough(range.start.getTime());
	});

	const live = $derived(sessionStore.activeSession);
	const stopped = $derived(sessionStore.sessions.filter((s) => s.status === 'stopped'));
	const filtered = $derived(filterSessions(stopped, query, sessionStore.allProjects, listFilter));
	const groups = $derived(groupSessionsByDate(filtered, sessionStore.timeZone));
	const todayKey = $derived(localDateKeyFromDate(now, sessionStore.timeZone));
	const liveVisible = $derived(
		Boolean(live) &&
			!query.trim() &&
			filterSessions(live ? [live] : [], '', sessionStore.allProjects, listFilter).length > 0
	);
	const hasConstraint = $derived(
		Boolean(query.trim() || range || projectIds.length || activityTypeIds.length)
	);
</script>

<SessionMutations>
	{#snippet children({ openCreate, openEdit, openDelete })}
		<div class="flex w-full flex-col gap-6" data-testid="page-view">
			<PageHeader title={m.logs_title()} description={m.logs_subtitle()}>
				{#snippet actions()}
					<div class="flex w-full flex-col gap-2 md:w-auto md:flex-row md:items-center">
						<Input
							id="logs-search"
							name="q"
							type="search"
							tone="code"
							size="sm"
							class="w-full md:w-64"
							placeholder={m.logs_search_placeholder()}
							bind:value={query}
							aria-label={m.logs_search_aria()}
						>
							{#snippet leading()}
								<Icon name="search" />
							{/snippet}
						</Input>
						<Button variant="primary" size="sm" onclick={openCreate}>
							{m.logs_add_entry()}
						</Button>
					</div>
				{/snippet}
			</PageHeader>

			<LogsFilterBar
				bind:datePreset
				bind:customRange
				bind:projectIds
				bind:activityTypeIds
				projects={sessionStore.allProjects}
				activityTypes={sessionStore.activityTypes}
				{now}
				timeZone={sessionStore.timeZone}
			/>

			{#if sessionStore.loadingMore && range}
				<p class="text-body-sm text-on-surface-variant">{m.logs_loading_earlier()}</p>
			{/if}

			{#if live && liveVisible}
				<div class="flex items-center gap-4 py-2">
					<div class="font-mono text-code-label text-primary">{m.logs_in_progress()}</div>
					<div class="flex-1 border-t border-dashed border-outline-variant"></div>
				</div>
				<LogRow session={live} onedit={() => openEdit(live)} ondelete={() => openDelete(live)} />
			{/if}

			{#if groups.length === 0}
				<p class="py-12 text-center text-body-md text-on-surface-variant">
					{hasConstraint ? m.logs_no_match() : m.logs_no_completed()}
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

			{#if sessionStore.nextCursor && !range}
				<div bind:this={sentinel} class="h-8" data-testid="logs-sentinel" aria-hidden="true"></div>
			{/if}
		</div>
	{/snippet}
</SessionMutations>
