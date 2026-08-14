<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import AppShell from '$lib/components/shell/AppShell.svelte';
	import { m } from '$lib/paraglide/messages.js';

	let { children, data } = $props();
</script>

<AppShell>
	{#if data.loadError}
		<div
			class="mx-auto flex max-w-lg flex-col gap-3 rounded-lg border border-error/40 bg-error-container/15 p-6"
			role="alert"
			data-testid="load-error"
		>
			<h1 class="text-headline-md text-error">{m.error_load_title()}</h1>
			<p class="text-body-md text-on-surface-variant">{data.loadError}</p>
			<p class="text-body-sm text-on-surface-variant">{m.error_load_body()}</p>
			<button
				type="button"
				class="press focus-ring self-start rounded bg-primary px-4 py-2 font-mono text-code-data font-medium text-on-primary"
				onclick={() => invalidateAll()}
			>
				{m.error_load_retry()}
			</button>
		</div>
	{:else}
		{@render children()}
	{/if}
</AppShell>
