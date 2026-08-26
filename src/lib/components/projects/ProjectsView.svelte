<script lang="ts">
	import { onMount } from 'svelte';
	import PageHeader from '$lib/components/shell/PageHeader.svelte';
	import Banner from '$lib/components/ui/Banner.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ConfirmDialog from '$lib/components/ui/ConfirmDialog.svelte';
	import Dialog from '$lib/components/ui/Dialog.svelte';
	import { m } from '$lib/paraglide/messages.js';
	import { useSession } from '$lib/stores/session.svelte';
	import type { Project } from '$lib/types/domain';
	import ProjectForm from './ProjectForm.svelte';
	import ProjectRow from './ProjectRow.svelte';

	const sessionStore = useSession();

	type Tab = 'active' | 'archived';
	type FormMode = { kind: 'create' } | { kind: 'edit'; project: Project } | null;

	let tab = $state<Tab>('active');
	let formMode = $state<FormMode>(null);
	let deleteTarget = $state<Project | null>(null);

	const activeList = $derived(sessionStore.allProjects.filter((p) => !p.isArchived));
	const archivedList = $derived(sessionStore.allProjects.filter((p) => p.isArchived));
	const visible = $derived(tab === 'active' ? activeList : archivedList);

	function openCreate() {
		sessionStore.clearError();
		formMode = { kind: 'create' };
	}

	function openEdit(project: Project) {
		sessionStore.clearError();
		formMode = { kind: 'edit', project };
		tab = project.isArchived ? 'archived' : 'active';
	}

	function closeForm() {
		formMode = null;
	}

	async function onFormSubmit(values: { name: string; color: string; code: string }) {
		if (formMode?.kind === 'create') {
			const created = await sessionStore.createProject({
				name: values.name,
				color: values.color,
				code: values.code || undefined
			});
			if (created) {
				formMode = null;
				tab = 'active';
			}
			return;
		}
		if (formMode?.kind === 'edit') {
			const updated = await sessionStore.updateProject(formMode.project.id, {
				name: values.name,
				color: values.color,
				code: values.code.trim() ? values.code : null
			});
			if (updated) formMode = null;
		}
	}

	function requestDelete(project: Project) {
		sessionStore.clearError();
		deleteTarget = project;
	}

	async function confirmDelete() {
		if (!deleteTarget) return;
		const ok = await sessionStore.deleteProject(deleteTarget.id);
		if (ok) deleteTarget = null;
	}

	function cancelDelete() {
		deleteTarget = null;
	}

	function canDelete(project: Project): boolean {
		const count = sessionStore.countSessionsForProject(project.id);
		if (count == null || count > 0) return false;
		if (!project.isArchived) return sessionStore.canArchiveOrDeleteActive(project.id);
		return true;
	}

	onMount(() => {
		void sessionStore.loadSessionCounts();
	});

	function onTabListKey(e: KeyboardEvent) {
		if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
			e.preventDefault();
			tab = tab === 'active' ? 'archived' : 'active';
			queueMicrotask(() => {
				document.getElementById(tab === 'active' ? 'tab-active' : 'tab-archived')?.focus();
			});
		} else if (e.key === 'Home') {
			e.preventDefault();
			tab = 'active';
			queueMicrotask(() => document.getElementById('tab-active')?.focus());
		} else if (e.key === 'End') {
			e.preventDefault();
			tab = 'archived';
			queueMicrotask(() => document.getElementById('tab-archived')?.focus());
		}
	}
</script>

<div
	class="mx-auto flex w-full max-w-2xl flex-col gap-6 md:mx-0 md:max-w-none"
	data-testid="page-view"
>
	<PageHeader title={m.projects_title()} description={m.projects_subtitle()}>
		{#snippet actions()}
			<Button variant="primary" class="shrink-0" onclick={openCreate} data-testid="new-project">
				{m.projects_new()}
			</Button>
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

	<div
		class="flex gap-1 rounded-DEFAULT border border-outline-variant bg-surface-container p-1"
		role="tablist"
		tabindex="-1"
		aria-label={m.projects_status_aria()}
		onkeydown={onTabListKey}
	>
		<Button
			variant="tab"
			size="sm"
			selected={tab === 'active'}
			class="flex-1"
			role="tab"
			aria-selected={tab === 'active'}
			aria-controls="projects-panel"
			id="tab-active"
			tabindex={tab === 'active' ? 0 : -1}
			onclick={() => (tab = 'active')}
		>
			{m.projects_tab_active()}
			<span class="ml-1 font-mono text-code-label">({activeList.length})</span>
		</Button>
		<Button
			variant="tab"
			size="sm"
			selected={tab === 'archived'}
			class="flex-1"
			role="tab"
			aria-selected={tab === 'archived'}
			aria-controls="projects-panel"
			id="tab-archived"
			tabindex={tab === 'archived' ? 0 : -1}
			onclick={() => (tab = 'archived')}
		>
			{m.projects_tab_archived()}
			<span class="ml-1 font-mono text-code-label">({archivedList.length})</span>
		</Button>
	</div>

	<div
		id="projects-panel"
		role="tabpanel"
		aria-labelledby={tab === 'active' ? 'tab-active' : 'tab-archived'}
	>
		{#if visible.length === 0}
			<div
				class="rounded-lg border border-dashed border-outline-variant bg-surface-container/40 px-4 py-10 text-center"
			>
				<p class="text-body-md text-on-surface-variant">
					{tab === 'active' ? m.projects_empty_active() : m.projects_empty_archived()}
				</p>
				{#if tab === 'active'}
					<Button variant="link" size="xs" class="mt-3" onclick={openCreate}>
						{m.projects_create_one()}
					</Button>
				{/if}
			</div>
		{:else}
			<ul class="flex flex-col gap-2" data-testid="project-list">
				{#each visible as project (project.id)}
					{const count = $derived(sessionStore.countSessionsForProject(project.id) ?? 0)}
					<ProjectRow
						{project}
						sessionCount={count}
						canArchive={sessionStore.canArchiveOrDeleteActive(project.id)}
						canDelete={canDelete(project)}
						busy={sessionStore.pendingAction === 'project'}
						onedit={() => openEdit(project)}
						onarchive={() => void sessionStore.archiveProject(project.id)}
						onrestore={async () => {
							if (await sessionStore.restoreProject(project.id)) tab = 'active';
						}}
						ondelete={() => requestDelete(project)}
					/>
				{/each}
			</ul>
		{/if}
	</div>
</div>

<Dialog
	open={formMode != null}
	title={formMode?.kind === 'edit' ? m.projects_form_edit() : m.projects_form_new()}
	onclose={closeForm}
	size="lg"
>
	{#snippet children({ close })}
		{#if formMode}
			{#key formMode.kind === 'edit' ? formMode.project.id : 'create'}
				<ProjectForm
					mode={formMode.kind}
					project={formMode.kind === 'edit' ? formMode.project : undefined}
					pending={sessionStore.pendingAction === 'project'}
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
	title={m.projects_delete_title()}
	message={deleteTarget ? m.projects_delete_message({ name: deleteTarget.name }) : ''}
	confirmLabel={m.projects_delete()}
	destructive
	onconfirm={confirmDelete}
	oncancel={cancelDelete}
/>
