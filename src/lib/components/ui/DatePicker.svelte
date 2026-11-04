<script lang="ts" module>
	export type DatePickerMode = 'date' | 'datetime';
	export type DatePickerSize = 'sm' | 'md';

	const SIZE: Record<DatePickerSize, string> = {
		sm: 'min-h-8 py-1.5 text-code-label',
		md: 'min-h-10 py-2.5 text-code-data'
	};
</script>

<script lang="ts">
	import { tick } from 'svelte';
	import { MediaQuery } from 'svelte/reactivity';
	import { m } from '$lib/paraglide/messages.js';
	import Button from './Button.svelte';
	import Icon from './Icon.svelte';
	import IconButton from './IconButton.svelte';
	import Input from './Input.svelte';
	import {
		addDays,
		addMonths,
		clampDay,
		dayKey,
		dayLabel,
		dayParts,
		localNow,
		monthTitle,
		monthWeeks,
		pad2,
		weekdayIndex,
		weekdayNames,
		weekdayOf
	} from './calendar';
	import { getFieldContext } from './field-context';

	/**
	 * A date (`YYYY-MM-DD`) or a date and time (`YYYY-MM-DDTHH:MM`, host-local) — the same
	 * values as a native `input type="date" | "datetime-local"`. On a fine pointer: a
	 * field-shaped trigger and a calendar popover (APG date picker dialog). On a coarse
	 * pointer: the native input, so phones keep the OS picker. Decision: ADR-0033.
	 */
	interface Props {
		mode?: DatePickerMode;
		value?: string;
		/**
		 * Runs when the user commits a new value — a picked day (`date`), or Done (`datetime`).
		 * Not on programmatic updates, and not while a `datetime` draft is being edited.
		 */
		onchange?: (value: string) => void;
		/** Same format as `value`. Days outside the bounds cannot be picked. */
		min?: string;
		max?: string;
		size?: DatePickerSize;
		id?: string;
		/** Submits `value` with a surrounding `<form>`. */
		name?: string;
		disabled?: boolean;
		/** Only when there is no `Field` or `<label for>`. */
		'aria-label'?: string;
		'aria-describedby'?: string;
		'data-testid'?: string;
		/**
		 * Layout utilities ONLY — flex, width, margin. Never padding, radius,
		 * border or type scale: those come from `size`.
		 */
		class?: string;
	}

	let {
		mode = 'date',
		value = $bindable(''),
		onchange,
		min = '',
		max = '',
		size = 'md',
		id,
		name,
		disabled = false,
		'aria-label': ariaLabel,
		'aria-describedby': ariaDescribedBy,
		'data-testid': testid,
		class: className = ''
	}: Props = $props();

	const field = getFieldContext();
	const uid = $props.id();
	const controlId = $derived(id ?? field?.id ?? `${uid}-date`);
	const titleId = `${uid}-title`;
	const valueId = `${uid}-value`;
	// `<label for>` names the trigger and hides its text, so the value is spoken as a description
	// — the way a native date input reads "From, 28.10.2026".
	const describedBy = $derived(
		[valueId, field?.describedBy, ariaDescribedBy].filter(Boolean).join(' ')
	);
	/** A button cannot carry `aria-invalid`; the Field error is announced via `aria-describedby`. */
	const invalid = $derived(Boolean(field?.invalid));

	const coarse = new MediaQuery('pointer: coarse', false);

	const timed = $derived(mode === 'datetime');
	const valueDay = $derived(value.slice(0, 10));
	const valueTime = $derived(timed ? value.slice(11, 16) : '');
	const minDay = $derived(min.slice(0, 10));
	const maxDay = $derived(max.slice(0, 10));
	const weekdays = weekdayNames();

	let open = $state(false);
	let triggerEl = $state<HTMLButtonElement>();
	let panelEl = $state<HTMLElement>();
	/** The day that takes Tab in the grid (roving tabindex), and the month on show. */
	let focusDay = $state('');
	let view = $state({ y: 1970, m: 1 });
	/** `datetime` keeps an uncommitted draft until Done; `date` commits on pick. */
	let draftDay = $state('');
	let hours = $state('');
	let minutes = $state('');
	/** Host-local today, read when the panel opens. */
	let todayDay = $state('');

	const selectedDay = $derived(timed ? draftDay : valueDay);
	const weeks = $derived(monthWeeks(view.y, view.m));
	const viewMonth = $derived(`${view.y}-${pad2(view.m)}`);
	const prevDisabled = $derived(Boolean(minDay) && viewMonth <= minDay.slice(0, 7));
	const nextDisabled = $derived(Boolean(maxDay) && viewMonth >= maxDay.slice(0, 7));

	const outOfRange = (key: string) => Boolean((minDay && key < minDay) || (maxDay && key > maxDay));

	function showMonthOf(key: string) {
		const { y, m: month } = dayParts(key);
		view = { y, m: month };
	}

	async function focusGridDay() {
		await tick();
		panelEl?.querySelector<HTMLElement>(`[data-day="${focusDay}"]`)?.focus();
	}

	function openPanel() {
		if (disabled) return;
		const now = localNow();
		todayDay = now.day;
		draftDay = valueDay;
		hours = valueTime.slice(0, 2) || now.time.slice(0, 2);
		minutes = valueTime.slice(3, 5) || now.time.slice(3, 5);
		focusDay = valueDay || clampDay(now.day, minDay, maxDay);
		showMonthOf(focusDay);
		open = true;
		void focusGridDay();
	}

	function close(returnFocus = true) {
		open = false;
		if (returnFocus) triggerEl?.focus();
	}

	function commit(next: string) {
		if (next !== value) {
			value = next;
			onchange?.(next);
		}
	}

	function pick(key: string) {
		if (outOfRange(key)) return;
		focusDay = key;
		if (timed) {
			draftDay = key;
			return;
		}
		commit(key);
		close();
	}

	function done() {
		normaliseTime();
		const day = draftDay || focusDay;
		if (day && !outOfRange(day)) commit(`${day}T${hours}:${minutes}`);
		close();
	}

	function moveTo(key: string) {
		focusDay = key;
		if (key.slice(0, 7) !== viewMonth) showMonthOf(key);
		void focusGridDay();
	}

	function page(months: number) {
		const next = addMonths(`${viewMonth}-01`, months);
		showMonthOf(next);
		// Keep the roving day inside the month on show, on the same day number when it exists.
		const { d } = dayParts(focusDay);
		const { y, m: month } = dayParts(next);
		focusDay = dayKey(y, month, Math.min(d, 28));
	}

	function onGridKey(e: KeyboardEvent) {
		const k = focusDay;
		let next: string | null = null;
		if (e.key === 'ArrowLeft') next = addDays(k, -1);
		else if (e.key === 'ArrowRight') next = addDays(k, 1);
		else if (e.key === 'ArrowUp') next = addDays(k, -7);
		else if (e.key === 'ArrowDown') next = addDays(k, 7);
		else if (e.key === 'Home') next = addDays(k, -weekdayIndex(k));
		else if (e.key === 'End') next = addDays(k, 6 - weekdayIndex(k));
		else if (e.key === 'PageUp') next = addMonths(k, e.shiftKey ? -12 : -1);
		else if (e.key === 'PageDown') next = addMonths(k, e.shiftKey ? 12 : 1);
		if (!next) return;
		e.preventDefault();
		moveTo(next);
	}

	function clampField(raw: string, top: number): string {
		const n = Number.parseInt(raw, 10);
		return pad2(Number.isNaN(n) ? 0 : Math.min(top, Math.max(0, n)));
	}

	function normaliseTime() {
		hours = clampField(hours, 23);
		minutes = clampField(minutes, 59);
	}

	function onTimeKey(e: KeyboardEvent, part: 'h' | 'm') {
		if (e.key === 'Enter') {
			// The panel sits inside the caller's <form>: Enter here is Done, not submit.
			e.preventDefault();
			done();
			return;
		}
		if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
		e.preventDefault();
		const top = part === 'h' ? 23 : 59;
		const step = e.key === 'ArrowUp' ? 1 : -1;
		const cur = Number.parseInt(part === 'h' ? hours : minutes, 10) || 0;
		const next = pad2((cur + step + top + 1) % (top + 1));
		if (part === 'h') hours = next;
		else minutes = next;
	}

	function onPanelKey(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			e.preventDefault();
			// Keep a surrounding Dialog open: this Escape belongs to the calendar.
			e.stopPropagation();
			close();
		} else if (e.key === 'Tab') {
			// APG date picker dialog: Tab cycles inside, so a draft is only left by Done or Escape.
			const stops = [...(panelEl?.querySelectorAll<HTMLElement>('button, input') ?? [])].filter(
				(el) => !el.matches(':disabled, [tabindex="-1"]')
			);
			const first = stops[0];
			const last = stops.at(-1);
			if (!first || !last) return;
			if (document.activeElement !== (e.shiftKey ? first : last)) return;
			// A surrounding Dialog's trap (document, capture) only wraps at its own edges, and the
			// panel sits mid-form in the DOM, so the two never act on the same Tab.
			e.preventDefault();
			(e.shiftKey ? last : first).focus();
		}
	}

	function onPanelFocusOut(e: FocusEvent) {
		const to = e.relatedTarget;
		if (!(to instanceof Node)) return;
		if (panelEl?.contains(to) || triggerEl?.contains(to)) return;
		close(false);
	}

	/** Under the trigger, or above it when the viewport has more room there; kept on screen. */
	function place() {
		if (!triggerEl || !panelEl) return;
		const rect = triggerEl.getBoundingClientRect();
		const gap = 4;
		const margin = 8;
		const height = panelEl.offsetHeight;
		const width = panelEl.offsetWidth;
		const below = window.innerHeight - rect.bottom - gap;
		const up = below < height && rect.top - gap > below;
		const left = Math.max(margin, Math.min(rect.left, window.innerWidth - width - margin));
		panelEl.style.left = `${left}px`;
		panelEl.style.top = up ? `${rect.top - gap - height}px` : `${rect.bottom + gap}px`;
	}

	/**
	 * `popover="manual"` puts the panel in the top layer, so a scrolling Dialog panel
	 * cannot clip it. Dismissal is ours (Escape, outside pointer, focus leaving).
	 */
	function attachPanel(node: HTMLElement) {
		panelEl = node;
		node.showPopover();
		place();
		return () => {
			if (panelEl === node) panelEl = undefined;
		};
	}

	function onWindowPointer(e: PointerEvent) {
		if (!open || !(e.target instanceof Node)) return;
		if (triggerEl?.contains(e.target) || panelEl?.contains(e.target)) return;
		close(false);
	}

	function onWindowScroll(e: Event) {
		if (!open || (e.target instanceof Node && panelEl?.contains(e.target))) return;
		place();
	}

	function onNativeChange(e: Event & { currentTarget: HTMLInputElement }) {
		commit(e.currentTarget.value);
	}
