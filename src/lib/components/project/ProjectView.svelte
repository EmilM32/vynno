<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import ActivityBars from '$lib/components/insights/ActivityBars.svelte';
	import PeriodToggle from '$lib/components/insights/PeriodToggle.svelte';
	import ProjectForm from '$lib/components/projects/ProjectForm.svelte';
	import WeeklyOverview from '$lib/components/dashboard/WeeklyOverview.svelte';
	import PageHeader from '$lib/components/shell/PageHeader.svelte';
	import { m } from '$lib/paraglide/messages.js';
	import { useSession } from '$lib/stores/session.svelte';
	import {
		projectPeriodStats,
		recentTasks,
		sessionsForProject,
		latestStoppedStartedAt,
		weeklyDayTotals
	} from '$lib/time/aggregates';
	import { formatRelativePast, type ProjectPeriodKind } from '$lib/time/duration';
	import { SvelteDate } from 'svelte/reactivity';
	import ProjectEntries from './ProjectEntries.svelte';
	import ProjectKpis from './ProjectKpis.svelte';
	import ProjectRecentLogs from './ProjectRecentLogs.svelte';

	let { projectId }: { projectId: string } = $props();

	const sessionStore = useSession();

	let period = $state<ProjectPeriodKind>('week');
	let editing = $state(false);

	const project = $derived(sessionStore.getProject(projectId));
	const mine = $derived(project ? sessionsForProject(sessionStore.sessions, project.id) : []);
	const stats = $derived(
		project
			? projectPeriodStats(
					sessionStore.sessions,
					project.id,
					period,
					new SvelteDate(sessionStore.nowMs),
					sessionStore.timeZone
				)
			: null
	);
	const weekDays = $derived(
		weeklyDayTotals(mine, new SvelteDate(sessionStore.nowMs), sessionStore.timeZone)
	);
	const notes = $derived(recentTasks(mine, 5));
	const lastLogged = $derived(latestStoppedStartedAt(mine));
	const lastLoggedLabel = $derived(
		lastLogged
			? m.project_last_logged({
					when: formatRelativePast(lastLogged, sessionStore.nowMs)
				})
			: m.project_no_sessions()
	);

	const archived = $derived(Boolean(project?.isArchived));
	const liveHere = $derived(
		sessionStore.activeSession?.projectId === project?.id ? sessionStore.activeSession : null
	);
	const otherLive = $derived(
		Boolean(sessionStore.activeSession && sessionStore.activeSession.projectId !== project?.id)
	);
	const canArchive = $derived(project ? sessionStore.canArchiveOrDeleteActive(project.id) : false);
	const startDisabled = $derived(otherLive || sessionStore.busy);
	const periodOptions = $derived([
		{ id: 'week' as const, label: m.insights_period_week() },
		{ id: 'month' as const, label: m.insights_period_month() },
		{ id: 'all' as const, label: m.insights_period_all() }
	]);

	function openTimer() {
		if (!project) return;
		sessionStore.draftProjectId = project.id;
		void goto(resolve('/timer'));
	}

	async function onFormSubmit(values: { name: string; color: string; code: string }) {
		if (!project) return;
		const updated = await sessionStore.updateProject(project.id, {
			name: values.name,
			color: values.color,
			code: values.code.trim() ? values.code : null
		});
		if (updated) editing = false;
	}
</script>

