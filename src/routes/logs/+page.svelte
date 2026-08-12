<script lang="ts">
	import LogsView from '$lib/components/logs/LogsView.svelte';
	import { m } from '$lib/paraglide/messages.js';
</script>

<svelte:head>
	<title>{m.title_app({ page: m.title_logs() })}</title>
</svelte:head>

<LogsView />
