<script lang="ts">
	import PeriodToggle from '$lib/components/insights/PeriodToggle.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import LogGroupRow from '$lib/components/logs/LogGroupRow.svelte';
	import LogRow from '$lib/components/logs/LogRow.svelte';
	import LogsFilterBar from '$lib/components/logs/LogsFilterBar.svelte';
	import SessionMutations from '$lib/components/logs/SessionMutations.svelte';
	import { m } from '$lib/paraglide/messages.js';
	import { useSession } from '$lib/stores/session.svelte';
	import { filterSessions, groupSessionsByDate, groupSessionsByTask } from '$lib/time/aggregates';
	import {
		localDateKeyFromDate,
		logDateRangeForPreset,
		type LogDatePreset,
		type LogDateRange
	} from '$lib/time/duration';
	import type { TimeSession } from '$lib/types/domain';

	type LogsLayout = 'entries' | 'grouped';

	let { sessions }: { sessions: TimeSession[] } = $props();

	const sessionStore = useSession();
	let query = $state('');
	let datePreset = $state<LogDatePreset>('all');
	let customRange = $state.raw<LogDateRange | null>(null);
	let projectIds = $state.raw<string[]>([]);
	let activityTypeIds = $state.raw<string[]>([]);
	let layout = $state<LogsLayout>('entries');

	const layoutOptions = $derived([
		{ id: 'entries' as const, label: m.logs_view_entries() },
		{ id: 'grouped' as const, label: m.logs_view_grouped() }
	]);

	const now = $derived(new Date(sessionStore.nowMs));
	const range = $derived(
		datePreset === 'custom'
			? customRange
			: logDateRangeForPreset(datePreset, now, sessionStore.timeZone)
	);
	const listFilter = $derived({ range, activityTypeIds });

	$effect(() => {
		if (range) void sessionStore.ensureThrough(range.start.getTime());
	});

	const stopped = $derived(sessions.filter((s) => s.status === 'stopped'));
	const filtered = $derived(filterSessions(stopped, query, sessionStore.allProjects, listFilter));
	const groups = $derived(groupSessionsByDate(filtered, sessionStore.timeZone));
	const todayKey = $derived(localDateKeyFromDate(now, sessionStore.timeZone));
	const hasConstraint = $derived(Boolean(query.trim() || range || activityTypeIds.length));
</script>

<SessionMutations>
	{#snippet children({ openEdit, openDelete })}
		<section
			class="flex flex-col gap-4"
			aria-label={m.project_entries_aria()}
			data-testid="project-entries"
		>
			<div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
				<h2 class="text-headline-md text-on-surface">{m.project_entries()}</h2>
				<Input
					id="project-entries-search"
					name="q"
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

			<div class="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
				<LogsFilterBar
					bind:datePreset
					bind:customRange
					bind:projectIds
					bind:activityTypeIds
					projects={sessionStore.allProjects}
					activityTypes={sessionStore.activityTypes}
					{now}
					timeZone={sessionStore.timeZone}
					showProjects={false}
				/>
				<div class="self-start">
					<PeriodToggle
						bind:value={layout}
						options={layoutOptions}
						ariaLabel={m.logs_view_aria()}
					/>
				</div>
			</div>

			{#if sessionStore.loadingMore && range}
				<p class="text-body-sm text-on-surface-variant">{m.logs_loading_earlier()}</p>
			{/if}

			{#if groups.length === 0}
				<p class="py-8 text-center text-body-md text-on-surface-variant">
					{hasConstraint ? m.project_entries_no_match() : m.project_entries_empty()}
				</p>
			{:else}
				{#each groups as group, i (group.dateKey)}
					{const tasks = $derived(layout === 'grouped' ? groupSessionsByTask(group.sessions) : [])}
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
						{#if layout === 'grouped'}
							{#each tasks as task (task.key)}
								{#if task.sessions.length === 1}
									<LogRow
										session={task.sessions[0]!}
										hideProject
										onedit={() => openEdit(task.sessions[0]!)}
										ondelete={() => openDelete(task.sessions[0]!)}
									/>
								{:else}
									<LogGroupRow group={task} hideProject onedit={openEdit} ondelete={openDelete} />
								{/if}
							{/each}
						{:else}
							{#each group.sessions as session (session.id)}
								<LogRow
									{session}
									hideProject
									onedit={() => openEdit(session)}
									ondelete={() => openDelete(session)}
								/>
							{/each}
						{/if}
					</div>
				{/each}
			{/if}
		</section>
	{/snippet}
</SessionMutations>
