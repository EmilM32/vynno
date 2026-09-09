<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import { m } from '$lib/paraglide/messages.js';
	import { getLocale } from '$lib/paraglide/runtime.js';
	import { UNASSIGNED_ACTIVITY_ID } from '$lib/time/aggregates';
	import {
		formatLogDateRangeLabel,
		localDateKeyFromDate,
		logDateRangeForPreset,
		type LogDatePreset,
		type LogDateRange
	} from '$lib/time/duration';
	import type { ActivityType, Project } from '$lib/types/domain';
	import LogsDateDialog from './LogsDateDialog.svelte';
	import LogsPickDialog from './LogsPickDialog.svelte';

	let {
		datePreset = $bindable(),
		customRange = $bindable(),
		projectIds = $bindable(),
		activityTypeIds = $bindable(),
		projects,
		activityTypes,
		now,
		timeZone,
		showProjects = true
	}: {
		datePreset: LogDatePreset;
		customRange: LogDateRange | null;
		projectIds: string[];
		activityTypeIds: string[];
		projects: Project[];
		activityTypes: ActivityType[];
		now: Date;
		timeZone?: string;
		/** False on the project dossier — the page is already one project. */
		showProjects?: boolean;
	} = $props();

	const dateConstrained = $derived(datePreset !== 'all');
	const projectsConstrained = $derived(projectIds.length > 0);
	const activitiesConstrained = $derived(activityTypeIds.length > 0);
	const constrained = $derived(
		dateConstrained || (showProjects && projectsConstrained) || activitiesConstrained
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
		{ id: UNASSIGNED_ACTIVITY_ID, label: m.logs_activity_none() },
		...activityTypes.map((a) => ({ id: a.id, label: a.name }))
	]);

	let dateOpen = $state(false);
	let dateDraft = $state<LogDatePreset>('all');
	let draftFrom = $state('');
	let draftTo = $state('');
	let projectsOpen = $state(false);
	let projectDraft = $state.raw<string[]>([]);
	let activitiesOpen = $state(false);
	let activityDraft = $state.raw<string[]>([]);

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

	function clearFilters() {
		datePreset = 'all';
		customRange = null;
		if (showProjects) projectIds = [];
		activityTypeIds = [];
	}
</script>

<div class="flex flex-wrap items-center gap-2" data-testid="logs-filters">
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
	{#if constrained}
		<Button variant="quiet" size="sm" data-testid="logs-filter-clear" onclick={clearFilters}>
			{m.logs_filter_clear()}
		</Button>
	{/if}
</div>

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
