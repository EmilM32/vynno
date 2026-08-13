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

	let overlayEl: HTMLElement | undefined = $state();
	let confirmBtn: HTMLButtonElement | undefined = $state();
	let cancelBtn: HTMLButtonElement | undefined = $state();

	$effect(() => {
		if (!open || !overlayEl) return;
		const release = trapFocus(overlayEl);
		const target = destructive ? cancelBtn : confirmBtn;
		const frame = requestAnimationFrame(() => target?.focus());
		return () => {
			cancelAnimationFrame(frame);
			release();
		};
	});

	function onKey(e: KeyboardEvent) {
		if (!open) return;
		if (e.key === 'Escape') {
			e.preventDefault();
			oncancel();
		}
	}
</script>

<svelte:window onkeydown={onKey} />

{#if open}
	<div bind:this={overlayEl} class="fixed inset-0 z-[100] flex items-center justify-center px-4">
		<button
			type="button"
			tabindex="-1"
			class="absolute inset-0 bg-surface-dim/80 backdrop-blur-[2px]"
			aria-label={m.dialog_dismiss_aria()}
			onclick={oncancel}
		></button>
		<div
			class="relative z-10 w-full max-w-md rounded-lg border border-outline-variant bg-surface-container p-5 shadow-xl"
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
					bind:this={cancelBtn}
					type="button"
					class="focus-ring rounded border border-outline-variant bg-surface-container-low px-3 py-2 text-body-md text-on-surface transition-colors hover:border-outline"
					onclick={oncancel}
				>
					{cancelText}
				</button>
				<button
					bind:this={confirmBtn}
					type="button"
					class="focus-ring rounded px-3 py-2 text-body-md font-medium transition-colors {destructive
						? 'bg-error-container text-on-error-container hover:opacity-90'
						: 'bg-primary text-on-primary hover:bg-primary-container'}"
					onclick={onconfirm}
				>
					{confirmText}
				</button>
			</div>
		</div>
	</div>
{/if}
