<script lang="ts">
	import DashboardView from '$lib/components/dashboard/DashboardView.svelte';
	import { m } from '$lib/paraglide/messages.js';
</script>

<svelte:head>
	<title>{m.title_app({ page: m.title_dashboard() })}</title>
</svelte:head>

<DashboardView />
