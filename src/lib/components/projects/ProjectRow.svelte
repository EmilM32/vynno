<script lang="ts">
	import { resolve } from '$app/paths';
	import { m } from '$lib/paraglide/messages.js';
	import Button from '$lib/components/ui/Button.svelte';
	import Chip from '$lib/components/ui/Chip.svelte';
	import ColorDot from '$lib/components/ui/ColorDot.svelte';
	import IconButton from '$lib/components/ui/IconButton.svelte';
	import type { Project } from '$lib/types/domain';
	import { formatSessionCount } from './session-count';

	interface Props {
		project: Project;
		/** `undefined` until the lazy count loads. */
		sessionCount: number | undefined;
		canArchive: boolean;
		canDelete: boolean;
		busy?: boolean;
		onedit: () => void;
		onarchive: () => void;
		onrestore: () => void;
		ondelete: () => void;
		/** Overflow open, or hover/focus of the row actions — prefetch one session count. */
		onprefetch?: () => void;
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
		ondelete,
		onprefetch
	}: Props = $props();

	const archived = $derived(Boolean(project.isArchived));
	const sessionLabel = $derived(formatSessionCount(sessionCount));
	const deleteReason = $derived(
		sessionCount != null && sessionCount > 0
			? m.projects_cannot_delete_has_sessions()
			: !archived && !canArchive
				? m.projects_cannot_delete_last()
				: sessionCount == null
					? m.projects_cannot_delete_checking()
					: m.projects_cannot_delete_last()
	);

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

	function prefetch() {
		onprefetch?.();
	}

	function toggleMore(e: MouseEvent) {
		e.stopPropagation();
		moreOpen = !moreOpen;
		if (moreOpen) prefetch();
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
						><bdi>{project.name}</bdi></span
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
				<!-- Unknown count keeps the line height but shows nothing (EMI-79). -->
				<p
					class="mt-0.5 font-mono text-code-label text-on-surface-variant"
					data-testid="project-session-count"
				>
					{#if sessionLabel}{sessionLabel}{:else}&nbsp;{/if}
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

	<div
		class="flex items-center gap-1.5 sm:hidden"
		role="group"
		onpointerenter={prefetch}
		onfocusin={prefetch}
	>
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

	<div
		class="hidden flex-wrap items-center gap-1.5 sm:flex sm:shrink-0"
		role="group"
		onpointerenter={prefetch}
		onfocusin={prefetch}
	>
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
			{deleteReason}
		</span>
	{/if}
</li>
