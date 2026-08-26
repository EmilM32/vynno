<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import AppShell from '$lib/components/shell/AppShell.svelte';
	import ErrorState from '$lib/components/shell/ErrorState.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { m } from '$lib/paraglide/messages.js';

	let { children, data } = $props();
</script>

<AppShell>
	{#if data.loadError}
		<div class="flex min-h-[60vh] flex-col items-center justify-center py-8">
			<ErrorState
				alert
				testId="load-error"
				title={m.error_load_title()}
				body={m.error_load_body()}
				detail={data.loadError}
			>
				{#snippet actions()}
					<Button variant="primary" class="w-full" onclick={() => invalidateAll()}>
						{m.error_load_retry()}
					</Button>
				{/snippet}
			</ErrorState>
		</div>
	{:else}
		{@render children()}
	{/if}
</AppShell>
