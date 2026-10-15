<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import ActivityChip from '$lib/components/ui/ActivityChip.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Chip from '$lib/components/ui/Chip.svelte';
	import ColorDot from '$lib/components/ui/ColorDot.svelte';
	import IconButton from '$lib/components/ui/IconButton.svelte';
	import { m } from '$lib/paraglide/messages.js';
	import { useSession } from '$lib/stores/session.svelte';
	import {
		formatLocalTime,
		formatStoppedDuration,
		formatTimeRange,
		sessionElapsedMs
	} from '$lib/time/duration';
	import type { TimeSession } from '$lib/types/domain';

	const sessionStore = useSession();

	let {
		session,
		hideProject = false,
		onedit,
		ondelete
	}: {
		session: TimeSession;
		hideProject?: boolean;
		onedit?: () => void;
		ondelete?: () => void;
	} = $props();

	const project = $derived(sessionStore.getProject(session.projectId));
	const activity = $derived(
		session.activityTypeId ? sessionStore.getActivityType(session.activityTypeId) : undefined
	);
	const duration = $derived(sessionElapsedMs(session));
	/** A live row reads "12:37 - now", not an open-ended "12:37 - …". */
	const range = $derived(
		session.endedAt
			? formatTimeRange(session.startedAt, session.endedAt, sessionStore.timeZone)
			: `${formatLocalTime(session.startedAt, sessionStore.timeZone)} - ${m.logs_until_now()}`
	);
	const canRestart = $derived(session.status === 'stopped');
	const busy = $derived(!!sessionStore.activeSession || sessionStore.busy);
	const archived = $derived(Boolean(project?.isArchived));
	const restartDisabled = $derived(busy || archived);

	async function restart() {
		const ok = await sessionStore.restartFromSession(session.id);
		if (ok) void goto(resolve('/timer'));
	}

	let noteExpanded = $state(false);
	let noteOverflows = $state(false);

	function watchOverflow(node: HTMLElement) {
		void session.note;
		const measure = () => {
			if (noteExpanded) return;
			noteOverflows =
				node.scrollWidth > node.clientWidth + 1 || node.scrollHeight > node.clientHeight + 1;
		};
		measure();
		const ro = new ResizeObserver(measure);
		ro.observe(node);
		return () => ro.disconnect();
	}
	let moreOpen = $state(false);
	let menuEl: HTMLElement | undefined;
	const menuId = $derived(`${session.id}-log-menu`);

	function bindMenu(node: HTMLElement) {
		menuEl = node;
		return () => {
			if (menuEl === node) menuEl = undefined;
		};
	}

	function onWindowPointer(e: PointerEvent) {
		if (!moreOpen) return;
		if (e.target instanceof Node && menuEl?.contains(e.target)) return;
		moreOpen = false;
	}

	function onWindowKey(e: KeyboardEvent) {
		if (moreOpen && e.key === 'Escape') {
			e.preventDefault();
			moreOpen = false;
		}
	}
</script>

<svelte:window onpointerdown={onWindowPointer} onkeydown={onWindowKey} />

