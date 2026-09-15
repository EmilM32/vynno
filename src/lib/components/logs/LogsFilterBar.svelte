<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import { m } from '$lib/paraglide/messages.js';
	import { getLocale } from '$lib/paraglide/runtime.js';
	import { UNASSIGNED_ACTIVITY_ID } from '$lib/time/aggregates';
	import { activityChartColor } from '$lib/time/activity-styles';
	import {
		formatLogDateRangeLabel,
		localDateKeyFromDate,
		logDateRangeForPreset,
		type LogDatePreset,
		type LogDateRange
	} from '$lib/time/duration';
	import type { ActivityType, Project } from '$lib/types/domain';
	import LogsDateDialog from './LogsDateDialog.svelte';
	import LogsFiltersDialog from './LogsFiltersDialog.svelte';
	import LogsPickDialog from './LogsPickDialog.svelte';

	let {
		datePreset = $bindable('all'),
		customRange = $bindable(null),
		projectIds = $bindable(),
		activityTypeIds = $bindable(),
		projects,
		activityTypes,
		now,
		timeZone,
		showProjects = true,
		showDates = true
	}: {
		datePreset?: LogDatePreset;
		customRange?: LogDateRange | null;
		projectIds: string[];
		activityTypeIds: string[];
		projects: Project[];
		activityTypes: ActivityType[];
		now: Date;
		timeZone?: string;
		/** False on the project dossier — the page is already one project. */
		showProjects?: boolean;
		/** False on the project dossier — the page period toggle owns the range. */
		showDates?: boolean;
	} = $props();

	/** Full logs page has three chips; collapse them below `md`. Dossier keeps the activity chip. */
	const compactable = $derived(showDates && showProjects);

	const dateConstrained = $derived(showDates && datePreset !== 'all');
	const projectsConstrained = $derived(projectIds.length > 0);
	const activitiesConstrained = $derived(activityTypeIds.length > 0);
	const constrained = $derived(
		dateConstrained || (showProjects && projectsConstrained) || activitiesConstrained
	);
	const facetCount = $derived(
		(dateConstrained ? 1 : 0) +
			(showProjects && projectsConstrained ? 1 : 0) +
			(activitiesConstrained ? 1 : 0)
	);
	const compactLabel = $derived(
		facetCount > 0 ? m.logs_filter_n({ n: facetCount }) : m.logs_filter_open()
	);

	const dateLabel = $derived.by(() => {
		if (datePreset === 'all') return m.logs_filter_dates_all();
		if (datePreset === 'today') return m.logs_filter_today();
		if (datePreset === 'yesterday') return m.logs_filter_yesterday();
		if (datePreset === 'last7') return m.logs_filter_last_7();
		if (datePreset === 'week') return m.logs_filter_this_week();
		if (datePreset === 'month') return m.logs_filter_this_month();
		if (customRange) return formatLogDateRangeLabel(customRange, getLocale(), timeZone);
		return m.logs_filter_custom();
	});

	const projectLabel = $derived.by(() => {
		if (projectIds.length === 0) return m.logs_filter_projects_all();
		if (projectIds.length === 1) {
			return (
				projects.find((p) => p.id === projectIds[0])?.name ?? m.logs_filter_projects_n({ n: 1 })
			);
		}
		return m.logs_filter_projects_n({ n: projectIds.length });
	});

	const activityLabel = $derived.by(() => {
		if (activityTypeIds.length === 0) return m.logs_filter_activities_all();
		if (activityTypeIds.length === 1) {
			const id = activityTypeIds[0]!;
			if (id === UNASSIGNED_ACTIVITY_ID) return m.logs_activity_none();
			return activityTypes.find((a) => a.id === id)?.name ?? m.logs_filter_activities_n({ n: 1 });
		}
		return m.logs_filter_activities_n({ n: activityTypeIds.length });
	});

	const projectItems = $derived(projects.map((p) => ({ id: p.id, label: p.name, color: p.color })));
	const activityItems = $derived([
		{
			id: UNASSIGNED_ACTIVITY_ID,
			label: m.logs_activity_none(),
			// Hollow mark: keeps the rows aligned and stays distinct from a real `outline` activity.
			dotClass: 'border border-outline'
		},
		...activityTypes.map((a) => ({ id: a.id, label: a.name, color: activityChartColor(a.color) }))
	]);

	let dateOpen = $state(false);
	let dateDraft = $state<LogDatePreset>('all');
	let draftFrom = $state('');
	let draftTo = $state('');
	let projectsOpen = $state(false);
	let projectDraft = $state.raw<string[]>([]);
	let activitiesOpen = $state(false);
	let activityDraft = $state.raw<string[]>([]);
	let filtersOpen = $state(false);
	let filtersDateDraft = $state<LogDatePreset>('all');
	let filtersFrom = $state('');
	let filtersTo = $state('');
	let filtersProjectDraft = $state.raw<string[]>([]);
	let filtersActivityDraft = $state.raw<string[]>([]);

	function seedDateDraft() {
		dateDraft = datePreset;
		const seed =
			datePreset === 'custom' && customRange
				? customRange
				: logDateRangeForPreset(datePreset === 'custom' ? 'all' : datePreset, now, timeZone);
		const today = localDateKeyFromDate(now, timeZone);
		draftFrom = seed ? localDateKeyFromDate(seed.start, timeZone) : today;
		draftTo = seed ? localDateKeyFromDate(seed.end, timeZone) : today;
	}

	function seedCombinedDraft() {
		seedDateDraft();
		filtersDateDraft = dateDraft;
		filtersFrom = draftFrom;
		filtersTo = draftTo;
		filtersProjectDraft = [...projectIds];
		filtersActivityDraft = [...activityTypeIds];
	}

	function openDates() {
		seedDateDraft();
		dateOpen = true;
	}

	function openProjects() {
		projectDraft = [...projectIds];
		projectsOpen = true;
	}

	function openActivities() {
		activityDraft = [...activityTypeIds];
		activitiesOpen = true;
	}

	function openFilters() {
		seedCombinedDraft();
		filtersOpen = true;
	}

	function clearFilters() {
		if (showDates) {
			datePreset = 'all';
			customRange = null;
		}
		if (showProjects) projectIds = [];
		activityTypeIds = [];
	}
