<script lang="ts">
	import type { Snippet } from 'svelte';
	import IconButton from './IconButton.svelte';
	import { setMenuContext } from './menu-context';

	/**
	 * The "…" overflow menu: a bordered `more_horiz` trigger and a popover of `MenuItem`s,
	 * anchored under the trigger's right edge. Closes on an item, on Escape and on a
	 * pointer-down outside; Escape and an item hand focus back to the trigger.
	 */
	interface Props {
		/** Accessible name of the trigger and of the menu. */
		label: string;
		/** Closed by default. Bind it when the row reacts to the menu (z-index, closing it from a sibling action). */
		open?: boolean;
		/** Runs each time the menu opens, e.g. to prefetch what the items need. */
		onopen?: () => void;
		/** `data-testid` on the trigger. */
		testid?: string;
		/** Layout utilities only, on the root. */
		class?: string;
		/** `MenuItem`s. */
		children: Snippet;
	}

	let {
		label,
		open = $bindable(false),
		onopen,
		testid,
		class: className = '',
		children
	}: Props = $props();

	const id = $props.id();
	const menuId = `${id}-menu`;
	let rootEl: HTMLElement | undefined;
	let menuEl: HTMLElement | undefined;

	function bindRoot(node: HTMLElement) {
		rootEl = node;
		return () => {
			if (rootEl === node) rootEl = undefined;
		};
	}

	function bindMenu(node: HTMLElement) {
		menuEl = node;
		return () => {
			if (menuEl === node) menuEl = undefined;
		};
	}

	function focusTrigger() {
		rootEl?.querySelector<HTMLElement>('[aria-haspopup="menu"]')?.focus();
	}

	function toggle() {
		open = !open;
		if (open) onopen?.();
	}

	setMenuContext({
		select(fn) {
			open = false;
			// Before `fn`, so a dialog it opens restores focus to the trigger, not to <body>.
			focusTrigger();
			fn();
		}
	});

	function onWindowPointer(e: PointerEvent) {
		if (!open) return;
		if (e.target instanceof Node && rootEl?.contains(e.target)) return;
		open = false;
	}

	function onWindowKey(e: KeyboardEvent) {
		if (!open || e.key !== 'Escape') return;
		e.preventDefault();
		const inside =
			document.activeElement instanceof Node && rootEl?.contains(document.activeElement);
		open = false;
		if (inside) focusTrigger();
	}

	/** Up / Down / Home / End move between the enabled items once focus is in the menu. */
	function onMenuKey(e: KeyboardEvent) {
		if (!menuEl) return;
		const items = [...menuEl.querySelectorAll<HTMLElement>('[role="menuitem"]:not(:disabled)')];
		if (items.length === 0) return;
		const at = items.indexOf(document.activeElement as HTMLElement);
		const next =
			e.key === 'ArrowDown'
				? (at + 1) % items.length
				: e.key === 'ArrowUp'
					? (at - 1 + items.length) % items.length
					: e.key === 'Home'
						? 0
						: e.key === 'End'
							? items.length - 1
							: -1;
		if (next === -1) return;
		e.preventDefault();
		items[next]?.focus();
	}
</script>

<svelte:window onpointerdown={onWindowPointer} onkeydown={onWindowKey} />

<div {@attach bindRoot} class={['relative', className]}>
	<IconButton
		icon="more_horiz"
		{label}
		variant="bordered"
		size="sm"
		aria-expanded={open}
		aria-haspopup="menu"
		aria-controls={open ? menuId : undefined}
		data-testid={testid}
		onclick={toggle}
	/>
	{#if open}
		<!-- Overlay level 2: the one place outside Dialog/Drawer that owns a shadow (layout.md). -->
		<div
			{@attach bindMenu}
			id={menuId}
			role="menu"
			tabindex="-1"
			aria-label={label}
			class="absolute top-full right-0 z-20 mt-1 flex min-w-36 flex-col gap-1 rounded-DEFAULT border border-outline-variant bg-surface-container p-1 shadow-xl"
			onkeydown={onMenuKey}
		>
			{@render children()}
		</div>
	{/if}
</div>
