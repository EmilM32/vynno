<script lang="ts">
	import { getFocusable, trapFocus } from '$lib/a11y/focus-trap';
	import { m } from '$lib/paraglide/messages.js';
	import type { Snippet } from 'svelte';

	type CloseFn = (then?: () => void) => void;

	interface Props {
		open: boolean;
		title: string;
		onclose: () => void;
		describedby?: string;
		size?: 'md' | 'lg';
		initialFocus?: () => HTMLElement | undefined;
		children: Snippet<[{ close: CloseFn }]>;
	}

	let { open, title, onclose, describedby, size = 'md', initialFocus, children }: Props = $props();

	const id = $props.id();
	const titleId = $derived(`dialog-title-${id}`);

	let closing = $state(false);
	let closeTimer: number | undefined;

	/** Matches `--duration-ui`. Parent stays `open` until this fires so the exit can play. */
	const EXIT_MS = 200;

	function beginClose(then: () => void) {
		if (closing) return;
		closing = true;
		closeTimer = window.setTimeout(() => {
			closeTimer = undefined;
			closing = false;
			then();
		}, EXIT_MS);
	}

	function close(then: () => void = onclose) {
		beginClose(then);
	}

	function trapOverlay(node: HTMLElement) {
		const release = trapFocus(node);
		const frame = requestAnimationFrame(() => {
			const target = initialFocus?.() ?? getFocusable(node)[0];
			target?.focus();
		});
		return () => {
			cancelAnimationFrame(frame);
			release();
			if (closeTimer !== undefined) window.clearTimeout(closeTimer);
		};
	}

	function onKey(e: KeyboardEvent) {
		if (!open || closing) return;
		if (e.key === 'Escape') {
			e.preventDefault();
			beginClose(onclose);
		}
	}
</script>

<svelte:window onkeydown={onKey} />

{#if open}
	<div
		{@attach trapOverlay}
		class="fixed inset-0 z-[100] flex items-center justify-center overscroll-contain px-4"
	>
		<button
			type="button"
			tabindex="-1"
			class="scrim absolute inset-0 bg-surface-dim/80 backdrop-blur-[2px]"
			data-closing={closing}
			aria-label={m.dialog_dismiss_aria()}
			onclick={() => beginClose(onclose)}
		></button>
		<div
			class="panel relative z-10 max-h-[min(90dvh,40rem)] w-full overflow-y-auto rounded-lg border border-outline-variant bg-surface-container p-5 shadow-xl {size ===
			'lg'
				? 'max-w-lg'
				: 'max-w-md'}"
			data-closing={closing}
			role="dialog"
			aria-modal="true"
			aria-labelledby={titleId}
			aria-describedby={describedby}
		>
			<h2 id={titleId} class="text-headline-md text-on-surface">{title}</h2>
			<div class="mt-4">
				{@render children({ close })}
			</div>
		</div>
	</div>
{/if}

<style>
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