</script>

<svelte:window
	onpointerdown={onWindowPointer}
	onresize={() => open && place()}
	onscrollcapture={onWindowScroll}
/>

{#if coarse.current}
	<Input
		type={timed ? 'datetime-local' : 'date'}
		tone={size === 'sm' ? 'code' : 'data'}
		{size}
		id={controlId}
		{name}
		{value}
		min={min || undefined}
		max={max || undefined}
		{disabled}
		aria-label={ariaLabel}
		aria-describedby={ariaDescribedBy}
		data-testid={testid}
		class={className}
		onchange={onNativeChange}
	/>
{:else}
	<button
		bind:this={triggerEl}
		type="button"
		id={controlId}
		data-field
		{disabled}
		aria-label={ariaLabel}
		aria-describedby={describedBy}
		aria-haspopup="dialog"
		aria-expanded={open}
		data-testid={testid}
		data-value={value}
		data-min={min || undefined}
		data-max={max || undefined}
		class={[
			'flex items-center gap-2 rounded border bg-surface-container-low pr-2 pl-3 text-left',
			invalid ? 'border-error' : 'border-outline-variant',
			'font-mono whitespace-nowrap text-on-surface tabular-nums aria-expanded:border-primary',
			'disabled:cursor-not-allowed disabled:opacity-60',
			SIZE[size],
			className
		]}
		onclick={() => (open ? close(false) : openPanel())}
	>
		<span class="flex min-w-0 flex-1 items-baseline gap-2">
			{#if !valueDay}
				<span class="text-on-surface-variant">
					{timed ? m.date_picker_placeholder_datetime() : m.date_picker_placeholder_date()}
				</span>
			{:else}
				<span>{valueDay}</span>
				{#if timed}
					<span>{valueTime}</span>
				{:else if size === 'md'}
					<span class="text-code-label text-on-surface-variant">{weekdayOf(valueDay)}</span>
				{/if}
			{/if}
		</span>
		<Icon
			name="calendar_month"
			size={size === 'sm' ? 'md' : 'lg'}
			class="shrink-0 text-on-surface-variant"
		/>
	</button>
	<span id={valueId} hidden>
		{valueDay ? `${dayLabel(valueDay)}${timed ? ` ${valueTime}` : ''}` : m.date_picker_no_value()}
	</span>
	{#if name}
		<input type="hidden" {name} {value} />
	{/if}
	{#if open}
		<!-- Overlay level 2 (layout.md), the same chrome as Select's list. -->
		<div
			{@attach attachPanel}
			popover="manual"
			role="dialog"
			tabindex="-1"
			aria-label={timed ? m.date_picker_dialog_datetime() : m.date_picker_dialog_date()}
			class="fixed inset-auto m-0 flex w-72 flex-col gap-2 rounded-DEFAULT border border-outline-variant bg-surface-container p-3 shadow-xl any-pointer-coarse:w-80"
			onkeydown={onPanelKey}
			onfocusout={onPanelFocusOut}
		>
			<div class="flex items-center justify-between">
				<IconButton
					icon="chevron_left"
					label={m.date_picker_prev_month()}
					disabled={prevDisabled}
					onclick={() => page(-1)}
				/>
				<span
					id={titleId}
					class="text-body-md font-medium text-on-surface first-letter:uppercase"
					aria-live="polite"
				>
					{monthTitle(view.y, view.m)}
				</span>
				<IconButton
					icon="chevron_right"
					label={m.date_picker_next_month()}
					disabled={nextDisabled}
					onclick={() => page(1)}
				/>
			</div>

			<div role="grid" aria-labelledby={titleId} tabindex="-1" onkeydown={onGridKey}>
				<div role="row" class="grid grid-cols-7">
					{#each weekdays as wd (wd)}
						<span
							role="columnheader"
							aria-label={wd}
							class="flex h-7 items-center justify-center font-mono text-[10px] tracking-wider text-on-surface-variant uppercase"
						>
							{wd.slice(0, 2)}
						</span>
					{/each}
				</div>
				{#each weeks as week (week[0])}
					<div role="row" class="grid grid-cols-7">
						{#each week as day (day)}
							{const selected = $derived(day === selectedDay)}
							{const inMonth = $derived(day.slice(0, 7) === viewMonth)}
							{const off = $derived(outOfRange(day))}
							{const isToday = $derived(day === todayDay)}
							<div role="gridcell" aria-selected={selected}>
								<!-- A calendar cell, not chrome: no .press, no size scale (like Select's options). -->
								<button
									type="button"
									data-day={day}
									tabindex={day === focusDay ? 0 : -1}
									aria-label={dayLabel(day)}
									aria-disabled={off || undefined}
									aria-current={isToday ? 'date' : undefined}
									class={[
										// A touch laptop reports a fine primary pointer but may be tapped: 40px cells then.
										'relative mx-auto flex size-9 items-center justify-center rounded-DEFAULT font-mono text-code-label tabular-nums any-pointer-coarse:size-10',
										selected
											? 'bg-primary text-on-primary forced-colors:outline forced-colors:-outline-offset-2'
											: off
												? // Forced colours drop the dimmed ink; GrayText keeps unavailable days readable as such.
													'cursor-not-allowed text-on-surface-variant/40 forced-colors:text-[GrayText]'
												: [
														'hover:bg-surface-container-high',
														isToday
															? 'font-semibold text-primary forced-colors:underline'
															: inMonth
																? 'text-on-surface'
																: 'text-on-surface-variant'
													]
									]}
									onclick={() => pick(day)}
								>
									{dayParts(day).d}
									{#if isToday}
										<span
											aria-hidden="true"
											class={[
												'absolute bottom-1 left-1/2 size-1 -translate-x-1/2 rounded-full',
												selected ? 'bg-on-primary' : 'bg-primary'
											]}
										></span>
									{/if}
								</button>
							</div>
						{/each}
					</div>
				{/each}
			</div>

			{#if timed}
				<div class="-mx-3 border-t border-outline-variant"></div>
				<div class="flex items-center gap-2">
					<!-- pl-3 lines the label up with the first column's text (PO / 26), not the panel edge. -->
					<span class="pl-3 text-body-sm text-on-surface-variant">{m.date_picker_time()}</span>
					<Input
						tone="data"
						size="sm"
						inputmode="numeric"
						autocomplete="off"
						maxlength={2}
						role="spinbutton"
						aria-label={m.date_picker_hours()}
						aria-valuenow={Number.parseInt(hours, 10) || 0}
						aria-valuemin={0}
						aria-valuemax={23}
						bind:value={hours}
						onblur={normaliseTime}
						onkeydown={(e) => onTimeKey(e, 'h')}
						class="ml-auto w-12"
					/>
					<span class="font-mono text-on-surface-variant" aria-hidden="true">:</span>
					<Input
						tone="data"
						size="sm"
						inputmode="numeric"
						autocomplete="off"
						maxlength={2}
						role="spinbutton"
						aria-label={m.date_picker_minutes()}
						aria-valuenow={Number.parseInt(minutes, 10) || 0}
						aria-valuemin={0}
						aria-valuemax={59}
						bind:value={minutes}
						onblur={normaliseTime}
						onkeydown={(e) => onTimeKey(e, 'm')}
						class="w-12"
					/>
					<Button variant="primary" size="sm" onclick={done}>{m.date_picker_done()}</Button>
				</div>
			{/if}
		</div>
	{/if}
{/if}
