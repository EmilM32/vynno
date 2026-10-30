<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import type { Snippet } from 'svelte';
	import { MediaQuery } from 'svelte/reactivity';
	import Drawer from './Drawer.svelte';
	import { Overlay, type CloseFn } from './overlay.svelte';

	interface Props {
		open: boolean;
		title: string;
		onclose: () => void;
		describedby?: string;
		size?: 'md' | 'lg';
		/** Phones get a bottom `Drawer` by default; `dialog` keeps the centered panel there too. */
		mobile?: 'drawer' | 'dialog';
		initialFocus?: () => HTMLElement | undefined;
		children: Snippet<[{ close: CloseFn }]>;
	}

	let {
		open,
		title,
		onclose,
		describedby,
		size = 'md',
		mobile = 'drawer',
		initialFocus,
		children
	}: Props = $props();

	const id = $props.id();
	const titleId = $derived(`dialog-title-${id}`);

	/** Same phone breakpoint as the `dialog-actions` rules below. */
	const phone = new MediaQuery('max-width: 39.99rem');
	const asDrawer = $derived(mobile === 'drawer' && phone.current);

	const overlay = new Overlay(() => ({
		onclose,
		initialFocus,
		exitToken: '--duration-ui-exit',
		exitFallbackMs: 150
	}));

	function onKey(e: KeyboardEvent) {
		if (!open || asDrawer || overlay.closing) return;
		if (e.key === 'Escape') {
			e.preventDefault();
			overlay.close();
		}
	}
</script>

<svelte:window onkeydown={onKey} />

{#if asDrawer}
	<Drawer {open} {title} {onclose} {describedby} {initialFocus} {children} />
{:else if open}
	<div
		{@attach overlay.attach}
		class={[
			'fixed inset-0 z-100 flex items-center justify-center overscroll-contain px-4',
			overlay.closing && 'pointer-events-none'
		]}
		inert={overlay.closing}
	>
		<!-- Scrim, not chrome: a full-bleed dismiss surface, so it stays a raw button. -->
		<button
			type="button"
			tabindex="-1"
			class="scrim absolute inset-0 bg-surface-dim/80 backdrop-blur-[2px]"
			data-closing={overlay.closing}
			aria-label={m.dialog_dismiss_aria()}
			onclick={() => overlay.close()}
		></button>
		<div
			class="panel relative z-10 max-h-[min(90dvh,40rem)] w-full overflow-y-auto rounded-lg border border-outline-variant bg-surface-container p-5 shadow-xl outline-none {size ===
			'lg'
				? 'max-w-lg'
				: 'max-w-md'}"
			data-closing={overlay.closing}
			role="dialog"
			tabindex="-1"
			aria-modal="true"
			aria-labelledby={titleId}
			aria-describedby={describedby}
		>
			<h2 id={titleId} class="text-headline-md text-on-surface">{title}</h2>
			<div class="mt-4">
				{@render children({ close: overlay.close })}
			</div>
		</div>
	</div>
{/if}

<style>
	/*
	 * Action rows (class `dialog-actions`) stay in view while a long body scrolls (EMI-274).
	 * The negative offsets cancel the panel's p-5 so the strip spans the panel edge to edge.
	 */
	.panel :global(.dialog-actions) {
		position: sticky;
		bottom: -1.25rem;
		z-index: 1;
		margin-inline: -1.25rem;
		margin-bottom: -1.25rem;
		padding: 0.75rem 1.25rem 1.25rem;
		background: var(--color-surface-container);
	}

	/*
	 * Phones (only with `mobile="dialog"`; otherwise `Drawer` renders): actions share the width in
	 * equal, 40px-tall buttons, so short Polish/English labels line up and nothing wraps one button
	 * alone onto a second row. A secondary action marked `dialog-actions-aside` (e.g. Clear filters)
	 * takes its own row under them.
	 */
	@media (max-width: 39.99rem) {
		.panel :global(.dialog-actions) {
			flex-wrap: wrap;
		}

		.panel :global(.dialog-actions > *) {
			flex: 1 1 0;
			min-height: 2.5rem;
		}

		.panel :global(.dialog-actions > .dialog-actions-aside) {
			flex-basis: 100%;
			order: 1;
			margin: 0;
		}
	}

	.scrim {
		opacity: 1;
		transition: opacity var(--duration-ui) var(--ease-out);

		@starting-style {
			opacity: 0;
		}
	}

	.scrim[data-closing='true'] {
		opacity: 0;
	}

	.panel {
		opacity: 1;
		transform: scale(1);
		transform-origin: center;
		transition:
			opacity var(--duration-ui) var(--ease-out),
			transform var(--duration-ui) var(--ease-out);

		@starting-style {
			opacity: 0;
			transform: scale(0.96);
		}
	}

	.panel[data-closing='true'] {
		opacity: 0;
		transform: scale(0.96);
	}

	/* Exit faster than enter. Beats the reduced-motion `transition` shorthand on specificity. */
	.scrim[data-closing='true'],
	.panel[data-closing='true'] {
		transition-duration: var(--duration-ui-exit);
	}

	@media (prefers-reduced-motion: reduce) {
		.panel {
			transform: none;
			transition: opacity var(--duration-ui) ease;

			@starting-style {
				transform: none;
			}
		}

		.panel[data-closing='true'] {
			transform: none;
		}

		.scrim {
			transition: opacity var(--duration-ui) ease;
		}
	}
</style>
