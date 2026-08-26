<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import Field from '$lib/components/ui/Field.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import { m } from '$lib/paraglide/messages.js';
	import { useSession } from '$lib/stores/session.svelte';
	import { datetimeLocalToIso, isoToDatetimeLocal } from '$lib/time/duration';
	import type {
		CreateManualSessionInput,
		TimeSession,
		UpdateSessionInput
	} from '$lib/types/domain';

	let {
		mode,
		session,
		pending = false,
		onsubmit,
		oncancel
	}: {
		mode: 'create' | 'edit';
		session?: TimeSession;
		pending?: boolean;
		onsubmit: (values: CreateManualSessionInput | UpdateSessionInput) => void;
		oncancel: () => void;
	} = $props();

	const sessionStore = useSession();
	const live = $derived(
		session != null && (session.status === 'active' || session.status === 'paused')
	);

	// svelte-ignore state_referenced_locally
	let note = $state(session?.note ?? '');
	// svelte-ignore state_referenced_locally
	let projectId = $state(session?.projectId ?? sessionStore.draftProjectId);
	// svelte-ignore state_referenced_locally
	let activityTypeId = $state(session?.activityTypeId ?? '');
	// svelte-ignore state_referenced_locally
	let startedLocal = $state(
		isoToDatetimeLocal(session?.startedAt ?? new Date(Date.now() - 60 * 60_000).toISOString())
	);
	// svelte-ignore state_referenced_locally
	let endedLocal = $state(isoToDatetimeLocal(session?.endedAt ?? new Date().toISOString()));
	let timeError = $state<string | null>(null);

	function handleSubmit(e: Event) {
		e.preventDefault();
		if (pending) return;
		const startedAt = datetimeLocalToIso(startedLocal);
		const endedAt = live ? null : datetimeLocalToIso(endedLocal);
		if (!startedAt || (!live && !endedAt)) {
			timeError = m.logs_time_invalid();
			return;
		}
		if (!live && endedAt && Date.parse(endedAt) <= Date.parse(startedAt)) {
			timeError = m.logs_time_invalid();
			return;
		}
		timeError = null;
		if (mode === 'create') {
			onsubmit({
				projectId,
				note,
				activityTypeId: activityTypeId || undefined,
				startedAt,
				endedAt: endedAt!
			});
			return;
		}
		const patch: UpdateSessionInput = {
			projectId,
			note,
			activityTypeId: activityTypeId || null,
			startedAt
		};
		if (!live && endedAt) patch.endedAt = endedAt;
		onsubmit(patch);
	}
</script>

<form class="flex flex-col gap-4" onsubmit={handleSubmit} novalidate data-testid="session-form">
	<Field id="session-note" label={m.logs_field_note()}>
		<Input tone="data" type="text" bind:value={note} autocomplete="off" class="w-full" />
	</Field>

	<div class="grid gap-4 sm:grid-cols-2">
		<Field id="session-project" label={m.logs_field_project()}>
			<Select bind:value={projectId} class="w-full">
				{#each sessionStore.allProjects as project (project.id)}
					<option value={project.id}>{project.name}</option>
				{/each}
			</Select>
		</Field>
		<Field id="session-activity" label={m.logs_field_activity()}>
			<Select bind:value={activityTypeId} class="w-full">
				<option value="">{m.logs_activity_none()}</option>
				{#each sessionStore.activityTypes as type (type.id)}
					<option value={type.id}>{type.name}</option>
				{/each}
			</Select>
		</Field>
	</div>

	<div class="grid gap-4 sm:grid-cols-2">
		<Field id="session-started" label={m.logs_field_started()}>
			<Input tone="code" type="datetime-local" bind:value={startedLocal} class="w-full" />
		</Field>
		{#if !live}
			<Field id="session-ended" label={m.logs_field_ended()}>
				<Input tone="code" type="datetime-local" bind:value={endedLocal} class="w-full" />
			</Field>
		{/if}
	</div>

	{#if timeError}
		<p class="text-body-sm text-error" role="alert">{timeError}</p>
	{/if}

	<div class="flex flex-wrap justify-end gap-2">
		<Button variant="secondary" size="sm" onclick={oncancel}>
			{m.common_cancel()}
		</Button>
		<Button variant="primary" size="sm" type="submit" disabled={pending}>
			{mode === 'create' ? m.logs_create() : m.logs_save()}
		</Button>
	</div>
</form>
