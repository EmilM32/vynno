<script lang="ts">
	import { trapFocus } from '$lib/a11y/focus-trap';
	import { m } from '$lib/paraglide/messages.js';

	interface Props {
		open: boolean;
		title: string;
		message: string;
		confirmLabel?: string;
		cancelLabel?: string;
		destructive?: boolean;
		onconfirm: () => void;
		oncancel: () => void;
	}

	let {
		open,
		title,
		message,
		confirmLabel,
		cancelLabel,
		destructive = false,
		onconfirm,
		oncancel
	}: Props = $props();

	const id = $props.id();
	const titleId = $derived(`confirm-dialog-title-${id}`);
	const messageId = $derived(`confirm-dialog-message-${id}`);

	const confirmText = $derived(confirmLabel ?? m.common_confirm());
	const cancelText = $derived(cancelLabel ?? m.common_cancel());

	let confirmBtn: HTMLButtonElement | undefined = $state();
	let cancelBtn: HTMLButtonElement | undefined = $state();
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

	function trapOverlay(node: HTMLElement) {
		const release = trapFocus(node);
		const frame = requestAnimationFrame(() => {
			(destructive ? cancelBtn : confirmBtn)?.focus();
		});
		return () => {
			cancelAnimationFrame(frame);
			release();
			if (closeTimer !== undefined) window.clearTimeout(closeTimer);
		};
	}

	function bindCancel(node: HTMLButtonElement) {
		cancelBtn = node;
		return () => {
			if (cancelBtn === node) cancelBtn = undefined;
		};
	}

	function bindConfirm(node: HTMLButtonElement) {
		confirmBtn = node;
		return () => {
			if (confirmBtn === node) confirmBtn = undefined;
		};
	}

	function onKey(e: KeyboardEvent) {
		if (!open || closing) return;
		if (e.key === 'Escape') {
			e.preventDefault();
			beginClose(oncancel);
		}
	}
</script>

<svelte:window onkeydown={onKey} />

{#if open}
	<div {@attach trapOverlay} class="fixed inset-0 z-[100] flex items-center justify-center px-4">
		<button
			type="button"
			tabindex="-1"
			class="scrim absolute inset-0 bg-surface-dim/80 backdrop-blur-[2px]"
			data-closing={closing}
			aria-label={m.dialog_dismiss_aria()}
			onclick={() => beginClose(oncancel)}
		></button>
		<div
			class="panel relative z-10 w-full max-w-md rounded-lg border border-outline-variant bg-surface-container p-5 shadow-xl"
			data-closing={closing}
			role="dialog"
			aria-modal="true"
			aria-labelledby={titleId}
			aria-describedby={messageId}
		>
			<h2 id={titleId} class="text-headline-md text-on-surface">{title}</h2>
			<p id={messageId} class="mt-2 text-body-md text-on-surface-variant">
				{message}
			</p>
			<div class="mt-5 flex flex-wrap justify-end gap-2">
				<button
					{@attach bindCancel}
					type="button"
					class="press focus-ring rounded border border-outline-variant bg-surface-container-low px-3 py-2 text-body-md text-on-surface hover:border-outline"
					onclick={() => beginClose(oncancel)}
				>
					{cancelText}
				</button>
				<button
					{@attach bindConfirm}
					type="button"
					class="press focus-ring rounded px-3 py-2 text-body-md font-medium {destructive
						? 'bg-error-container text-on-error-container hover:opacity-90'
						: 'bg-primary text-on-primary hover:bg-primary-container'}"
					onclick={() => beginClose(onconfirm)}
				>
					{confirmText}
				</button>
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
