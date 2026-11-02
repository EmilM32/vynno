<script lang="ts" module>
	export type SelectSize = 'sm' | 'md';

	export type SelectOption = {
		value: string;
		label: string;
		disabled?: boolean;
	};

	const SIZE: Record<SelectSize, string> = {
		sm: 'min-h-8 py-1.5',
		md: 'min-h-10 py-2.5'
	};

	/** Typeahead keystrokes closer together than this extend the same search. */
	const TYPEAHEAD_MS = 500;
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import { MediaQuery } from 'svelte/reactivity';
	import Icon from './Icon.svelte';
	import { getFieldContext } from './field-context';

	/**
	 * A single choice from fixed options. On a fine pointer: a themed button + listbox
	 * (select-only combobox — focus stays on the trigger, `aria-activedescendant` points at
	 * the active option). On a coarse pointer: the native `<select>`, so phones keep the OS
	 * picker. Both look the same while closed. Decision: ADR-0032.
	 */
	interface Props {
		options: SelectOption[];
		value?: string;
		/** Runs after `value` changes through the control — not on programmatic updates. */
		onchange?: (value: string) => void;
		size?: SelectSize;
		id?: string;
		/** Submits `value` with a surrounding `<form>`. */
		name?: string;
		disabled?: boolean;
		/** Only when there is no `Field` or `<label for>` — e.g. a toolbar filter. */
		'aria-label'?: string;
		'aria-describedby'?: string;
		'data-testid'?: string;
		/**
		 * Layout utilities ONLY — flex, width, margin. Never padding, radius,
		 * border or type scale: those come from `size`.
		 */
		class?: string;
		/** Custom row content (e.g. a colour dot), used in the list and on the trigger. */
		option?: Snippet<[SelectOption]>;
	}

	let {
		options,
		value = $bindable(''),
		onchange,
		size = 'md',
		id,
		name,
		disabled = false,
		'aria-label': ariaLabel,
		'aria-describedby': ariaDescribedBy,
		'data-testid': testid,
		class: className = '',
		option
	}: Props = $props();

	const field = getFieldContext();
	const uid = $props.id();
	const controlId = $derived(id ?? field?.id ?? `${uid}-select`);
	const listId = `${uid}-list`;
	const describedBy = $derived(
		[field?.describedBy, ariaDescribedBy].filter(Boolean).join(' ') || undefined
	);
	const invalid = $derived(field?.invalid || undefined);

	const coarse = new MediaQuery('pointer: coarse', false);

	const selected = $derived(options.find((o) => o.value === value));
	let open = $state(false);
	let active = $state(-1);
	let triggerEl = $state<HTMLButtonElement>();
	let listEl = $state<HTMLElement>();
	let typed = '';
	let typedAt = 0;

	const optionId = (i: number) => `${uid}-opt-${i}`;

	function commit(next: string) {
		if (next === value) return;
		value = next;
		onchange?.(next);
	}

	function enabledIndex(from: number, step: 1 | -1): number {
		for (let i = from; i >= 0 && i < options.length; i += step) {
			if (!options[i]?.disabled) return i;
		}
		return -1;
	}

	function openList(at?: number) {
		if (disabled || options.length === 0) return;
		const current = options.findIndex((o) => o.value === value);
		active = at ?? (current >= 0 ? current : enabledIndex(0, 1));
		open = true;
	}

	function close() {
		open = false;
		active = -1;
	}

	function pick(i: number) {
		const o = options[i];
		if (!o || o.disabled) return;
		commit(o.value);
		close();
		triggerEl?.focus();
	}

	function move(to: number) {
		if (to >= 0) active = to;
	}

	/** Next enabled option whose label starts with what was typed; one repeated letter cycles. */
	function typeahead(key: string) {
		const now = Date.now();
		typed = now - typedAt > TYPEAHEAD_MS ? key : typed + key;
		typedAt = now;
		const query = typed.toLocaleLowerCase();
		const cycling = [...query].every((c) => c === query[0]);
		const needle = cycling ? query[0] : query;
		const start = active < 0 ? 0 : active + (cycling || typed.length === 1 ? 1 : 0);
		for (let n = 0; n < options.length; n++) {
			const i = (start + n) % options.length;
			const o = options[i];
			if (o && !o.disabled && o.label.toLocaleLowerCase().startsWith(needle)) {
				if (open) active = i;
				else openList(i);
				return;
			}
		}
	}

	function onTriggerClick(e: MouseEvent) {
		if (!open) openList();
		// Enter / Space arrive as a click with `detail === 0`: they commit like a native select.
		else if (e.detail === 0) pick(active);
		else close();
	}

	function onTriggerKey(e: KeyboardEvent) {
		const printable = e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey;
		// Space mid-word is part of the search, not "confirm".
		if (printable && (e.key !== ' ' || (typed && Date.now() - typedAt < TYPEAHEAD_MS))) {
			e.preventDefault();
			typeahead(e.key);
			return;
		}

		if (!open) {
			if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
				e.preventDefault();
				openList();
			} else if (e.key === 'Home' || e.key === 'End') {
				e.preventDefault();
				openList(e.key === 'Home' ? enabledIndex(0, 1) : enabledIndex(options.length - 1, -1));
			}
			return;
		}

		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault();
				if (e.altKey) pick(active);
				else move(enabledIndex(active + 1, 1));
				break;
			case 'ArrowUp':
				e.preventDefault();
				if (e.altKey) pick(active);
				else move(enabledIndex(active - 1, -1));
				break;
			case 'Home':
				e.preventDefault();
				move(enabledIndex(0, 1));
				break;
			case 'End':
				e.preventDefault();
				move(enabledIndex(options.length - 1, -1));
				break;
			case 'Escape':
				e.preventDefault();
				// Keep a surrounding Dialog open: this Escape belongs to the list.
				e.stopPropagation();
				close();
				break;
			case 'Tab': {
				const o = options[active];
				if (o && !o.disabled) commit(o.value);
				close();
				break;
			}
		}
	}

	/** Under the trigger, or above it when the viewport has more room there. */
	function place() {
		if (!triggerEl || !listEl) return;
		const rect = triggerEl.getBoundingClientRect();
		const gap = 4;
		const height = listEl.offsetHeight;
		const below = window.innerHeight - rect.bottom - gap;
		const up = below < height && rect.top - gap > below;
		listEl.style.minWidth = `${rect.width}px`;
		listEl.style.left = `${rect.left}px`;
		listEl.style.top = up ? `${rect.top - gap - height}px` : `${rect.bottom + gap}px`;
		listEl.style.transformOrigin = up ? 'bottom' : 'top';
	}

	/**
	 * `popover="manual"` puts the list in the top layer, so a scrolling Dialog panel
	 * cannot clip it. Dismissal is ours (Escape, outside pointer, blur), not light-dismiss.
	 */
	function attachList(node: HTMLElement) {
		listEl = node;
		node.showPopover();
		place();
		return () => {
			if (listEl === node) listEl = undefined;
		};
	}

	$effect(() => {
		if (!open || active < 0 || !listEl) return;
		listEl.querySelector(`#${CSS.escape(optionId(active))}`)?.scrollIntoView({ block: 'nearest' });
	});

	function onWindowPointer(e: PointerEvent) {
		if (!open || !(e.target instanceof Node)) return;
		if (triggerEl?.contains(e.target) || listEl?.contains(e.target)) return;
		close();
	}

	function onWindowScroll(e: Event) {
		if (!open || (e.target instanceof Node && listEl?.contains(e.target))) return;
		place();
	}

	function onNativeChange(e: Event & { currentTarget: HTMLSelectElement }) {
		commit(e.currentTarget.value);
	}

	const chrome = $derived([
		'rounded border border-outline-variant bg-surface-container-low pl-3',
		'font-mono text-code-label text-on-surface',
		'disabled:cursor-not-allowed disabled:opacity-60',
		SIZE[size]
	]);