{#if !project}
	<div class="flex w-full flex-col gap-6" data-testid="page-view">
		<PageHeader title={m.error_not_found()} description={m.project_not_found()}>
			{#snippet eyebrow()}
				<a
					href={resolve('/projects')}
					class="focus-ring inline-flex items-center gap-1 text-body-sm text-primary"
				>
					<span class="material-symbols-outlined text-[16px]" aria-hidden="true">arrow_back</span>
					{m.project_back()}
				</a>
			{/snippet}
		</PageHeader>
		<p class="text-body-md text-on-surface-variant">{m.project_not_found_hint()}</p>
	</div>
{:else}
	<div class="flex w-full flex-col gap-6" data-testid="page-view" data-project-id={project.id}>
		<PageHeader title={project.name} description={lastLoggedLabel}>
			{#snippet eyebrow()}
				<a
					href={resolve('/projects')}
					class="focus-ring inline-flex items-center gap-1 text-body-sm text-primary"
				>
					<span class="material-symbols-outlined text-[16px]" aria-hidden="true">arrow_back</span>
					{m.project_back()}
				</a>
			{/snippet}
			{#snippet leading()}
				<div
					class="h-3.5 w-3.5 shrink-0 rounded-sm"
					style:background-color={project.color}
					aria-hidden="true"
				></div>
			{/snippet}
			{#snippet titleExtra()}
				{#if project.code}
					<span
						class="rounded bg-surface-container-high px-1.5 py-0.5 font-mono text-code-label text-on-surface-variant"
					>
						{project.code}
					</span>
				{/if}
				{#if archived}
					<span class="font-mono text-[10px] tracking-wide text-on-surface-variant uppercase"
						>{m.projects_archived_badge()}</span
					>
				{/if}
				{#if liveHere}
					<a
						href={resolve('/timer')}
						class="focus-ring inline-flex items-center gap-1.5 rounded px-1 py-0.5"
					>
						<span
							class="h-1.5 w-1.5 rounded-full {liveHere.status === 'active'
								? 'blink bg-secondary'
								: 'bg-tertiary'}"
							aria-hidden="true"
						></span>
						<span
							class="font-mono text-[10px] tracking-wide uppercase {liveHere.status === 'active'
								? 'text-secondary'
								: 'text-tertiary'}"
						>
							{liveHere.status === 'active' ? m.project_live_active() : m.project_live_paused()}
						</span>
					</a>
				{/if}
			{/snippet}
			{#snippet actions()}
				<div class="flex flex-wrap items-center gap-2">
					{#if !archived}
						<button
							type="button"
							class="press focus-ring min-h-10 rounded bg-primary px-4 py-2 font-mono text-code-data font-medium text-on-primary hover:bg-primary-container disabled:cursor-not-allowed disabled:opacity-40"
							onclick={openTimer}
							disabled={startDisabled}
							title={otherLive ? m.error_stop_before_start() : undefined}
							data-testid="project-start"
						>
							{liveHere ? m.project_open_timer() : m.project_start_session()}
						</button>
					{/if}
					<button
						type="button"
						class="focus-ring min-h-10 rounded border border-outline-variant px-3 py-2 text-body-sm text-on-surface transition-colors hover:border-outline hover:bg-surface-variant disabled:cursor-not-allowed disabled:opacity-40"
						onclick={() => {
							sessionStore.clearError();
							editing = !editing;
						}}
						disabled={sessionStore.pendingAction === 'project'}
					>
						{m.projects_edit()}
					</button>
					{#if archived}
						<button
							type="button"
							class="focus-ring min-h-10 rounded border border-outline-variant px-3 py-2 text-body-sm text-on-surface transition-colors hover:border-outline hover:bg-surface-variant disabled:cursor-not-allowed disabled:opacity-40"
							onclick={() => void sessionStore.restoreProject(project.id)}
							disabled={sessionStore.pendingAction === 'project'}
						>
							{m.projects_restore()}
						</button>
					{:else}
						<button
							type="button"
							class="focus-ring min-h-10 rounded border border-outline-variant px-3 py-2 text-body-sm text-on-surface transition-colors hover:border-outline hover:bg-surface-variant disabled:cursor-not-allowed disabled:opacity-40"
							onclick={() => void sessionStore.archiveProject(project.id)}
							disabled={!canArchive || sessionStore.pendingAction === 'project'}
							aria-describedby={!canArchive ? `${project.id}-archive-reason` : undefined}
						>
							{m.projects_archive()}
						</button>
						{#if !canArchive}
							<span id={`${project.id}-archive-reason`} class="sr-only"
								>{m.projects_cannot_archive_last()}</span
							>
						{/if}
					{/if}
				</div>
			{/snippet}
		</PageHeader>

		{#if sessionStore.error}
			<div
				class="rounded border border-error/40 bg-error-container/15 px-3 py-2 text-body-sm text-error"
				role="alert"
			>
				<div class="flex items-start justify-between gap-3">
					<span>{sessionStore.error}</span>
					<button
						type="button"
						class="focus-ring shrink-0 text-body-sm underline"
						onclick={() => sessionStore.clearError()}
					>
						{m.common_dismiss_capital()}
					</button>
				</div>
			</div>
		{/if}

		{#if editing}
			<ProjectForm
				mode="edit"
				{project}
				pending={sessionStore.pendingAction === 'project'}
				onsubmit={onFormSubmit}
				oncancel={() => (editing = false)}
			/>
		{/if}

		{#if stats}
			<div class="flex flex-col gap-3">
				<PeriodToggle bind:value={period} options={periodOptions} />
				<ProjectKpis {stats} />
			</div>
		{/if}

		<div class="grid auto-rows-[300px] grid-cols-1 gap-6 lg:grid-cols-2">
			<WeeklyOverview
				class="h-full"
				days={weekDays}
				barColor={project.color}
				heading={m.dashboard_weekly_overview()}
				ariaLabel={m.project_week_aria()}
			/>
			<ActivityBars class="h-full" items={stats?.byActivity ?? []} />
		</div>

		<ProjectRecentLogs items={notes} />
		<ProjectEntries sessions={mine} />
	</div>
{/if}