</script>

<div class="flex flex-wrap items-center gap-2" data-testid="logs-filters">
	{#if compactable}
		<Button
			variant={constrained ? 'tonal' : 'secondary'}
			size="sm"
			class="md:hidden"
			aria-pressed={constrained}
			aria-haspopup="dialog"
			data-testid="logs-filter-open"
			onclick={openFilters}
		>
			{compactLabel}
		</Button>
	{/if}
	<div class={['flex flex-wrap items-center gap-2', compactable && 'hidden md:flex']}>
		{#if showDates}
			<Button
				variant={dateConstrained ? 'tonal' : 'secondary'}
				size="sm"
				aria-pressed={dateConstrained}
				aria-haspopup="dialog"
				data-testid="logs-filter-dates"
				onclick={openDates}
			>
				{dateLabel}
			</Button>
		{/if}
		{#if showProjects}
			<Button
				variant={projectsConstrained ? 'tonal' : 'secondary'}
				size="sm"
				aria-pressed={projectsConstrained}
				aria-haspopup="dialog"
				data-testid="logs-filter-projects"
				onclick={openProjects}
			>
				{projectLabel}
			</Button>
		{/if}
		<Button
			variant={activitiesConstrained ? 'tonal' : 'secondary'}
			size="sm"
			aria-pressed={activitiesConstrained}
			aria-haspopup="dialog"
			data-testid="logs-filter-activities"
			onclick={openActivities}
		>
			{activityLabel}
		</Button>
	</div>
	{#if constrained}
		<Button variant="quiet" size="sm" data-testid="logs-filter-clear" onclick={clearFilters}>
			{m.logs_filter_clear()}
		</Button>
	{/if}
</div>

{#if showDates}
	<LogsDateDialog
		open={dateOpen}
		bind:preset={dateDraft}
		bind:fromDay={draftFrom}
		bind:toDay={draftTo}
		{now}
		{timeZone}
		onclose={() => (dateOpen = false)}
		onapply={(next) => {
			datePreset = next.preset;
			customRange = next.customRange;
			dateOpen = false;
		}}
	/>
{/if}

{#if showProjects}
	<LogsPickDialog
		open={projectsOpen}
		title={m.logs_filter_projects_dialog()}
		items={projectItems}
		bind:selected={projectDraft}
		onclose={() => (projectsOpen = false)}
		onapply={(ids) => {
			projectIds = ids;
			projectsOpen = false;
		}}
	/>
{/if}

<LogsPickDialog
	open={activitiesOpen}
	title={m.logs_filter_activities_dialog()}
	items={activityItems}
	bind:selected={activityDraft}
	onclose={() => (activitiesOpen = false)}
	onapply={(ids) => {
		activityTypeIds = ids;
		activitiesOpen = false;
	}}
/>

{#if compactable}
	<LogsFiltersDialog
		open={filtersOpen}
		bind:preset={filtersDateDraft}
		bind:fromDay={filtersFrom}
		bind:toDay={filtersTo}
		bind:projectIds={filtersProjectDraft}
		bind:activityTypeIds={filtersActivityDraft}
		{projectItems}
		{activityItems}
		{now}
		{timeZone}
		{showProjects}
		{showDates}
		onclose={() => (filtersOpen = false)}
		onapply={(next) => {
			datePreset = next.preset;
			customRange = next.customRange;
			projectIds = next.projectIds;
			activityTypeIds = next.activityTypeIds;
			filtersOpen = false;
		}}
	/>
{/if}
