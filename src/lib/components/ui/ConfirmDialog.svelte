<script lang="ts">
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
		confirmLabel = 'Confirm',
		cancelLabel = 'Cancel',
		destructive = false,
		onconfirm,
		oncancel
	}: Props = $props();

	let confirmBtn: HTMLButtonElement | undefined = $state();

	$effect(() => {
		if (!open) return;
		const id = requestAnimationFrame(() => confirmBtn?.focus());
		return () => cancelAnimationFrame(id);
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
	<div class="fixed inset-0 z-[100] flex items-center justify-center px-4">
		<button
			type="button"
			class="absolute inset-0 bg-surface-dim/80 backdrop-blur-[2px]"
			aria-label="Dismiss dialog"
			onclick={oncancel}
		></button>
		<div
			class="relative z-10 w-full max-w-md rounded-lg border border-outline-variant bg-surface-container p-5 shadow-xl"
			role="dialog"
			aria-modal="true"
			aria-labelledby="confirm-dialog-title"
			aria-describedby="confirm-dialog-message"
		>
			<h2 id="confirm-dialog-title" class="text-headline-md text-on-surface">{title}</h2>
			<p id="confirm-dialog-message" class="mt-2 text-body-md text-on-surface-variant">
				{message}
			</p>
			<div class="mt-5 flex flex-wrap justify-end gap-2">
				<button
					type="button"
					class="focus-ring rounded border border-outline-variant bg-surface-container-low px-3 py-2 text-body-md text-on-surface transition-colors hover:border-outline"
					onclick={oncancel}
				>
					{cancelLabel}
				</button>
				<button
					bind:this={confirmBtn}
					type="button"
					class="focus-ring rounded px-3 py-2 text-body-md font-medium transition-colors {destructive
						? 'bg-error-container text-on-error-container hover:opacity-90'
						: 'bg-primary text-background hover:bg-primary-container'}"
					onclick={onconfirm}
				>
					{confirmLabel}
				</button>
			</div>
		</div>
	</div>
{/if}
