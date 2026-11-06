<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import Button from '$lib/components/ui/Button.svelte';
	import ColorDot from '$lib/components/ui/ColorDot.svelte';
	import IconButton from '$lib/components/ui/IconButton.svelte';
	import { m } from '$lib/paraglide/messages.js';
	import { useSession } from '$lib/stores/session.svelte';
	import {
		formatClock,
		formatLocalTime,
		sessionElapsedMs,
		weekdayDayMonthShort
	} from '$lib/time/duration';
	import type { TimeSession } from '$lib/types/domain';
	import { untrack } from 'svelte';

	let { class: className }: { class?: string } = $props();

	const sessionStore = useSession();

	const logs = $derived(sessionStore.recentLogs);
	const busy = $derived(!!sessionStore.activeSession || sessionStore.busy);

	async function restart(sessionId: string) {
		const ok = await sessionStore.restartFromSession(sessionId);
		if (ok) {
			void goto(resolve('/timer'));
		}
	}

	/** Rows a phone shows; the rest is one tap away in Logs. */
	const MOBILE_ROWS = 3;

	// Pointer state stays out of reactivity: it changes on every pointermove (adapt.md §2).
	let listEl: HTMLDivElement | undefined = $state();
	let frameEl: HTMLDivElement | undefined = $state();
	let shownId: string | null = null;

	// The readout is the only thing Svelte hears about, and only when the row changes.
	let readoutLog = $state<TimeSession | null>(null);
	let readoutOn = $state(false);

	const readoutRange = $derived(
		readoutLog
			? `${formatLocalTime(readoutLog.startedAt, sessionStore.timeZone)}–${
					readoutLog.endedAt ? formatLocalTime(readoutLog.endedAt, sessionStore.timeZone) : '…'
				}`
			: ''
	);
	const readoutDay = $derived(
		readoutLog
			? weekdayDayMonthShort(new Date(readoutLog.startedAt), undefined, sessionStore.timeZone)
			: ''
	);

	function rowsOf(): HTMLElement[] {
		return listEl ? [...listEl.querySelectorAll<HTMLElement>('[data-row]')] : [];
	}

	/** Put the frame on `row`. It glides only from row to row under the pointer. */
	function show(row: HTMLElement, glide: boolean) {
		if (!frameEl || !listEl) return;
		const id = row.dataset.id ?? null;
		const instant = !glide || shownId === null;
		// The restart icon fades on the frame's own curve, so it lands with the frame.
		listEl.dataset.glide = instant ? 'off' : 'on';
		frameEl.classList.toggle('rl-instant', instant);
		frameEl.style.height = `${row.offsetHeight}px`;
		frameEl.style.transform = `translateY(${row.offsetTop}px)`;
		frameEl.style.opacity = '1';
		if (instant) {
			void frameEl.offsetHeight; // commit the jump before the glide comes back
			frameEl.classList.remove('rl-instant');
		}
		for (const r of rowsOf()) r.toggleAttribute('data-current', r === row);
		shownId = id;
		const log = logs.find((l) => l.id === id) ?? null;
		if (readoutLog?.id !== log?.id) readoutLog = log;
		if (!readoutOn) readoutOn = true;
	}

	function hide() {
		shownId = null;
		if (listEl) listEl.dataset.glide = 'off';
		if (frameEl) frameEl.style.opacity = '0';
		for (const r of rowsOf()) r.removeAttribute('data-current');
		if (readoutOn) readoutOn = false;
	}

	function onPointerMove(e: PointerEvent) {
		if (e.pointerType === 'touch') return;
		const row = (e.target as Element).closest<HTMLElement>('[data-row]');
		if (row && row.dataset.id !== shownId) show(row, true);
	}

	function onPointerLeave(e: PointerEvent) {
		if (e.pointerType === 'touch') return;
		if (listEl?.contains(document.activeElement) && document.activeElement !== listEl) return;
		hide();
	}

	function onFocusIn(e: FocusEvent) {
		const row = (e.target as Element).closest<HTMLElement>('[data-row]');
		if (row) show(row, false); // keyboard: straight to the row, no glide
	}

	function onFocusOut(e: FocusEvent) {
		const next = e.relatedTarget as Node | null;
		if (next && listEl?.contains(next)) return;
		if (listEl?.matches(':hover')) return;
		hide();
	}

	// New or removed rows shift every offset; drop the frame rather than point at the wrong row.
	$effect(() => {
		void logs;
		untrack(hide);
	});
</script>

<div
	class={[
		'flex flex-col overflow-hidden rounded-lg border border-outline-variant bg-surface-container md:h-75',
		className
	]}