{#snippet projectIdentity()}
	<div class="flex min-w-0 items-center gap-2">
		<ColorDot color={project?.color ?? '#64748b'} />
		<span class="truncate text-body-sm text-on-surface" title={project?.name}
			><bdi>{project?.name ?? m.common_unknown()}</bdi></span
		>
	</div>
{/snippet}

{#snippet timeCluster(className: string, durationClass: string)}
	<div class="flex shrink-0 items-center gap-3 {className}">
		<div class="font-mono text-code-data whitespace-nowrap text-on-surface-variant">
			{range}
		</div>
		<div class="font-mono text-code-data whitespace-nowrap text-on-surface {durationClass}">
			{formatStoppedDuration(duration)}
		</div>
	</div>
{/snippet}

<!-- Container, not viewport: the one-line row needs ~56rem of its own (EMI-270). -->
<div class="@container min-w-0">
	<div
		class="group flex min-w-0 flex-col gap-2 rounded-DEFAULT border border-outline-variant bg-surface-container-low p-3 transition-colors hover:border-outline hover:bg-surface-container @4xl:flex-row @4xl:items-center @4xl:gap-6"
		data-testid="log-row"
	>
		<!-- Stacked: project and duration on top; the clock range moves down beside the actions,
		     so a long project name keeps its room (EMI-269). -->
		<div class="flex min-w-0 items-center justify-between gap-3 @4xl:hidden">
			{#if !hideProject}
				{@render projectIdentity()}
			{/if}
			<div
				class="ml-auto shrink-0 font-mono text-code-data whitespace-nowrap text-on-surface tabular-nums"
			>
				{formatStoppedDuration(duration)}
			</div>
		</div>

		{#if !hideProject}
			<!-- Capped so a long name truncates instead of pushing note, time and actions out (EMI-76). -->
			<div class="hidden max-w-[25%] min-w-30 shrink-0 @4xl:flex">
				{@render projectIdentity()}
			</div>
		{/if}

		<div class="min-w-0 @4xl:flex-1">
			<div class="flex min-w-0 items-start gap-1">
				<div
					class={[
						'min-w-0 flex-1 font-mono text-code-data text-on-surface-variant',
						noteExpanded ? 'wrap-break-word whitespace-normal' : 'truncate'
					]}
					title={session.note}
					{@attach watchOverflow}
				>
					&gt; <bdi>{session.note}</bdi>
				</div>
				{#if noteExpanded || noteOverflows}
					<IconButton
						icon={noteExpanded ? 'expand_less' : 'expand_more'}
						label={noteExpanded ? m.logs_note_collapse() : m.logs_note_expand()}
						size="sm"
						aria-expanded={noteExpanded}
						data-testid="log-note-expand"
						onclick={() => (noteExpanded = !noteExpanded)}
					/>
				{/if}
			</div>
			{#if session.ticketId}
				<div class="mt-1.5 flex min-w-0 flex-wrap items-center gap-1.5">
					<Chip variant="ticket" title={session.ticketId}>{session.ticketId}</Chip>
				</div>
			{/if}
		</div>

		<div class="hidden min-w-0 items-center gap-4 @4xl:flex">
			{#if activity}
				<span class="flex max-w-40 min-w-0"><ActivityChip type={activity} /></span>
			{/if}
			{@render timeCluster('', 'min-w-20 text-right text-code-display')}
		</div>

		<div class="flex min-w-0 shrink-0 items-center justify-end gap-1.5">
			<span
				class="mr-auto font-mono text-code-label whitespace-nowrap text-on-surface-variant tabular-nums @4xl:hidden"
			>
				{range}
			</span>
			{#if canRestart || onedit || ondelete}
				{#if canRestart}
					<span
						class="inline-flex opacity-100 transition-opacity group-focus-within:opacity-100 @4xl:can-hover:opacity-0 @4xl:can-hover:group-hover:opacity-100"
					>
						<IconButton
							icon="play_arrow"
							label={m.logs_restart_aria({ note: session.note })}
							size="sm"
							disabled={restartDisabled}
							onclick={() => void restart()}
							title={busy
								? m.timer_stop_first()
								: archived
									? m.error_project_archived()
									: m.logs_restart_task()}
							data-testid="log-row-restart"
						/>
					</span>
				{/if}
				{#if onedit}
					<Button variant="secondary" size="xs" onclick={onedit}>
						{m.logs_edit()}
					</Button>
				{/if}
				{#if ondelete}
					<span class="hidden @4xl:contents">
						<Button variant="danger" size="xs" onclick={ondelete}>
							{m.logs_delete()}
						</Button>
					</span>
					<!-- Stacked rows: Delete waits behind "…" so a thumb cannot hit it by accident (EMI-269). -->
					<div class="relative @4xl:hidden" {@attach bindMenu}>
						<IconButton
							icon="more_horiz"
							label={m.project_more_actions()}
							variant="bordered"
							size="sm"
							aria-expanded={moreOpen}
							aria-haspopup="menu"
							aria-controls={moreOpen ? menuId : undefined}
							data-testid="log-row-more"
							onclick={() => (moreOpen = !moreOpen)}
						/>
						{#if moreOpen}
							<div
								id={menuId}
								role="menu"
								aria-label={m.project_more_actions()}
								class="absolute top-full right-0 z-20 mt-1 flex min-w-32 flex-col gap-1 rounded-DEFAULT border border-outline-variant bg-surface-container p-1 shadow-xl"
							>
								<Button
									variant="danger"
									size="sm"
									class="w-full"
									role="menuitem"
									onclick={() => {
										moreOpen = false;
										ondelete();
									}}
								>
									{m.logs_delete()}
								</Button>
							</div>
						{/if}
					</div>
				{/if}
			{/if}
		</div>
	</div>
</div>
