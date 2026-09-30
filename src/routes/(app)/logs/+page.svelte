<script lang="ts">
	import LogsView from '$lib/components/logs/LogsView.svelte';
	import PageTitle from '$lib/components/shell/PageTitle.svelte';
	import { m } from '$lib/paraglide/messages.js';
</script>

<PageTitle page={m.title_logs()} />

<LogsView />
