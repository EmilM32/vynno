<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { m } from '$lib/paraglide/messages.js';
	import { getLocale } from '$lib/paraglide/runtime.js';
	import { DayTotalsQuery } from '$lib/stores/day-totals.svelte';
	import { usePrefs } from '$lib/stores/prefs.svelte';
	import { useSession } from '$lib/stores/session.svelte';
	import { dayKeyDate } from '$lib/time/civil-days';
	import { totalsByDate, withLiveSession } from '$lib/time/day-totals';
	import { formatCompact, localDateKeyFromDate } from '$lib/time/duration';
	import { streaks } from '$lib/time/streaks';
	import { SPRING_FRAME, springAtRest, springStep } from '$lib/motion/spring';
	import { HEATMAP_WEEKS, heatmapModel, heatmapStart, type HeatLevel } from './heatmap';

	/**
	 * A year of tracked time from `/stats/days`, one square per day, shaded against
	 * the daily target. The squares scale with the card; a card too narrow for the
	 * smallest squares scrolls, starting at the newest week.
	 */

	let { class: className = '' }: { class?: string } = $props();

	const sessionStore = useSession();
	const prefsStore = usePrefs();
	const query = new DayTotalsQuery();

	const LEVEL_CLASS: Record<HeatLevel, string> = {
		0: 'bg-surface-container-highest',
		1: 'bg-primary/25',
		2: 'bg-primary/50',
		3: 'bg-primary/75',
		4: 'bg-primary'
	};
	const LEVELS: HeatLevel[] = [0, 1, 2, 3, 4];
	/** Month labels this close to the right edge end-align so they never spill past it. */
	const LAST_WEEKS = HEATMAP_WEEKS - 2;

	const today = $derived(
		localDateKeyFromDate(new Date(sessionStore.nowMs || Date.now()), sessionStore.timeZone)
	);
	const days = $derived({
		from: heatmapStart(today),
		to: today,
		timeZone: sessionStore.timeZone
	});

	// Refetch for a new day, and after a session write here or in another tab.
	$effect(() => {
		void sessionStore.revision;
		const range = days;
		untrack(() => void query.load(range, sessionStore.listDayTotals));
	});

	const byDate = $derived(
		totalsByDate(
			withLiveSession(query.rows ?? [], sessionStore.activeSession, days, sessionStore.nowMs)
		)
	);
	const model = $derived(heatmapModel(today, byDate, prefsStore.dailyTargetMs));
	const streak = $derived(streaks(byDate, days.from, today));
	const activeDays = $derived([...byDate.values()].filter((ms) => ms > 0).length);
	const totalMs = $derived([...byDate.values()].reduce((sum, ms) => sum + ms, 0));
	const ready = $derived(query.isFor(days));

	const monthFormat = $derived(
		new Intl.DateTimeFormat(getLocale(), { month: 'short', timeZone: 'UTC' })
	);
	/** The readout's date: a year grid spans two calendar years, so the year is always named. */
	const readoutFormat = $derived(
		new Intl.DateTimeFormat(getLocale(), {
			weekday: 'short',
			month: 'short',
			day: 'numeric',
			year: 'numeric',
			timeZone: 'UTC'
		})
	);
	/** Mon, Wed, Fri, like most calendars' heatmaps; the rest stay blank. */
	const weekdayLabels = $derived.by(() => {
		const format = new Intl.DateTimeFormat(getLocale(), { weekday: 'short', timeZone: 'UTC' });
		// 2024-01-01 is a Monday.
		return [0, 1, 2, 3, 4, 5, 6].map((d) =>
			d % 2 === 0 && d < 6 ? format.format(dayKeyDate(`2024-01-0${d + 1}`)) : ''
		);
	});

	const stats = $derived([
		{ id: 'streak', label: m.dashboard_heatmap_streak(), value: dayCount(streak.current) },
		{ id: 'best', label: m.dashboard_heatmap_best(), value: dayCount(streak.longest) },
		{ id: 'active', label: m.dashboard_heatmap_active_days(), value: String(activeDays) },
		{ id: 'total', label: m.dashboard_heatmap_total(), value: formatCompact(totalMs) }
	]);

	function dayCount(count: number): string {
		return m.dashboard_heatmap_days({ count });
	}

	/*
	 * Day readout (Majer style, ADR-0037): one frame travels over the squares under the pointer
	 * or the keyboard cursor, and the footer names that day in the same frame.
	 * Frame motion lives in plain variables and is written straight to `style.transform`;
	 * Svelte hears only about the readout's date, and only when it changes.
	 */
	let gridEl: HTMLDivElement | undefined = $state();
	let frameEl: HTMLDivElement | undefined = $state();
	let fx = 0;
	let fy = 0;
	let vx = 0;
	let vy = 0;
	let tx = 0;
	let ty = 0;
	let raf = 0;
	let last = 0;
	let shown = false;
	let reduced = false;
	/** Keyboard cursor: week and weekday indices into `model.weeks`. */
	let cursor: { w: number; d: number } | null = null;

	let readoutDate = $state<string | null>(null);
	/** Announce days only while the keyboard drives the cursor; a hover would chatter. */
	let fromKeyboard = $state(false);

	const cellByDate = $derived(new Map(model.weeks.flat().map((cell) => [cell.date, cell])));
	const readoutCell = $derived(readoutDate ? cellByDate.get(readoutDate) : undefined);
	const percent = $derived(new Intl.NumberFormat(getLocale(), { style: 'percent' }));
	const readoutComment = $derived.by(() => {
		const cell = readoutCell;
		if (!cell) return '';
		if (cell.ms <= 0) return m.dashboard_heatmap_readout_empty();
		const target = prefsStore.dailyTargetMs;
		if (target <= 0 || cell.ms >= target) return m.dashboard_heatmap_readout_met();
		return m.dashboard_heatmap_readout_share({ share: percent.format(cell.ms / target) });
	});

	function writeFrame() {
		if (frameEl) frameEl.style.transform = `translate3d(${fx}px, ${fy}px, 0)`;
	}

	function tick(now: number) {
		const dt = Math.min((now - last) / 1000, 1 / 20);
		last = now;
		[fx, vx] = springStep(fx, vx, tx, dt, SPRING_FRAME);
		[fy, vy] = springStep(fy, vy, ty, dt, SPRING_FRAME);
		if (springAtRest(fx, vx, tx) && springAtRest(fy, vy, ty)) {
			fx = tx;
			fy = ty;
			vx = vy = 0;
			writeFrame();
			raf = 0;
			return;
		}
		writeFrame();
		raf = requestAnimationFrame(tick);
	}

	/** Put the frame on `cell`. It travels only between squares under the pointer. */
	function place(cell: HTMLElement, glide: boolean) {
		// Squares have fractional sizes; offsetLeft/Top round to whole pixels and would set the
		// frame up to half a pixel past the grid's edge.
		const grid = gridEl?.getBoundingClientRect();
		const box = cell.getBoundingClientRect();
		tx = grid ? box.left - grid.left : cell.offsetLeft;
		ty = grid ? box.top - grid.top : cell.offsetTop;
		if (!glide || !shown || reduced) {
			cancelAnimationFrame(raf);
			raf = 0;
			fx = tx;
			fy = ty;
			vx = vy = 0;
			writeFrame();
		} else if (!raf) {
			last = performance.now();
			raf = requestAnimationFrame(tick);
		}
		if (!shown && frameEl) frameEl.style.opacity = '1';
		shown = true;
		const date = cell.dataset.date ?? null;
		if (readoutDate !== date) readoutDate = date;
	}

	function hideFrame() {
		shown = false;
		cursor = null;
		cancelAnimationFrame(raf);
		raf = 0;
		if (frameEl) frameEl.style.opacity = '0';
		if (readoutDate !== null) readoutDate = null;
		if (fromKeyboard) fromKeyboard = false;
	}

	function cellEl(date: string): HTMLElement | null {
		return gridEl?.querySelector<HTMLElement>(`[data-date="${date}"]`) ?? null;
	}

	function onGridPointerMove(e: PointerEvent) {
		if (e.pointerType === 'touch') return;
		const cell = (e.target as Element).closest<HTMLElement>('[data-level]');
		if (!cell || cell.dataset.date === readoutDate) return;
		if (fromKeyboard) fromKeyboard = false;
		cursor = null;
		place(cell, true);
	}

	function onGridPointerLeave(e: PointerEvent) {
		if (e.pointerType === 'touch' || cursor) return;
		hideFrame();
	}

	function todayCursor(): { w: number; d: number } {
		const w = model.weeks.length - 1;
		const d = model.weeks[w].findIndex((cell) => cell.date === today);
		return { w, d: d === -1 ? 0 : d };
	}

	/** Arrows: ±1 day / ±1 week (Shift ×4 weeks), Home / End: first / last day. No travel. */
	function onRegionKeydown(e: KeyboardEvent) {
		const weeks = model.weeks;
		let next = cursor ?? todayCursor();
		const step = e.shiftKey ? 4 : 1;
		switch (e.key) {
			case 'ArrowLeft':
				next = { w: next.w - step, d: next.d };
				break;
			case 'ArrowRight':
				next = { w: next.w + step, d: next.d };
				break;
			case 'ArrowUp':
				next = { w: next.w, d: next.d - 1 };
				break;
			case 'ArrowDown':
				next = { w: next.w, d: next.d + 1 };
				break;
			case 'Home':
				next = { w: 0, d: 0 };
				break;
			case 'End':
				next = todayCursor();
				break;
			case 'Escape':
				if (!cursor) return;
				e.preventDefault();
				hideFrame();
				return;
			default:
				return;
		}
		e.preventDefault();
		next = {
			w: Math.min(weeks.length - 1, Math.max(0, next.w)),
			d: Math.min(6, Math.max(0, next.d))
		};
		const cell = weeks[next.w][next.d];
		// Days after today are blank; the cursor stays on the last real one.
		if (cell.future) next = todayCursor();
		const el = cellEl(weeks[next.w][next.d].date);
		if (!el) return;
		cursor = next;
		if (!fromKeyboard) fromKeyboard = true;
		place(el, false);
		el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
	}

	onMount(() => {
		const media = window.matchMedia('(prefers-reduced-motion: reduce)');
		reduced = media.matches;
		const onMotion = () => (reduced = media.matches);
		media.addEventListener('change', onMotion);
		// A resize moves every square; drop the frame rather than point at the wrong day.
		let size = '';
		const observer = new ResizeObserver(([entry]) => {
			const next = `${Math.round(entry.contentRect.width)}x${Math.round(entry.contentRect.height)}`;
			if (size && next !== size) hideFrame();
			size = next;
		});
		if (gridEl) observer.observe(gridEl);
		return () => {
			media.removeEventListener('change', onMotion);
			observer.disconnect();
			cancelAnimationFrame(raf);
		};
	});
