<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		/** `error` interrupts (role alert); `notice` is read politely (role status). */
		tone?: 'error' | 'notice';
		class?: string;
		children: Snippet;
		/** Optional trailing control (typically an inline dismiss `Button`). */
		action?: Snippet;
	}

	let { tone = 'error', class: className = '', children, action }: Props = $props();
</script>

<div
	class={[
		'flex flex-wrap items-start justify-between gap-x-3 gap-y-2 rounded border px-3 py-2 text-body-sm',
		tone === 'error' && 'border-error/40 bg-error-container/15 text-error',
		tone === 'notice' && 'border-primary/40 bg-primary-container/15 text-on-surface',
		className
	]}
	role={tone === 'error' ? 'alert' : 'status'}
>
	<div class="min-w-0">{@render children()}</div>
	{#if action}
		<div class="shrink-0">{@render action()}</div>
	{/if}
</div>
