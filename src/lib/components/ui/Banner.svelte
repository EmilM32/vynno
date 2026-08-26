<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		tone?: 'error';
		class?: string;
		children: Snippet;
		/** Optional trailing control (typically an inline dismiss `Button`). */
		action?: Snippet;
	}

	let { tone = 'error', class: className = '', children, action }: Props = $props();
</script>

<div
	class={[
		'flex items-start justify-between gap-3 rounded border px-3 py-2 text-body-sm',
		tone === 'error' && 'border-error/40 bg-error-container/15 text-error',
		className
	]}
	role="alert"
>
	<div class="min-w-0">{@render children()}</div>
	{#if action}
		<div class="shrink-0">{@render action()}</div>
	{/if}
</div>
