<script lang="ts">
	import { onMount } from 'svelte';
	import ConfirmDialog from '$lib/components/ui/ConfirmDialog.svelte';
	import Dialog from '$lib/components/ui/Dialog.svelte';
	import { m } from '$lib/paraglide/messages.js';
	import { useSession } from '$lib/stores/session.svelte';
	import type { ActivityColorToken } from '$lib/time/activity-styles';
	import type { ActivityType } from '$lib/types/domain';
	import ActivityChip from '$lib/components/ui/ActivityChip.svelte';
	import ActivityTypeForm from './ActivityTypeForm.svelte';

	const sessionStore = useSession();

	type FormMode = { kind: 'create' } | { kind: 'edit'; type: ActivityType } | null;

	let formMode = $state<FormMode>(null);
	let deleteTarget = $state<ActivityType | null>(null);

	const busy = $derived(sessionStore.pendingAction === 'activity');

	onMount(() => {
		void sessionStore.loadSessionCounts();
	});

	function openCreate() {
		sessionStore.clearError();
		formMode = { kind: 'create' };
	}

	function openEdit(type: ActivityType) {
		sessionStore.clearError();
		formMode = { kind: 'edit', type };
	}

	function closeForm() {
		formMode = null;
	}

	async function onFormSubmit(values: { name: string; color: ActivityColorToken }) {
		if (formMode?.kind === 'edit') {
			const ok = await sessionStore.updateActivityType(formMode.type.id, values);
			if (ok) formMode = null;
			return;
		}
		const created = await sessionStore.createActivityType(values);
		if (created) formMode = null;
	}

	async function confirmDelete() {
		if (!deleteTarget) return;
		const ok = await sessionStore.deleteActivityType(deleteTarget.id);
		if (ok) deleteTarget = null;
	}
</script>

<section
	class="rounded-lg border border-outline-variant bg-surface-container p-4"
	aria-labelledby="settings-activity-types"
>
	<div class="mb-4 flex flex-wrap items-start justify-between gap-3">
		<div class="min-w-0">
			<h2 id="settings-activity-types" class="text-headline-md text-on-surface">
				{m.settings_activity_types()}
			</h2>
			<p class="mt-1 text-body-sm text-on-surface-variant">{m.settings_activity_types_hint()}</p>
		</div>
		<button
			type="button"
			class="press focus-ring shrink-0 rounded bg-primary px-4 py-2 font-mono text-code-data font-medium text-on-primary hover:bg-primary-container"
			onclick={openCreate}
		>
			{m.settings_activity_type_add()}
		</button>
	</div>

	{#if sessionStore.activityTypes.length === 0}
		<div
			class="rounded-lg border border-dashed border-outline-variant bg-surface-container-low/40 px-4 py-8 text-center"
		>
			<p class="text-body-sm text-on-surface-variant">{m.activity_types_empty()}</p>
			<button
				type="button"
				class="focus-ring mt-3 text-body-sm text-primary underline"
				onclick={openCreate}
			>
				{m.activity_types_create_one()}
			</button>
		</div>
	{:else}
		<ul class="flex flex-col gap-2" data-testid="activity-type-list">
			{#each sessionStore.activityTypes as type (type.id)}
				{const inUse = $derived((sessionStore.countSessionsForActivityType(type.id) ?? 1) > 0)}
				{const deleteReasonId = $derived(`${type.id}-delete-reason`)}
				<li
					class="flex flex-wrap items-center gap-2 rounded border border-outline-variant bg-surface-container-low px-3 py-2"
					data-testid="activity-type-row"
					data-activity-type-id={type.id}
				>
					<ActivityChip {type} />
					<span class="text-body-sm text-on-surface">{type.name}</span>
					<div class="ml-auto flex gap-2">
						<button
							type="button"
							class="press focus-ring rounded border border-outline-variant px-2 py-1 font-mono text-code-label text-on-surface hover:bg-surface-container-high"
							onclick={() => openEdit(type)}
						>
							{m.activity_types_edit()}
						</button>
						<button
							type="button"
							class="press focus-ring rounded border border-outline-variant px-2 py-1 font-mono text-code-label text-on-surface hover:bg-surface-container-high disabled:cursor-not-allowed disabled:opacity-40"
							onclick={() => {
								sessionStore.clearError();
								deleteTarget = type;
							}}
							disabled={inUse}
							title={inUse ? m.activity_types_cannot_delete_has_sessions() : undefined}
							aria-describedby={inUse ? deleteReasonId : undefined}
						>
							{m.activity_types_delete()}
						</button>
					</div>
					{#if inUse}
						<span id={deleteReasonId} class="sr-only"
							>{m.activity_types_cannot_delete_has_sessions()}</span
						>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}

	{#if sessionStore.error && formMode === null}
		<p class="mt-3 text-body-sm text-error" role="alert">{sessionStore.error}</p>
	{/if}
</section>

<Dialog
	open={formMode != null}
	title={formMode?.kind === 'edit' ? m.activity_types_form_edit() : m.activity_types_form_new()}
	onclose={closeForm}
>
	{#snippet children({ close })}
		{#if formMode}
			{#key formMode.kind === 'edit' ? formMode.type.id : 'create'}
				<ActivityTypeForm
					mode={formMode.kind}
					type={formMode.kind === 'edit' ? formMode.type : undefined}
					pending={busy}
					onsubmit={onFormSubmit}
					oncancel={() => close()}
				/>
			{/key}
			{#if sessionStore.error}
				<p class="mt-3 text-body-sm text-error" role="alert">{sessionStore.error}</p>
			{/if}
		{/if}
	{/snippet}
</Dialog>

<ConfirmDialog
	open={deleteTarget != null}
	title={m.activity_types_delete_title()}
	message={m.activity_types_delete_message({ name: deleteTarget?.name ?? '' })}
	destructive
	onconfirm={() => void confirmDelete()}
	oncancel={() => (deleteTarget = null)}
/>
