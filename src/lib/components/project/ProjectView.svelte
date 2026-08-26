<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import ActivityBars from '$lib/components/insights/ActivityBars.svelte';
	import PeriodToggle from '$lib/components/insights/PeriodToggle.svelte';
	import ProjectForm from '$lib/components/projects/ProjectForm.svelte';
	import WeeklyOverview from '$lib/components/dashboard/WeeklyOverview.svelte';
	import PageHeader from '$lib/components/shell/PageHeader.svelte';
	import Banner from '$lib/components/ui/Banner.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Chip from '$lib/components/ui/Chip.svelte';
	import ColorDot from '$lib/components/ui/ColorDot.svelte';
	import Dialog from '$lib/components/ui/Dialog.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import IconButton from '$lib/components/ui/IconButton.svelte';
	import StatusDot from '$lib/components/ui/StatusDot.svelte';
	import { m } from '$lib/paraglide/messages.js';
	import { useSession } from '$lib/stores/session.svelte';
	import {
		projectPeriodStats,
		sessionsForProject,
		latestStoppedStartedAt,
		periodBucketTotals
	} from '$lib/time/aggregates';
	import { formatRelativePast, periodBounds, type ProjectPeriodKind } from '$lib/time/duration';
	import { SvelteDate } from 'svelte/reactivity';
	import ProjectEntries from './ProjectEntries.svelte';
	import ProjectKpis from './ProjectKpis.svelte';

	let { projectId }: { projectId: string } = $props();

	const sessionStore = useSession();

	let period = $state<ProjectPeriodKind>('week');
	let editing = $state(false);
	let moreOpen = $state(false);

	const project = $derived(sessionStore.getProject(projectId));
	const mine = $derived(project ? sessionsForProject(sessionStore.sessions, project.id) : []);
	const stats = $derived(
		project
			? projectPeriodStats(
					sessionStore.sessions,
					project.id,
					sessionStore.activityTypes,
					period,
					new SvelteDate(sessionStore.nowMs),
					sessionStore.timeZone
				)
			: null
	);
	const chartDays = $derived(
		periodBucketTotals(mine, period, new SvelteDate(sessionStore.nowMs), sessionStore.timeZone)
	);
	const chartHeading = $derived(
		period === 'week'
			? m.dashboard_weekly_overview()
			: period === 'month'
				? m.project_month_overview()
				: m.project_all_overview()
	);
	const chartAria = $derived(
		period === 'week'
			? m.project_week_aria()
			: period === 'month'
				? m.project_month_aria()
				: m.project_all_aria()
	);
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

	$effect(() => {
		const kind = period;
		const timeZone = sessionStore.timeZone;
		if (kind === 'all') {
			void sessionStore.ensureThrough(null);
			return;
		}
		const { start } = periodBounds(kind, new Date(), timeZone);
		void sessionStore.ensureThrough(start.getTime());
	});

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
		<PageHeader
			title={m.error_not_found()}
			description={m.project_not_found()}
			showDescriptionOnMobile
		>
			{#snippet eyebrow()}
				<a
					href={resolve('/projects')}
					class="focus-ring inline-flex items-center gap-1 text-body-sm text-primary"
				>
					<Icon name="arrow_back" size="sm" />
					{m.project_back()}
				</a>
			{/snippet}
		</PageHeader>
		<p class="text-body-md text-on-surface-variant">{m.project_not_found_hint()}</p>
	</div>
{:else}
	<div class="flex w-full flex-col gap-6" data-testid="page-view" data-project-id={project.id}>
		<!--
			Rendered twice: inline on desktop, and again inside the mobile "more" menu.
			`inMenu` only changes visibility and whether picking an action closes the menu.
		-->
		{#snippet secondaryActions(inMenu: boolean)}
			{const hideOnMobile = $derived(inMenu ? undefined : 'hidden md:inline-flex')}
			{const busyProject = $derived(sessionStore.pendingAction === 'project')}
			<Button
				variant="secondary"
				class={hideOnMobile}
				onclick={() => {
					sessionStore.clearError();
					editing = true;
					if (inMenu) moreOpen = false;
				}}
				disabled={busyProject}
			>
				{m.projects_edit()}
			</Button>
			{#if archived}
				<Button
					variant="secondary"
					class={hideOnMobile}
					onclick={() => void sessionStore.restoreProject(project.id)}
					disabled={busyProject}
				>
					{m.projects_restore()}
				</Button>
			{:else}
				<Button
					variant="secondary"
					class={hideOnMobile}
					onclick={() => void sessionStore.archiveProject(project.id)}
					disabled={!canArchive || busyProject}
					aria-describedby={!canArchive ? `${project.id}-archive-reason` : undefined}
				>
					{m.projects_archive()}
				</Button>
			{/if}
		{/snippet}

		<PageHeader title={project.name} description={lastLoggedLabel}>
			{#snippet eyebrow()}
				<a
					href={resolve('/projects')}
					class="focus-ring inline-flex items-center gap-1 text-body-sm text-primary"
				>
					<Icon name="arrow_back" size="sm" />
					{m.project_back()}
				</a>
			{/snippet}
			{#snippet leading()}
				<ColorDot color={project.color} size="md" />
			{/snippet}
			{#snippet titleExtra()}
				{#if project.code}
					<Chip>{project.code}</Chip>
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
						<StatusDot tone={liveHere.status === 'active' ? 'live' : 'paused'} />
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
				<div class="flex w-full flex-col gap-2 sm:w-auto">
					<div class="flex flex-wrap items-center gap-2">
						{#if !archived}
							<Button
								variant="primary"
								onclick={openTimer}
								disabled={startDisabled}
								title={otherLive ? m.error_stop_before_start() : undefined}
								data-testid="project-start"
							>
								{liveHere ? m.project_open_timer() : m.project_start_session()}
							</Button>
						{/if}
						{@render secondaryActions(false)}
						<IconButton
							icon="more_horiz"
							label={m.project_more_actions()}
							variant="bordered"
							class="md:hidden"
							aria-expanded={moreOpen}
							aria-controls={moreOpen ? 'project-more-actions' : undefined}
							onclick={() => (moreOpen = !moreOpen)}
						/>
					</div>
					{#if moreOpen}
						<div id="project-more-actions" class="flex flex-wrap gap-2 md:hidden">
							{@render secondaryActions(true)}
						</div>
					{/if}
					{#if !archived && !canArchive}
						<span id={`${project.id}-archive-reason`} class="sr-only"
							>{m.projects_cannot_archive_last()}</span
						>
					{/if}
				</div>
			{/snippet}
		</PageHeader>

		{#if sessionStore.error}
			<Banner>
				{sessionStore.error}
				{#snippet action()}
					<Button variant="inline" size="xs" onclick={() => sessionStore.clearError()}>
						{m.common_dismiss_capital()}
					</Button>
				{/snippet}
			</Banner>
		{/if}

		{#if stats}
			<div class="flex flex-col gap-3">
				<PeriodToggle bind:value={period} options={periodOptions} />
				<ProjectKpis {stats} />
			</div>
		{/if}

		<div class="grid auto-rows-[16rem] grid-cols-1 gap-6 lg:auto-rows-[300px] lg:grid-cols-2">
			<WeeklyOverview
				class="h-full"
				days={chartDays}
				barColor={project.color}
				heading={chartHeading}
				ariaLabel={chartAria}
			/>
			<ActivityBars class="h-full" items={stats?.byActivity ?? []} />
		</div>

		<ProjectEntries sessions={mine} />
	</div>

	<Dialog open={editing} title={m.projects_form_edit()} onclose={() => (editing = false)} size="lg">
		{#snippet children({ close })}
			<ProjectForm
				mode="edit"
				{project}
				pending={sessionStore.pendingAction === 'project'}
				onsubmit={onFormSubmit}
				oncancel={() => close()}
			/>
			{#if sessionStore.error}
				<p class="mt-3 text-body-sm text-error" role="alert">{sessionStore.error}</p>
			{/if}
		{/snippet}
	</Dialog>
{/if}
