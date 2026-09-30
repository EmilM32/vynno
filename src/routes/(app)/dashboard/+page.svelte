<script lang="ts">
	import DashboardView from '$lib/components/dashboard/DashboardView.svelte';
	import PageTitle from '$lib/components/shell/PageTitle.svelte';
	import { m } from '$lib/paraglide/messages.js';
</script>

<PageTitle page={m.title_dashboard()} />

<DashboardView />
