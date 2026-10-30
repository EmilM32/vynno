<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import type { Snippet } from 'svelte';
	import { Overlay, type CloseFn } from './overlay.svelte';

	interface Props {
		open: boolean;
		title: string;
		onclose: () => void;
		describedby?: string;
		initialFocus?: () => HTMLElement | undefined;
		children: Snippet<[{ close: CloseFn }]>;
	}

	let { open, title, onclose, describedby, initialFocus, children }: Props = $props();

	const id = $props.id();
	const titleId = $derived(`drawer-title-${id}`);

	const overlay = new Overlay(() => ({
		onclose,
		initialFocus,
		exitToken: '--duration-sheet-exit',
		exitFallbackMs: 200
	}));

	/** Past this share of the sheet's height, letting go dismisses. */
	const DISMISS_RATIO = 0.3;
	/** A downward flick this fast (px/ms) dismisses however short the drag… */
	const DISMISS_VELOCITY = 0.5;
	/** …once it has travelled this far, so finger jitter on a tap is never a flick. */
	const FLICK_MIN_PX = 10;
	/** A finger held still this long before lifting has no velocity left. */
	const FLICK_STALE_MS = 80;
	/** Upward pull resists and stops here: the sheet leans, it does not lift off the edge. */
	const LIFT_MAX_PX = 8;
	/** Scrim opacity at the dismiss threshold, so the drag previews the close. */
	const SCRIM_AT_THRESHOLD = 0.4;

	let dragY = $state(0);
	let dragging = $state(false);
	let sheetHeight = $state(0);
	let startY = 0;
	let lastY = 0;
	let lastT = 0;
	let velocity = 0;

	const scrimOpacity = $derived.by(() => {
		if (!dragging || dragY <= 0 || !sheetHeight) return undefined;
		const progress = Math.min(1, dragY / (sheetHeight * DISMISS_RATIO));
		return 1 - progress * (1 - SCRIM_AT_THRESHOLD);
	});

	function onpointerdown(e: PointerEvent) {
		if (overlay.closing || e.button !== 0) return;
		const grip = e.currentTarget as HTMLElement;
		grip.setPointerCapture(e.pointerId);
		// The grip's parent is the sheet.
		sheetHeight = grip.parentElement?.offsetHeight ?? 0;
		dragging = true;
		startY = lastY = e.clientY;
		lastT = e.timeStamp;
		velocity = 0;
	}

	function onpointermove(e: PointerEvent) {
		if (!dragging) return;
		const dt = e.timeStamp - lastT;
		if (dt > 0) velocity = (e.clientY - lastY) / dt;
		lastY = e.clientY;
		lastT = e.timeStamp;
		const dy = e.clientY - startY;
		// Down follows the finger 1:1; up resists with diminishing travel, capped at LIFT_MAX_PX.
		dragY = dy >= 0 ? dy : -Math.min(LIFT_MAX_PX, Math.sqrt(-dy) * 2);
	}

	function onpointerup(e: PointerEvent) {
		if (!dragging) return;
		const fresh = e.timeStamp - lastT < FLICK_STALE_MS;
		const flick = fresh && dragY > FLICK_MIN_PX && velocity > DISMISS_VELOCITY;
		endDrag(dragY > sheetHeight * DISMISS_RATIO || flick);
	}

	/** The system took the gesture (back swipe, notification shade): never treat it as a dismiss. */
	function onpointercancel() {
		if (dragging) endDrag(false);
	}

	function endDrag(dismiss: boolean) {
		dragging = false;
		if (dismiss) overlay.close();
		// Clearing the inline offset in the same frame as `data-closing` lets the exit (or the snap
		// back) transition from where the finger let go, not from the resting position.
		dragY = 0;
	}

	function onKey(e: KeyboardEvent) {
		if (!open || overlay.closing) return;
		if (e.key === 'Escape') {
			e.preventDefault();
			overlay.close();
		}
	}
</script>

<svelte:window onkeydown={onKey} />