</script>

<svelte:window
	onpointerdown={onWindowPointer}
	onresize={() => open && place()}
	onscrollcapture={onWindowScroll}
/>

{#snippet content(o: SelectOption)}
	{#if option}
		{@render option(o)}
	{:else}
		<bdi class="min-w-0 truncate">{o.label}</bdi>
	{/if}
{/snippet}

{#if coarse.current}
	<select
		id={controlId}
		{name}
		{disabled}
		value={selected ? value : undefined}
		aria-label={ariaLabel}
		aria-invalid={invalid}
		aria-describedby={describedBy}
		data-testid={testid}
		class={['native-select', chrome, className]}
		onchange={onNativeChange}
	>
		{#each options as o (o.value)}
			<option value={o.value} disabled={o.disabled} dir="auto">{o.label}</option>
		{/each}
	</select>
{:else}
	<button
		bind:this={triggerEl}
		type="button"
		id={controlId}
		role="combobox"
		{disabled}
		aria-label={ariaLabel}
		aria-invalid={invalid}
		aria-describedby={describedBy}
		aria-haspopup="listbox"
		aria-expanded={open}
		aria-controls={open ? listId : undefined}
		aria-activedescendant={open && active >= 0 ? optionId(active) : undefined}
		data-testid={testid}
		data-value={value}
		data-label={selected?.label}
		class={[
			'flex items-center gap-2 pr-2 text-left aria-expanded:border-primary',
			chrome,
			className
		]}
		onclick={onTriggerClick}
		onkeydown={onTriggerKey}
		onblur={close}
	>
		<span class="flex min-w-0 flex-1 items-center gap-2">
			{#if selected}{@render content(selected)}{/if}
		</span>
		<Icon name="expand_more" size="lg" class="shrink-0 text-on-surface-variant" />
	</button>
	{#if name}
		<input type="hidden" {name} {value} />
	{/if}
	{#if open}
		<!-- Overlay level 2 (layout.md). Pointer-down is cancelled so focus never leaves the trigger. -->
		<ul
			{@attach attachList}
			id={listId}
			role="listbox"
			popover="manual"
			aria-labelledby={controlId}
			class="fixed inset-auto m-0 max-h-64 overflow-y-auto rounded-DEFAULT border border-outline-variant bg-surface-container p-1 shadow-xl"
			onpointerdown={(e) => e.preventDefault()}
		>
			{#each options as o, i (o.value)}
				{const isActive = $derived(i === active)}
				{const isSelected = $derived(o.value === value)}
				<!-- The trigger owns the keyboard (aria-activedescendant); options only take the pointer. -->
				<!-- svelte-ignore a11y_click_events_have_key_events -->
				<li
					id={optionId(i)}
					role="option"
					aria-selected={isSelected}
					aria-disabled={o.disabled || undefined}
					data-value={o.value}
					class={[
						// A touch laptop reports a fine primary pointer but may be tapped: 40px rows then (accessibility.md).
						'flex min-h-8 cursor-default items-center gap-2 rounded-sm px-2 font-mono text-code-label any-pointer-coarse:min-h-10',
						isSelected ? 'text-primary' : 'text-on-surface',
						// Forced colours drop backgrounds, so the active row also gets a system-coloured outline.
						isActive &&
							'bg-surface-container-high forced-colors:outline forced-colors:-outline-offset-1',
						o.disabled && 'opacity-60'
					]}
					onpointermove={() => !o.disabled && (active = i)}
					onclick={() => pick(i)}
				>
					<span class="flex min-w-0 flex-1 items-center gap-2">{@render content(o)}</span>
					<!-- A shape, not only colour, marks the current value. `check` is not in the icon subset.
					     Drawn as a border so forced-colours mode keeps it (backgrounds are dropped there). -->
					<span
						class={[
							'size-1.5 shrink-0 rounded-full border-[3px] border-primary',
							!isSelected && 'invisible'
						]}
						aria-hidden="true"
					></span>
				</li>
			{/each}
		</ul>
	{/if}
{/if}
