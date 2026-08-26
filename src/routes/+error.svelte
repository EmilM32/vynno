<script lang="ts">
	import { APP_VERSION } from '$lib/components/shell/nav';
	import RouteErrorCard from '$lib/components/shell/RouteErrorCard.svelte';
</script>

<main
	class="flex min-h-dvh flex-col items-center justify-center bg-surface px-margin-mobile py-10 text-on-surface"
>
	<RouteErrorCard mark />
	<p class="mt-4 font-mono text-[10px] text-on-surface-variant uppercase">{APP_VERSION}</p>
</main>
