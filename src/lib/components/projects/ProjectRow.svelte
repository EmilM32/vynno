<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import type { Project } from '$lib/types/domain';

	interface Props {
		project: Project;
		sessionCount: number;
		canArchive: boolean;
		canDelete: boolean;
		onedit: () => void;
		onarchive: () => void;
		onrestore: () => void;
		ondelete: () => void;
	}

	let {
		project,
		sessionCount,
		canArchive,
		canDelete,
		onedit,
		onarchive,
		onrestore,
		ondelete
	}: Props = $props();

	const archived = $derived(Boolean(project.isArchived));
	const sessionWord = $derived(
		sessionCount === 1 ? m.projects_session_one() : m.projects_session_other()
	);
</script>

<li
	class="flex flex-col gap-3 rounded-DEFAULT border border-outline-variant bg-surface-container-low p-3 sm:flex-row sm:items-center sm:justify-between"
	data-testid="project-row"
	data-project-id={project.id}
>
	<div class="flex min-w-0 items-start gap-3">
		<div
			class="mt-0.5 h-3.5 w-3.5 shrink-0 rounded-sm"
			style:background-color={project.color}
			aria-hidden="true"
		></div>
		<div class="min-w-0">
			<div class="flex flex-wrap items-center gap-2">
				<span class="text-body-md font-medium text-on-surface">{project.name}</span>
				{#if project.code}
					<span
						class="rounded bg-surface-container-high px-1.5 py-0.5 font-mono text-code-label text-on-surface-variant"
					>
						{project.code}
					</span>
				{/if}
				{#if archived}
					<span class="font-mono text-[10px] tracking-wide text-on-surface-variant uppercase"
						>{m.projects_archived_badge()}</span
					>
				{/if}
			</div>
			<p class="mt-0.5 font-mono text-code-label text-on-surface-variant">
				{sessionCount}
				{sessionWord}
			</p>
		</div>
	</div>

	<div class="flex flex-wrap items-center gap-1.5 sm:shrink-0">
		{#if !archived}
			<button
				type="button"
				class="focus-ring rounded border border-outline-variant px-2.5 py-1.5 text-body-sm text-on-surface transition-colors hover:border-outline hover:bg-surface-variant"
				onclick={onedit}
			>
				{m.projects_edit()}
			</button>
			<button
				type="button"
				class="focus-ring rounded border border-outline-variant px-2.5 py-1.5 text-body-sm text-on-surface transition-colors hover:border-outline hover:bg-surface-variant disabled:cursor-not-allowed disabled:opacity-40"
				onclick={onarchive}
				disabled={!canArchive}
				aria-describedby={!canArchive ? `${project.id}-archive-reason` : undefined}
			>
				{m.projects_archive()}
			</button>
			{#if !canArchive}
				<span id={`${project.id}-archive-reason`} class="sr-only"
					>{m.projects_cannot_archive_last()}</span
				>
			{/if}
		{:else}
			<button
				type="button"
				class="focus-ring rounded border border-outline-variant px-2.5 py-1.5 text-body-sm text-on-surface transition-colors hover:border-outline hover:bg-surface-variant"
				onclick={onrestore}
			>
				{m.projects_restore()}
			</button>
		{/if}
		<button
			type="button"
			class="focus-ring rounded border border-error/40 px-2.5 py-1.5 text-body-sm text-error transition-colors hover:bg-error-container/20 disabled:cursor-not-allowed disabled:opacity-40"
			onclick={ondelete}
			disabled={!canDelete}
			aria-describedby={!canDelete ? `${project.id}-delete-reason` : undefined}
		>
			{m.projects_delete()}
		</button>
		{#if !canDelete}
			<span id={`${project.id}-delete-reason`} class="sr-only">
				{sessionCount > 0
					? m.projects_cannot_delete_has_sessions()
					: m.projects_cannot_delete_last()}
			</span>
		{/if}
	</div>
</li>
