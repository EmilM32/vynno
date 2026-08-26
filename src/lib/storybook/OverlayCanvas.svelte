<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import type { Snippet } from 'svelte';

	interface Props {
		/** Seed the overlay open so the isolated iframe shows it on first paint. */
		initialOpen?: boolean;
		triggerLabel?: string;
		children: Snippet<[{ open: boolean; close: () => void }]>;
	}

	let { initialOpen = false, triggerLabel = 'Open dialog', children }: Props = $props();

	// svelte-ignore state_referenced_locally -- close/reopen is local, not a live binding
	let open = $state(initialOpen);

	function show() {
		open = true;
	}

	function close() {
		open = false;
	}
</script>

<div class="relative min-h-dvh bg-surface p-4">
	<Button variant="primary" onclick={show}>{triggerLabel}</Button>
	{@render children({ open, close })}
</div>
