<script lang="ts">
	import PageHeader from '$lib/components/shell/PageHeader.svelte';
	import ConfirmDialog from '$lib/components/ui/ConfirmDialog.svelte';
	import { m } from '$lib/paraglide/messages.js';
	import { useSession } from '$lib/stores/session.svelte';
	import { filterSessions, groupSessionsByDate } from '$lib/time/aggregates';
	import { localDateKeyFromDate } from '$lib/time/duration';
	import type {
		CreateManualSessionInput,
		TimeSession,
		UpdateSessionInput
	} from '$lib/types/domain';
	import LogRow from './LogRow.svelte';
	import SessionForm from './SessionForm.svelte';

	const sessionStore = useSession();

	let query = $state('');
	let formMode = $state<{ kind: 'create' } | { kind: 'edit'; session: TimeSession } | null>(null);
	let deleteTarget = $state<TimeSession | null>(null);

	const live = $derived(sessionStore.activeSession);
	const stopped = $derived(sessionStore.sessions.filter((s) => s.status === 'stopped'));
	const filtered = $derived(filterSessions(stopped, query, sessionStore.projects));
	const groups = $derived(groupSessionsByDate(filtered, sessionStore.timeZone));
	const todayKey = $derived(
		localDateKeyFromDate(new Date(sessionStore.nowMs), sessionStore.timeZone)
	);
	const pending = $derived(sessionStore.pendingAction === 'session');

	async function saveCreate(values: CreateManualSessionInput | UpdateSessionInput) {
		const created = await sessionStore.createManualSession(values as CreateManualSessionInput);
		if (created) formMode = null;
	}

	async function saveEdit(values: CreateManualSessionInput | UpdateSessionInput) {
		if (formMode?.kind !== 'edit') return;
		const updated = await sessionStore.updateSession(
			formMode.session.id,
			values as UpdateSessionInput
		);
		if (updated) formMode = null;
	}

	async function confirmDelete() {
		if (!deleteTarget) return;
		const ok = await sessionStore.deleteSession(deleteTarget.id);
		if (ok) deleteTarget = null;
	}
</script>

<div class="flex w-full flex-col gap-6" data-testid="page-view">
	<PageHeader title={m.logs_title()} description={m.logs_subtitle()}>
		{#snippet actions()}
			<div class="flex w-full flex-col gap-2 md:w-auto md:flex-row md:items-center">
				<div class="group relative w-full md:w-64">
					<span
						class="material-symbols-outlined absolute top-1/2 left-3 -translate-y-1/2 text-[18px] text-on-surface-variant transition-colors group-focus-within:text-primary"
						aria-hidden="true">search</span
					>
					<input
						class="w-full rounded-DEFAULT border border-outline-variant bg-surface-container-low py-2 pr-3 pl-9 font-mono text-code-label text-on-surface transition-colors placeholder:text-on-surface-variant"
						type="search"
						placeholder={m.logs_search_placeholder()}
						bind:value={query}
						aria-label={m.logs_search_aria()}
					/>
				</div>
				<button
					type="button"
					class="focus-ring rounded border border-transparent bg-primary px-3 py-2 text-body-sm text-on-primary hover:bg-primary-fixed-dim"
					onclick={() => (formMode = { kind: 'create' })}
				>
					{m.logs_add_entry()}
				</button>
			</div>
		{/snippet}
	</PageHeader>

	{#if formMode}
		{#key formMode.kind === 'edit' ? formMode.session.id : 'create'}
			<SessionForm
				mode={formMode.kind}
				session={formMode.kind === 'edit' ? formMode.session : undefined}
				{pending}
				onsubmit={formMode.kind === 'create' ? saveCreate : saveEdit}
				oncancel={() => (formMode = null)}
			/>
		{/key}
	{/if}

	{#if live && !query.trim()}
		<div class="flex items-center gap-4 py-2">
			<div class="font-mono text-code-label text-primary">{m.logs_in_progress()}</div>
			<div class="flex-1 border-t border-dashed border-outline-variant"></div>
		</div>
		<LogRow
			session={live}
			onedit={() => (formMode = { kind: 'edit', session: live })}
			ondelete={() => (deleteTarget = live)}
		/>
	{/if}

	{#if groups.length === 0}
		<p class="py-12 text-center text-body-md text-on-surface-variant">
			{query.trim() ? m.logs_no_match() : m.logs_no_completed()}
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
						onedit={() => (formMode = { kind: 'edit', session })}
						ondelete={() => (deleteTarget = session)}
					/>
				{/each}
			</div>
		{/each}
	{/if}
</div>

<ConfirmDialog
	open={deleteTarget != null}
	title={m.logs_delete_title()}
	message={m.logs_delete_message({ note: deleteTarget?.note ?? '' })}
	confirmLabel={m.logs_delete()}
	destructive
	onconfirm={confirmDelete}
	oncancel={() => (deleteTarget = null)}
/>
