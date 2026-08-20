<script lang="ts">
	import ConfirmDialog from '$lib/components/ui/ConfirmDialog.svelte';
	import { m } from '$lib/paraglide/messages.js';
	import { useSession } from '$lib/stores/session.svelte';
	import {
		ACTIVITY_COLOR_TOKENS,
		isActivityColorToken,
		type ActivityColorToken
	} from '$lib/time/activity-styles';
	import type { ActivityType } from '$lib/types/domain';
	import ActivityChip from '$lib/components/ui/ActivityChip.svelte';
	import ActivityColorPicker from './ActivityColorPicker.svelte';

	const sessionStore = useSession();

	let nameDraft = $state('');
	let colorDraft = $state<ActivityColorToken>(ACTIVITY_COLOR_TOKENS[0]);
	let editing = $state<ActivityType | null>(null);
	let deleteTarget = $state<ActivityType | null>(null);

	const busy = $derived(sessionStore.pendingAction === 'activity');

	function startEdit(type: ActivityType) {
		sessionStore.clearError();
		editing = type;
		nameDraft = type.name;
		colorDraft = isActivityColorToken(type.color) ? type.color : ACTIVITY_COLOR_TOKENS[0];
	}

	function startCreate() {
		sessionStore.clearError();
		editing = null;
		nameDraft = '';
		colorDraft = ACTIVITY_COLOR_TOKENS[0];
	}

	async function onSave() {
		const name = nameDraft.trim();
		if (!name || busy) return;
		if (editing) {
			const ok = await sessionStore.updateActivityType(editing.id, {
				name,
				color: colorDraft
			});
			if (ok) {
				editing = null;
				nameDraft = '';
			}
			return;
		}
		const created = await sessionStore.createActivityType({ name, color: colorDraft });
		if (created) {
			nameDraft = '';
			colorDraft = ACTIVITY_COLOR_TOKENS[0];
		}
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
	<h2 id="settings-activity-types" class="mb-1 text-headline-md text-on-surface">
		{m.settings_activity_types()}
	</h2>
	<p class="mb-4 text-body-sm text-on-surface-variant">{m.settings_activity_types_hint()}</p>

	{#if sessionStore.activityTypes.length === 0}
		<p class="mb-4 text-body-sm text-on-surface-variant">{m.activity_types_empty()}</p>
	{:else}
		<ul class="mb-4 flex flex-col gap-2" data-testid="activity-type-list">
			{#each sessionStore.activityTypes as type (type.id)}
				{const inUse = $derived(sessionStore.countSessionsForActivityType(type.id) > 0)}
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
							onclick={() => startEdit(type)}
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

	<form
		class="flex flex-col gap-3"
		onsubmit={(e) => {
			e.preventDefault();
			void onSave();
		}}
	>
		<label class="flex flex-col gap-1 text-body-md text-on-surface" for="activity-type-name">
			{m.settings_activity_type_name()}
			<input
				id="activity-type-name"
				type="text"
				maxlength="32"
				bind:value={nameDraft}
				class="rounded border border-outline-variant bg-surface-container-low px-3 py-2 font-mono text-code-data text-on-surface"
			/>
			<span class="text-body-sm text-on-surface-variant"
				>{m.settings_activity_type_name_hint()}</span
			>
		</label>
		<div class="flex flex-col gap-1">
			<span class="text-body-md text-on-surface">{m.settings_activity_type_color()}</span>
			<ActivityColorPicker bind:value={colorDraft} />
		</div>
		<div class="flex flex-wrap gap-2">
			<button
				type="submit"
				class="press focus-ring min-h-10 rounded bg-primary px-4 py-2 font-mono text-code-data text-on-primary hover:bg-primary-container disabled:opacity-50"
				disabled={busy || !nameDraft.trim()}
			>
				{editing ? m.settings_activity_type_save() : m.settings_activity_type_add()}
			</button>
			{#if editing}
				<button
					type="button"
					class="press focus-ring min-h-10 rounded border border-outline-variant px-4 py-2 font-mono text-code-data text-on-surface"
					onclick={startCreate}
				>
					{m.common_cancel()}
				</button>
			{/if}
		</div>
	</form>

	{#if sessionStore.error}
		<p class="mt-3 text-body-sm text-error" role="alert">{sessionStore.error}</p>
	{/if}
</section>

<ConfirmDialog
	open={deleteTarget != null}
	title={m.activity_types_delete_title()}
	message={m.activity_types_delete_message({ name: deleteTarget?.name ?? '' })}
	destructive
	onconfirm={() => void confirmDelete()}
	oncancel={() => (deleteTarget = null)}
/>
