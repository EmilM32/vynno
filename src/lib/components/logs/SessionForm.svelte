<script lang="ts">
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
	<div class="flex flex-col gap-1.5">
		<label class="text-body-sm text-on-surface-variant" for="session-note"
			>{m.logs_field_note()}</label
		>
		<input
			id="session-note"
			type="text"
			bind:value={note}
			class="w-full rounded border border-outline-variant bg-surface-container-low px-3 py-2 font-mono text-code-data text-on-surface"
			autocomplete="off"
		/>
	</div>

	<div class="grid gap-4 sm:grid-cols-2">
		<div class="flex flex-col gap-1.5">
			<label class="text-body-sm text-on-surface-variant" for="session-project"
				>{m.logs_field_project()}</label
			>
			<select
				id="session-project"
				class="native-select w-full rounded border border-outline-variant bg-surface-container-low py-2 pl-3 font-mono text-code-label text-on-surface"
				bind:value={projectId}
			>
				{#each sessionStore.allProjects as project (project.id)}
					<option value={project.id}>{project.name}</option>
				{/each}
			</select>
		</div>
		<div class="flex flex-col gap-1.5">
			<label class="text-body-sm text-on-surface-variant" for="session-activity"
				>{m.logs_field_activity()}</label
			>
			<select
				id="session-activity"
				class="native-select w-full rounded border border-outline-variant bg-surface-container-low py-2 pl-3 font-mono text-code-label text-on-surface"
				bind:value={activityTypeId}
			>
				<option value="">{m.logs_activity_none()}</option>
				{#each sessionStore.activityTypes as type (type.id)}
					<option value={type.id}>{type.name}</option>
				{/each}
			</select>
		</div>
	</div>

	<div class="grid gap-4 sm:grid-cols-2">
		<div class="flex flex-col gap-1.5">
			<label class="text-body-sm text-on-surface-variant" for="session-started"
				>{m.logs_field_started()}</label
			>
			<input
				id="session-started"
				type="datetime-local"
				bind:value={startedLocal}
				class="w-full rounded border border-outline-variant bg-surface-container-low px-3 py-2 font-mono text-code-label text-on-surface"
			/>
		</div>
		{#if !live}
			<div class="flex flex-col gap-1.5">
				<label class="text-body-sm text-on-surface-variant" for="session-ended"
					>{m.logs_field_ended()}</label
				>
				<input
					id="session-ended"
					type="datetime-local"
					bind:value={endedLocal}
					class="w-full rounded border border-outline-variant bg-surface-container-low px-3 py-2 font-mono text-code-label text-on-surface"
				/>
			</div>
		{/if}
	</div>

	{#if timeError}
		<p class="text-body-sm text-error" role="alert">{timeError}</p>
	{/if}

	<div class="flex flex-wrap justify-end gap-2">
		<button
			type="button"
			class="focus-ring rounded border border-outline-variant px-3 py-1.5 text-body-sm text-on-surface hover:bg-surface-variant"
			onclick={oncancel}
		>
			{m.common_cancel()}
		</button>
		<button
			type="submit"
			class="focus-ring rounded border border-transparent bg-primary px-3 py-1.5 text-body-sm text-on-primary hover:bg-primary-fixed-dim disabled:opacity-60"
			disabled={pending}
		>
			{mode === 'create' ? m.logs_create() : m.logs_save()}
		</button>
	</div>
</form>