</script>

<section
	class="rounded-lg border border-outline-variant bg-surface-container p-4 {className}"
	aria-labelledby="year-heatmap-title"
	data-testid="year-heatmap"
>
	<div class="mb-4 flex flex-wrap items-baseline gap-x-6 gap-y-2">
		<h2 id="year-heatmap-title" class="text-headline-md">{m.dashboard_heatmap_title()}</h2>
		<dl class="flex flex-wrap gap-x-5 gap-y-1 font-mono text-code-label" aria-busy={!ready}>
			{#each stats as item (item.id)}
				<div class="flex items-baseline gap-1.5">
					<dt class="text-on-surface-variant">{item.label}</dt>
					<dd class="text-on-surface" data-testid="heatmap-{item.id}">
						{ready ? item.value : '—'}
					</dd>
				</div>
			{/each}
		</dl>
	</div>

	<!-- Row-reversed so a scrolling card opens on the newest week, with no script. -->
	<!--
		The region is focusable so it can scroll, and its arrow keys move the day cursor
		(ADR-0037); the grid inside stays one `role="img"` with a text summary.
	-->
	<!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
	<div
		class="heatmap-scroll focus-ring flex flex-row-reverse overflow-x-auto overflow-y-hidden rounded"
		tabindex="0"
		role="region"
		aria-label={m.dashboard_heatmap_scroll_aria()}
		aria-busy={!ready}
		onkeydown={onRegionKeydown}
		onfocusout={hideFrame}
		onpointermove={onGridPointerMove}
		onpointerleave={onGridPointerLeave}
	>
		<div
			bind:this={gridEl}
			class="heatmap-grid shrink-0 font-mono text-[10px] leading-none text-on-surface-variant"
			style:--weeks={HEATMAP_WEEKS}
			role="img"
			aria-label={m.dashboard_heatmap_summary({
				active: activeDays,
				total: formatCompact(totalMs)
			})}
		>
			<div class="weekdays sticky left-0 z-1 grid bg-surface-container" aria-hidden="true">
				<span></span>
				{#each weekdayLabels as label, i (i)}
					<span class="self-center">{label}</span>
				{/each}
			</div>
			{#each model.months as month (month.date)}
				<span
					class={[
						'row-start-1 self-end whitespace-nowrap',
						month.week >= LAST_WEEKS && 'justify-self-end'
					]}
					style:grid-column={month.week + 2}
					aria-hidden="true"
				>
					{monthFormat.format(dayKeyDate(month.date))}
				</span>
			{/each}
			{#each model.weeks as week, w (w)}
				<div class="week grid" style:grid-column={w + 2} aria-hidden="true">
					{#each week as cell (cell.date)}
						<span
							class="rounded-[2px] {cell.future ? 'invisible' : LEVEL_CLASS[cell.level]}"
							data-level={cell.future ? undefined : cell.level}
							data-date={cell.date}
						></span>
					{/each}
				</div>
			{/each}
			<div bind:this={frameEl} class="hm-frame" aria-hidden="true"></div>
		</div>
	</div>

	<div
		class="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-body-sm text-on-surface-variant"
	>
		<!-- The hint and the day readout share one slot, so swapping them never shifts the row. -->
		<div class="grid min-w-0 flex-1">
			<p
				class={['hm-swap col-start-1 row-start-1', readoutCell ? 'opacity-0' : 'opacity-100']}
				aria-hidden={readoutCell ? 'true' : undefined}
			>
				{m.dashboard_heatmap_hint({ target: formatCompact(prefsStore.dailyTargetMs) })}
			</p>
			<p
				class={[
					'hm-swap col-start-1 row-start-1 self-center truncate font-mono tabular-nums',
					readoutCell ? 'opacity-100' : 'opacity-0'
				]}
				aria-live={fromKeyboard ? 'polite' : 'off'}
				data-testid="heatmap-readout"
			>
				{#if readoutCell}
					<span class="text-primary"
						>{readoutFormat.format(dayKeyDate(readoutCell.date)) + ': '}</span
					><span class="text-on-surface">{formatCompact(readoutCell.ms)}</span><span
						class="text-on-surface-variant">{' // ' + readoutComment}</span
					>
				{/if}
			</p>
		</div>
		<div class="flex items-center gap-1 font-mono text-[10px]" aria-hidden="true">
			<span>{m.dashboard_heatmap_less()}</span>
			{#each LEVELS as level (level)}
				<span class="size-2.5 rounded-[2px] {LEVEL_CLASS[level]}"></span>
			{/each}
			<span>{m.dashboard_heatmap_more()}</span>
		</div>
	</div>
</section>

<style>
	.heatmap-scroll {
		container-type: inline-size;
	}

	/*
	 * One grid: a weekday column, then a column per week. A pitch is a square plus the gap
	 * after it, so the label column and the pitches fill the card exactly. Past the largest
	 * square the grid stops growing and centres; below the smallest the card scrolls.
	 */
	.heatmap-grid {
		--label-w: 1.75rem;
		--pitch: clamp(12px, (100cqi - var(--label-w)) / var(--weeks), 30px);
		--cell: calc(var(--pitch) * 0.8);
		--gap: calc(var(--pitch) * 0.2);
		display: grid;
		grid-template-columns: var(--label-w) repeat(var(--weeks), var(--cell));
		grid-template-rows: auto repeat(7, var(--cell));
		gap: var(--gap);
		margin-inline: auto;
		position: relative;
	}

	/*
	 * Majer roles → Vynno tokens
	 * ground: surface-container · accent: primary · data-face: font-mono
	 * exit / fade: --duration-ui-exit · hover swap: 150ms ease
	 * The frame's travel is a 380/34 spring in script ($lib/motion/spring), not a transition.
	 */
	/*
	 * Drawn inside the square (accent ring + a ground gap), never past it: an outset frame
	 * grows the grid's scrollable overflow, and the card would scroll at a width that fits.
	 */
	.hm-frame {
		position: absolute;
		top: 0;
		left: 0;
		width: var(--cell);
		height: var(--cell);
		border-radius: 2px;
		box-shadow:
			inset 0 0 0 1px var(--color-primary),
			inset 0 0 0 2px var(--color-surface-container);
		opacity: 0;
		pointer-events: none;
		transition: opacity var(--duration-ui-exit) ease;
		will-change: transform;
	}

	.hm-swap {
		transition: opacity 150ms ease;
	}

	/* Covers the gap too, so squares scrolled under it do not peek through. */
	.weekdays {
		grid-column: 1;
		grid-row: 1 / -1;
		grid-template-rows: subgrid;
		margin-right: calc(-1 * var(--gap));
		padding-right: var(--gap);
	}

	.week {
		grid-row: 2 / -1;
		grid-template-rows: subgrid;
	}
</style>
