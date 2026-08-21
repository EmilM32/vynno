<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import Dialog from './Dialog.svelte';

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
	const messageId = $derived(`confirm-dialog-message-${id}`);

	const confirmText = $derived(confirmLabel ?? m.common_confirm());
	const cancelText = $derived(cancelLabel ?? m.common_cancel());

	let confirmBtn: HTMLButtonElement | undefined = $state();
	let cancelBtn: HTMLButtonElement | undefined = $state();

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
</script>

<Dialog
	{open}
	{title}
	describedby={messageId}
	onclose={oncancel}
	initialFocus={() => (destructive ? cancelBtn : confirmBtn)}
>
	{#snippet children({ close })}
		<p id={messageId} class="text-body-md text-on-surface-variant">
			{message}
		</p>
		<div class="mt-5 flex flex-wrap justify-end gap-2">
			<button
				{@attach bindCancel}
				type="button"
				class="press focus-ring min-h-10 rounded border border-outline-variant bg-surface-container-low px-3 py-2 text-body-md text-on-surface hover:border-outline"
				onclick={() => close(oncancel)}
			>
				{cancelText}
			</button>
			<button
				{@attach bindConfirm}
				type="button"
				class="press focus-ring min-h-10 rounded px-3 py-2 text-body-md font-medium {destructive
					? 'bg-error-container text-on-error-container hover:opacity-90'
					: 'bg-primary text-on-primary hover:bg-primary-container'}"
				onclick={() => close(onconfirm)}
			>
				{confirmText}
			</button>
		</div>
	{/snippet}
</Dialog>