{#if open}
	<div
		{@attach overlay.attach}
		class={[
			'fixed inset-0 z-100 flex flex-col justify-end',
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
			data-dragging={dragging}
			style:opacity={scrimOpacity}
			aria-label={m.dialog_dismiss_aria()}
			onclick={() => overlay.close()}
		></button>
		<div
			class="sheet relative z-10 flex w-full flex-col rounded-t-xl border border-b-0 border-outline-variant bg-surface-container shadow-xl outline-none"
			data-closing={overlay.closing}
			data-dragging={dragging}
			style:transform={dragY ? `translateY(${dragY}px)` : undefined}
			role="dialog"
			tabindex="-1"
			aria-modal="true"
			aria-labelledby={titleId}
			aria-describedby={describedby}
		>
			<!-- Drag is a touch shortcut; Escape and the scrim are the accessible dismissals. -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div
				class="grip shrink-0 px-5 pt-2 pb-4"
				{onpointerdown}
				{onpointermove}
				{onpointerup}
				{onpointercancel}
			>
				<div class="mx-auto mb-3 h-1 w-9 rounded-full bg-outline-variant" aria-hidden="true"></div>
				<h2 id={titleId} class="text-headline-md text-on-surface">{title}</h2>
			</div>
			<div class="body min-h-0 overflow-y-auto">
				{@render children({ close: overlay.close })}
			</div>
		</div>
	</div>
{/if}

<style>
	.sheet {
		/* Leave a strip of scrim above the sheet to tap, and keep the title clear of the notch. */
		max-height: calc(100dvh - max(2rem, env(safe-area-inset-top, 0px) + 1rem));
	}

	/* Fills the gap under the sheet while an upward pull leans it off the bottom edge. */
	.sheet::after {
		content: '';
		position: absolute;
		inset-inline: -1px;
		top: 100%;
		height: 1rem;
		border-inline: 1px solid var(--color-outline-variant);
		background: var(--color-surface-container);
	}

	/* The handle row owns vertical drags; the browser must not pan or refresh the page from it. */
	.grip {
		touch-action: none;
		user-select: none;
		-webkit-user-select: none;
	}

	.body {
		--pad-b: calc(1.25rem + env(safe-area-inset-bottom, 0px));
		padding: 0 1.25rem var(--pad-b);
		/* Hitting the end of a long form must not scroll the page behind the scrim. */
		overscroll-behavior: contain;
	}

	/*
	 * Same `dialog-actions` contract as Dialog (EMI-274): the action row sticks to the bottom
	 * edge while a long body scrolls, spans the sheet, and pads itself clear of the home indicator.
	 */
	.body :global(.dialog-actions) {
		position: sticky;
		bottom: calc(-1 * var(--pad-b));
		z-index: 1;
		flex-wrap: wrap;
		margin-inline: -1.25rem;
		margin-bottom: calc(-1 * var(--pad-b));
		padding: 0.75rem 1.25rem var(--pad-b);
		background: var(--color-surface-container);
	}

	/* Equal-width actions at a 44px touch height; an `aside` action takes its own row under them. */
	.body :global(.dialog-actions > *) {
		flex: 1 1 0;
		min-height: 2.75rem;
	}

	.body :global(.dialog-actions > .dialog-actions-aside) {
		flex-basis: 100%;
		order: 1;
		margin: 0;
	}

	.scrim {
		/* Nothing behind the scrim scrolls; a pan that starts on it must not reach the page. */
		touch-action: none;
		opacity: 1;
		transition: opacity var(--duration-sheet) var(--ease-out);

		@starting-style {
			opacity: 0;
		}
	}

	.scrim[data-closing='true'] {
		opacity: 0;
	}

	/* Enters and leaves through the bottom edge it is anchored to. */
	.sheet {
		transform: translateY(0);
		transition: transform var(--duration-sheet) var(--ease-out);

		@starting-style {
			transform: translateY(100%);
		}
	}

	.sheet[data-closing='true'] {
		transform: translateY(100%);
	}

	/* The finger is the animation while dragging. */
	.scrim[data-dragging='true'],
	.sheet[data-dragging='true'] {
		transition: none;
	}

	/* Exit faster than enter. Beats the reduced-motion `transition` shorthand on specificity. */
	.scrim[data-closing='true'],
	.sheet[data-closing='true'] {
		transition-duration: var(--duration-sheet-exit);
	}

	@media (prefers-reduced-motion: reduce) {
		.sheet {
			transform: none;
			opacity: 1;
			transition: opacity var(--duration-ui) ease;

			@starting-style {
				transform: none;
				opacity: 0;
			}
		}

		.sheet[data-closing='true'] {
			transform: none;
			opacity: 0;
		}

		.scrim {
			transition: opacity var(--duration-ui) ease;
		}
	}
</style>