>
	<div class="flex items-center justify-between gap-4 border-b border-outline-variant p-4">
		<h2 class="shrink-0 text-headline-md">{m.dashboard_recent_logs()}</h2>
		<!-- Pointer/focus readout for the highlighted row; the row itself already says it all. -->
		<p
			class={[
				'rl-readout hidden min-w-0 flex-1 truncate text-right font-mono text-body-sm tabular-nums md:block',
				readoutOn ? 'opacity-100' : 'opacity-0'
			]}
			aria-hidden="true"
		>
			<span class="text-primary">{m.dashboard_recent_logs_readout_key() + ': '}</span><span
				class="text-on-surface">{readoutRange}</span
			><span class="text-on-surface-variant">{' // ' + readoutDay}</span>
		</p>
		<Button variant="link" size="sm" href={resolve('/logs')} class="shrink-0">
			{m.dashboard_recent_logs_view_all()}
		</Button>
	</div>

	<!-- Phones: a few whole rows, no scroll box inside the page scroll (EMI-269). -->
	<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
	<div
		bind:this={listEl}
		class="no-scrollbar focus-ring relative flex min-h-0 flex-1 flex-col gap-1 p-2 md:overflow-y-auto"
		tabindex="0"
		role="region"
		aria-label={m.dashboard_recent_logs()}
		onpointermove={onPointerMove}
		onpointerleave={onPointerLeave}
		onfocusin={onFocusIn}
		onfocusout={onFocusOut}
	>
		{#if logs.length === 0}
			<p class="p-4 text-center text-body-sm text-on-surface-variant">
				{m.dashboard_no_completed()}
			</p>
		{:else}
			<!-- One frame for the whole list: it travels between rows instead of each row lighting up. -->
			<div
				bind:this={frameEl}
				class="rl-frame pointer-events-none absolute inset-x-2 top-0 rounded-DEFAULT border border-outline-variant/50 bg-surface-container-high opacity-0"
				aria-hidden="true"
			></div>

			{#each logs as log, i (log.id)}
				{const project = $derived(sessionStore.getProject(log.projectId))}
				{const duration = $derived(sessionElapsedMs(log))}
				<div
					data-row
					data-id={log.id}
					class="group relative flex items-center justify-between rounded-DEFAULT border border-transparent p-2 {i >=
					MOBILE_ROWS
						? 'max-md:hidden'
						: ''}"
				>
					<div class="flex min-w-0 items-center gap-3 overflow-hidden">
						<ColorDot color={project?.color ?? '#64748b'} />
						<div class="flex min-w-0 flex-col">
							<span class="truncate text-body-sm text-on-surface"><bdi>{log.note}</bdi></span>
							<span class="truncate text-body-sm text-on-surface-variant">
								<bdi>{project?.name ?? m.common_unknown()}</bdi>
							</span>
						</div>
					</div>
					<div class="flex shrink-0 items-center gap-2 pl-2">
						<span class="font-mono text-code-data text-on-surface tabular-nums">
							{formatClock(duration)}
						</span>
						<span
							class={[
								'rl-act inline-flex',
								busy
									? 'opacity-100'
									: 'opacity-100 md:can-hover:opacity-0 md:can-hover:group-focus-within:opacity-100 md:can-hover:group-data-current:opacity-100'
							]}
						>
							<IconButton
								icon="play_arrow"
								label={busy ? m.timer_stop_first() : m.dashboard_restart_aria({ note: log.note })}
								size="sm"
								disabled={busy}
								onclick={() => restart(log.id)}
								title={busy ? m.timer_stop_first() : m.dashboard_restart_task()}
							/>
						</span>
					</div>
				</div>
			{/each}
		{/if}
	</div>
</div>

<style>
	/*
	 * Majer roles → Vynno tokens
	 * ground: surface-container · surface: surface-container-high · hairline: outline-variant
	 * control-line: outline · ink: on-surface · ink-muted: on-surface-variant · accent: primary
	 * data-face: font-mono · hover: 150ms ease · exit: --duration-ui-exit
	 * travel: --duration-travel + --ease-in-out
	 */
	.rl-frame {
		transition:
			transform var(--duration-travel) var(--ease-in-out),
			opacity var(--duration-ui-exit) ease;
		will-change: transform;
	}

	/* First appearance and keyboard focus land on the row; only the fade runs. */
	.rl-frame:global(.rl-instant) {
		transition: opacity var(--duration-ui-exit) ease;
	}

	/* Restart icon: same duration and curve as the frame's glide, so both arrive together. */
	.rl-act {
		transition: opacity var(--duration-travel) var(--ease-in-out);
	}

	/* When the frame only fades (first entry, keyboard, leaving), the icon fades with it. */
	:global([data-glide='off']) .rl-act {
		transition: opacity var(--duration-ui-exit) ease;
	}

	.rl-readout {
		transition: opacity 150ms ease;
	}

	/* Less motion, not zero: the frame jumps to the row, fades stay. */
	@media (prefers-reduced-motion: reduce) {
		.rl-frame,
		.rl-act {
			transition: opacity var(--duration-ui-exit) ease;
		}
	}
</style>
