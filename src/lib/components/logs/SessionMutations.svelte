<script lang="ts">
	import ConfirmDialog from '$lib/components/ui/ConfirmDialog.svelte';
	import Dialog from '$lib/components/ui/Dialog.svelte';
	import { m } from '$lib/paraglide/messages.js';
	import { useSession } from '$lib/stores/session.svelte';
	import type {
		CreateManualSessionInput,
		TimeSession,
		UpdateSessionInput
	} from '$lib/types/domain';
	import type { Snippet } from 'svelte';
	import SessionForm from './SessionForm.svelte';

	type SessionActions = {
		openCreate: () => void;
		openEdit: (session: TimeSession) => void;
		openDelete: (session: TimeSession) => void;
	};

	let { children }: { children: Snippet<[SessionActions]> } = $props();

	const sessionStore = useSession();
	let formMode = $state<{ kind: 'create' } | { kind: 'edit'; session: TimeSession } | null>(null);
	let deleteTarget = $state<TimeSession | null>(null);
	const pending = $derived(sessionStore.pendingAction === 'session');

	function openCreate() {
		formMode = { kind: 'create' };
	}

	function openEdit(session: TimeSession) {
		formMode = { kind: 'edit', session };
	}

	function openDelete(session: TimeSession) {
		deleteTarget = session;
	}

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

{@render children({ openCreate, openEdit, openDelete })}

<Dialog
	open={formMode != null}
	title={formMode?.kind === 'edit' ? m.logs_form_edit() : m.logs_form_new()}
	onclose={() => (formMode = null)}
	size="lg"
>
	{#snippet children({ close })}
		{#if formMode}
			{#key formMode.kind === 'edit' ? formMode.session.id : 'create'}
				<SessionForm
					mode={formMode.kind}
					session={formMode.kind === 'edit' ? formMode.session : undefined}
					{pending}
					onsubmit={formMode.kind === 'create' ? saveCreate : saveEdit}
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
	title={m.logs_delete_title()}
	message={m.logs_delete_message({ note: deleteTarget?.note ?? '' })}
	confirmLabel={m.logs_delete()}
	destructive
	onconfirm={confirmDelete}
	oncancel={() => (deleteTarget = null)}
/>
