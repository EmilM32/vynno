<script lang="ts">
	import PageHeader from '$lib/components/shell/PageHeader.svelte';
	import ConfirmDialog from '$lib/components/ui/ConfirmDialog.svelte';
	import { m } from '$lib/paraglide/messages.js';
	import { sessionStore } from '$lib/stores/session.svelte';
	import type { Project } from '$lib/types/domain';
	import ProjectForm from './ProjectForm.svelte';
	import ProjectRow from './ProjectRow.svelte';

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

	function onFormSubmit(values: { name: string; color: string; code: string }) {
		if (formMode?.kind === 'create') {
			const created = sessionStore.createProject({
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
			const updated = sessionStore.updateProject(formMode.project.id, {
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

	function confirmDelete() {
		if (!deleteTarget) return;
		const ok = sessionStore.deleteProject(deleteTarget.id);
		if (ok) deleteTarget = null;
	}

	function cancelDelete() {
		deleteTarget = null;
	}

	function canDelete(project: Project): boolean {
		const count = sessionStore.countSessionsForProject(project.id);
		if (count > 0) return false;
		if (!project.isArchived) return sessionStore.canArchiveOrDeleteActive(project.id);
		return true;
	}

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
			<button
				type="button"
				class="press focus-ring shrink-0 rounded bg-primary px-4 py-2 font-mono text-code-data font-medium text-on-primary hover:bg-primary-container"
				onclick={openCreate}
				data-testid="new-project"
			>
				{m.projects_new()}
			</button>
		{/snippet}
	</PageHeader>

	{#if sessionStore.error}
		<div
			class="rounded border border-error/40 bg-error-container/15 px-3 py-2 text-body-sm text-error"
			role="alert"
		>
			<div class="flex items-start justify-between gap-3">
				<span>{sessionStore.error}</span>
				<button
					type="button"
					class="focus-ring shrink-0 text-body-sm underline"
					onclick={() => sessionStore.clearError()}
				>
					{m.common_dismiss_capital()}
				</button>
			</div>
		</div>
	{/if}

	{#if formMode}
		{#key formMode.kind === 'edit' ? formMode.project.id : 'create'}
			<ProjectForm
				mode={formMode.kind}
				project={formMode.kind === 'edit' ? formMode.project : undefined}
				onsubmit={onFormSubmit}
				oncancel={closeForm}
			/>
		{/key}
	{/if}

	<div
		class="flex gap-1 rounded-DEFAULT border border-outline-variant bg-surface-container p-1"
		role="tablist"
		tabindex="-1"
		aria-label={m.projects_status_aria()}
		onkeydown={onTabListKey}
	>
		<button
			type="button"
			role="tab"
			aria-selected={tab === 'active'}
			aria-controls="projects-panel"
			id="tab-active"
			tabindex={tab === 'active' ? 0 : -1}
			class="focus-ring flex-1 rounded px-3 py-1.5 text-body-sm font-medium transition-colors {tab ===
			'active'
				? 'bg-surface-container-high text-primary'
				: 'text-on-surface-variant hover:text-on-surface'}"
			onclick={() => (tab = 'active')}
		>
			{m.projects_tab_active()}
			<span class="ml-1 font-mono text-code-label">({activeList.length})</span>
		</button>
		<button
			type="button"
			role="tab"
			aria-selected={tab === 'archived'}
			aria-controls="projects-panel"
			id="tab-archived"
			tabindex={tab === 'archived' ? 0 : -1}
			class="focus-ring flex-1 rounded px-3 py-1.5 text-body-sm font-medium transition-colors {tab ===
			'archived'
				? 'bg-surface-container-high text-primary'
				: 'text-on-surface-variant hover:text-on-surface'}"
			onclick={() => (tab = 'archived')}
		>
			{m.projects_tab_archived()}
			<span class="ml-1 font-mono text-code-label">({archivedList.length})</span>
		</button>
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
					<button
						type="button"
						class="focus-ring mt-3 text-body-sm text-primary underline"
						onclick={openCreate}
					>
						{m.projects_create_one()}
					</button>
				{/if}
			</div>
		{:else}
			<ul class="flex flex-col gap-2" data-testid="project-list">
				{#each visible as project (project.id)}
					{const count = $derived(sessionStore.countSessionsForProject(project.id))}
					<ProjectRow
						{project}
						sessionCount={count}
						canArchive={sessionStore.canArchiveOrDeleteActive(project.id)}
						canDelete={canDelete(project)}
						onedit={() => openEdit(project)}
						onarchive={() => sessionStore.archiveProject(project.id)}
						onrestore={() => {
							if (sessionStore.restoreProject(project.id)) tab = 'active';
						}}
						ondelete={() => requestDelete(project)}
					/>
				{/each}
			</ul>
		{/if}
	</div>
</div>

<ConfirmDialog
	open={deleteTarget != null}
	title={m.projects_delete_title()}
	message={deleteTarget ? m.projects_delete_message({ name: deleteTarget.name }) : ''}
	confirmLabel={m.projects_delete()}
	destructive
	onconfirm={confirmDelete}
	oncancel={cancelDelete}
/>
