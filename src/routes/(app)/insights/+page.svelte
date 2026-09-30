<script lang="ts">
	import InsightsView from '$lib/components/insights/InsightsView.svelte';
	import PageTitle from '$lib/components/shell/PageTitle.svelte';
	import { m } from '$lib/paraglide/messages.js';
</script>

<PageTitle page={m.title_insights()} />

<InsightsView />
