<script lang="ts">
	import { resolve } from '$app/paths';
	import { m } from '$lib/paraglide/messages.js';
	import Button from '$lib/components/ui/Button.svelte';
	import Chip from '$lib/components/ui/Chip.svelte';
	import ColorDot from '$lib/components/ui/ColorDot.svelte';
	import IconButton from '$lib/components/ui/IconButton.svelte';
	import type { Project } from '$lib/types/domain';

	interface Props {
		project: Project;
		sessionCount: number;
		canArchive: boolean;
		canDelete: boolean;
		busy?: boolean;
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
		busy = false,
		onedit,
		onarchive,
		onrestore,
		ondelete
	}: Props = $props();

	/** one / few (2–4, excluding 12–14) / other — covers Polish and English. */
	function sessionCountWord(n: number): string {
		const abs = Math.abs(n);
		if (abs === 1) return m.projects_session_one();
		const mod10 = abs % 10;
		const mod100 = abs % 100;
		if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
			return m.projects_session_few();
		}
		return m.projects_session_other();
	}

	const archived = $derived(Boolean(project.isArchived));
	const sessionWord = $derived(sessionCountWord(sessionCount));

	let moreOpen = $state(false);
	let rowEl: HTMLElement | undefined = $state();
	const menuId = $derived(`${project.id}-row-menu`);

	function bindRow(node: HTMLElement) {
		rowEl = node;
		return () => {
			if (rowEl === node) rowEl = undefined;
		};
	}

	function closeMore() {
		moreOpen = false;
	}

	function toggleMore(e: MouseEvent) {
		e.stopPropagation();
		moreOpen = !moreOpen;
	}

	function onWindowPointer(e: PointerEvent) {
		if (!moreOpen) return;
		const t = e.target;
		if (t instanceof Node && rowEl?.contains(t)) return;
		closeMore();
	}

	function onWindowKey(e: KeyboardEvent) {
		if (!moreOpen) return;
		if (e.key === 'Escape') {
			e.preventDefault();
			closeMore();
		}
	}

	function runAndClose(fn: () => void) {
		closeMore();
		fn();
	}
</script>

<svelte:window onpointerdown={onWindowPointer} onkeydown={onWindowKey} />

<li
	{@attach bindRow}
	class="relative flex flex-col gap-3 rounded-DEFAULT border border-outline-variant bg-surface-container-low p-3 sm:flex-row sm:items-center sm:justify-between"
	data-testid="project-row"
	data-project-id={project.id}
>
	<div class="flex min-w-0 items-start gap-3">
		<a
			href={resolve(`/projects/${encodeURIComponent(project.id)}`)}
			class="focus-ring flex min-w-0 items-start gap-3 rounded-sm"
			data-testid="project-open"
		>
			<ColorDot color={project.color} size="md" class="mt-0.5" />
			<div class="min-w-0">
				<div class="flex flex-wrap items-center gap-2">
					<span class="text-body-md font-medium text-on-surface hover:text-primary"
						>{project.name}</span
					>
					{#if project.code}
						<Chip>{project.code}</Chip>
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
		</a>
	</div>

	{#snippet editBtn()}
		<Button
			variant="secondary"
			size="sm"
			onclick={() => {
				closeMore();
				onedit();
			}}
			disabled={busy}
		>
			{m.projects_edit()}
		</Button>
	{/snippet}
	{#snippet restoreBtn()}
		<Button
			variant="secondary"
			size="sm"
			onclick={() => {
				closeMore();
				onrestore();
			}}
			disabled={busy}
		>
			{m.projects_restore()}
		</Button>
	{/snippet}
	{#snippet archiveBtn(inMenu: boolean)}
		<Button
			variant="secondary"
			size="sm"
			class={inMenu ? 'w-full' : undefined}
			role={inMenu ? 'menuitem' : undefined}
			onclick={() => (inMenu ? runAndClose(onarchive) : onarchive())}
			disabled={!canArchive || busy}
			aria-describedby={!canArchive ? `${project.id}-archive-reason` : undefined}
		>
			{m.projects_archive()}
		</Button>
	{/snippet}
	{#snippet deleteBtn(inMenu: boolean)}
		<Button
			variant="danger"
			size="sm"
			class={inMenu ? 'w-full' : undefined}
			role={inMenu ? 'menuitem' : undefined}
			onclick={() => (inMenu ? runAndClose(ondelete) : ondelete())}
			disabled={!canDelete || busy}
			aria-describedby={!canDelete ? `${project.id}-delete-reason` : undefined}
		>
			{m.projects_delete()}
		</Button>
	{/snippet}

	<div class="flex items-center gap-1.5 sm:hidden">
		{#if archived}
			{@render restoreBtn()}
		{:else}
			{@render editBtn()}
		{/if}
		<div class="relative">
			<IconButton
				icon="more_horiz"
				label={m.project_more_actions()}
				variant="bordered"
				size="sm"
				aria-expanded={moreOpen}
				aria-haspopup="menu"
				aria-controls={moreOpen ? menuId : undefined}
				data-testid="project-row-more"
				onclick={toggleMore}
			/>
			{#if moreOpen}
				<div
					id={menuId}
					role="menu"
					aria-label={m.project_more_actions()}
					class="absolute top-full left-0 z-20 mt-1 flex min-w-36 flex-col gap-1 rounded-DEFAULT border border-outline-variant bg-surface-container p-1 shadow-xl"
				>
					{#if !archived}
						{@render archiveBtn(true)}
					{/if}
					{@render deleteBtn(true)}
				</div>
			{/if}
		</div>
	</div>

	<div class="hidden flex-wrap items-center gap-1.5 sm:flex sm:shrink-0">
		{#if archived}
			{@render restoreBtn()}
		{:else}
			{@render editBtn()}
			{@render archiveBtn(false)}
		{/if}
		{@render deleteBtn(false)}
	</div>
	{#if !archived && !canArchive}
		<span id={`${project.id}-archive-reason`} class="sr-only"
			>{m.projects_cannot_archive_last()}</span
		>
	{/if}
	{#if !canDelete}
		<span id={`${project.id}-delete-reason`} class="sr-only">
			{sessionCount > 0 ? m.projects_cannot_delete_has_sessions() : m.projects_cannot_delete_last()}
		</span>
	{/if}
</li>
