<script lang="ts">
	import InsightsView from '$lib/components/insights/InsightsView.svelte';
	import { m } from '$lib/paraglide/messages.js';
</script>

<svelte:head>
	<title>{m.title_app({ page: m.title_insights() })}</title>
</svelte:head>

<InsightsView />
