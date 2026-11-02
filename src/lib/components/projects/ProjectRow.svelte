<script lang="ts">
	import { resolve } from '$app/paths';
	import { m } from '$lib/paraglide/messages.js';
	import Button from '$lib/components/ui/Button.svelte';
	import Chip from '$lib/components/ui/Chip.svelte';
	import ColorDot from '$lib/components/ui/ColorDot.svelte';
	import Menu from '$lib/components/ui/Menu.svelte';
	import MenuItem from '$lib/components/ui/MenuItem.svelte';
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

	const archiveReasonId = $derived(!canArchive ? `${project.id}-archive-reason` : undefined);
	const deleteReasonId = $derived(!canDelete ? `${project.id}-delete-reason` : undefined);

	let moreOpen = $state(false);

	function bindRow(node: HTMLElement) {
		// Touch has no hover to prefetch on, so the count would never load: fetch it once the row
		// scrolls into view instead. Still lazy, still one request per row actually seen.
		let io: IntersectionObserver | undefined;
		if (window.matchMedia('(hover: none)').matches && 'IntersectionObserver' in window) {
			io = new IntersectionObserver((entries) => {
				if (entries.some((e) => e.isIntersecting)) {
					prefetch();
					io?.disconnect();
				}
			});
			io.observe(node);
		}
		return () => io?.disconnect();
	}

	function closeMore() {
		moreOpen = false;
	}

	function prefetch() {
		onprefetch?.();
	}
</script>

<!-- The whole card opens the dossier (stretched link); the action groups sit above it (EMI-269). -->
<li
	{@attach bindRow}
	class="relative flex items-center justify-between gap-3 rounded-DEFAULT border border-outline-variant bg-surface-container-low p-3"
	data-testid="project-row"
	data-project-id={project.id}
>
	<div class="flex min-w-0 items-start gap-3">
		<a
			href={resolve(`/projects/${encodeURIComponent(project.id)}`)}
			class="focus-ring flex min-w-0 items-start gap-3 rounded-sm after:absolute after:inset-0 after:content-['']"
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
	{#snippet archiveBtn()}
		<Button
			variant="secondary"
			size="sm"
			onclick={onarchive}
			disabled={!canArchive || busy}
			aria-describedby={archiveReasonId}
		>
			{m.projects_archive()}
		</Button>
	{/snippet}
	{#snippet deleteBtn()}
		<Button
			variant="danger"
			size="sm"
			onclick={ondelete}
			disabled={!canDelete || busy}
			aria-describedby={deleteReasonId}
		>
			{m.projects_delete()}
		</Button>
	{/snippet}

	<div
		class="relative flex shrink-0 items-center gap-1.5 sm:hidden {moreOpen ? 'z-30' : 'z-10'}"
		role="group"
		onpointerenter={prefetch}
		onfocusin={prefetch}
	>
		{#if archived}
			{@render restoreBtn()}
		{:else}
			{@render editBtn()}
		{/if}
		<Menu
			label={m.project_more_actions()}
			bind:open={moreOpen}
			onopen={prefetch}
			testid="project-row-more"
		>
			{#if !archived}
				<MenuItem
					onselect={onarchive}
					disabled={!canArchive || busy}
					aria-describedby={archiveReasonId}
				>
					{m.projects_archive()}
				</MenuItem>
			{/if}
			<MenuItem
				tone="danger"
				onselect={ondelete}
				disabled={!canDelete || busy}
				aria-describedby={deleteReasonId}
			>
				{m.projects_delete()}
			</MenuItem>
		</Menu>
	</div>

	<div
		class="relative z-10 hidden flex-wrap items-center gap-1.5 sm:flex sm:shrink-0"
		role="group"
		onpointerenter={prefetch}
		onfocusin={prefetch}
	>
		{#if archived}
			{@render restoreBtn()}
		{:else}
			{@render editBtn()}
			{@render archiveBtn()}
		{/if}
		{@render deleteBtn()}
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
